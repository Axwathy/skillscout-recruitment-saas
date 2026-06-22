import hashlib
import logging

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.db.models import Count
from pgvector.django import CosineDistance
from rest_framework import generics, status, views
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.permissions import IsVerifiedRecruiter
from apps.ai_engine.embeddings import update_job_embedding
from apps.ai_engine.ranking import rank_candidates_for_job, score_to_percent
from apps.ai_engine.tasks import (
    batch_score_applications,
    generate_job_embedding,
    generate_parsed_resume_embedding,
)
from apps.candidates.models import ParsedResume, Resume
from apps.candidates.serializers import (
    ApplicationSerializer,
    PublicApplicationCreateSerializer,
    PublicApplicationResponseMixin,
)
from apps.candidates.tasks import extract_resume_text, extract_resume_text_from_bytes
from apps.core.cache import org_cache_key
from apps.core.models import AuditLog
from apps.core.storage import upload_file
from apps.notifications.models import Notification
from apps.notifications.services import notify_recruiters_for_job
from apps.pipeline.services import ensure_default_pipeline_stages

from .models import Job
from .serializers import JobSerializer, PublicJobSerializer

logger = logging.getLogger(__name__)
JOB_LIST_CACHE_SECONDS = 120
PUBLIC_JOB_LIST_CACHE_SECONDS = 120


def get_recruiter_organization(request):
    return request.user.recruiter_profile.organization


def enqueue_job_embedding(job: Job, *, force: bool = False) -> None:
    try:
        generate_job_embedding.delay(str(job.id), force=force)
    except Exception as exc:
        logger.warning("Failed to enqueue embedding for job %s: %s", job.id, exc)


def enqueue_parsed_resume_embedding(parsed_resume: ParsedResume, *, force: bool = False) -> None:
    try:
        generate_parsed_resume_embedding.delay(str(parsed_resume.id), force=force)
    except Exception as exc:
        logger.warning(
            "Failed to enqueue embedding for parsed resume %s: %s",
            parsed_resume.id,
            exc,
        )


def enqueue_batch_score(job: Job, *, force: bool = False) -> None:
    try:
        batch_score_applications.delay(str(job.id), force=force)
    except Exception as exc:
        logger.warning("Failed to enqueue batch scoring for job %s: %s", job.id, exc)


def attach_resume_to_application(application, file, uploaded_by=None) -> Resume:
    file_bytes = file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    existing_resume = Resume.objects.filter(
        application=application,
        file_hash=file_hash,
    ).first()
    if existing_resume:
        return existing_resume

    file_ext = file.name.split(".")[-1].lower() if "." in file.name else "bin"
    file_path = f"{application.organization_id}/{application.candidate_id}/{file_hash}.{file_ext}"
    file.seek(0)
    upload_file("resumes", file_path, file, file.content_type)

    resume = Resume.objects.create(
        candidate=application.candidate,
        application=application,
        file_url=file_path,
        file_name=file.name,
        file_size=file.size,
        mime_type=file.content_type,
        file_hash=file_hash,
        uploaded_by=uploaded_by if getattr(uploaded_by, "is_authenticated", False) else None,
    )

    if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
        extract_resume_text_from_bytes(resume, file_bytes)
    else:
        extract_resume_text.delay(str(resume.id))

    return resume


class JobListCreateView(generics.ListCreateAPIView):
    serializer_class = JobSerializer
    permission_classes = [IsVerifiedRecruiter]

    def list(self, request, *args, **kwargs):
        organization = get_recruiter_organization(request)
        cache_key = org_cache_key("jobs:list", organization, request.query_params.urlencode())
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        queryset = self.filter_queryset(self.get_queryset())
        data = self.get_serializer(queryset, many=True).data
        cache.set(cache_key, data, timeout=JOB_LIST_CACHE_SECONDS)
        return Response(data)

    def get_queryset(self):
        organization = get_recruiter_organization(self.request)
        queryset = (
            Job.objects.filter(organization=organization)
            .annotate(application_count=Count("applications"))
            .select_related("organization", "created_by")
        )

        params = self.request.query_params

        status_param = params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        search = params.get("search")
        if search:
            queryset = queryset.filter(title__icontains=search)

        department = params.get("department")
        if department:
            queryset = queryset.filter(department__icontains=department)

        location = params.get("location")
        if location:
            queryset = queryset.filter(location__icontains=location)

        remote_policy = params.get("remote_policy")
        if remote_policy:
            queryset = queryset.filter(remote_policy=remote_policy)

        return queryset

    def perform_create(self, serializer):
        job = serializer.save(
            organization=get_recruiter_organization(self.request),
            created_by=self.request.user,
        )
        AuditLog.log(
            action="job.created",
            user=self.request.user,
            entity=job,
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )
        ensure_default_pipeline_stages(job)
        enqueue_job_embedding(job)
        enqueue_batch_score(job)


class JobDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = JobSerializer
    permission_classes = [IsVerifiedRecruiter]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        organization = get_recruiter_organization(self.request)
        return (
            Job.objects.filter(organization=organization)
            .annotate(application_count=Count("applications"))
            .select_related("organization", "created_by")
        )

    def perform_update(self, serializer):
        job = serializer.save()
        if "status" in serializer.validated_data:
            if job.status == Job.Status.PUBLISHED and not job.published_at:
                job.publish()
            elif job.status == Job.Status.DRAFT:
                job.unpublish()
            elif job.status == Job.Status.CLOSED:
                job.close()
            elif job.status == Job.Status.ARCHIVED:
                job.archive()
        AuditLog.log(
            action="job.updated",
            user=self.request.user,
            entity=job,
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )
        enqueue_job_embedding(job)
        enqueue_batch_score(job)

    def destroy(self, request, *args, **kwargs):
        job = self.get_object()
        job.archive()
        AuditLog.log(
            action="job.archived",
            user=request.user,
            entity=job,
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class JobPublishView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def post(self, request, pk, *args, **kwargs):
        job = generics.get_object_or_404(
            Job,
            pk=pk,
            organization=get_recruiter_organization(request),
        )
        serializer = JobSerializer(job, data={"status": Job.Status.PUBLISHED}, partial=True)
        serializer.is_valid(raise_exception=True)
        job.publish()
        AuditLog.log(
            action="job.published",
            user=request.user,
            entity=job,
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(JobSerializer(job).data)


class JobUnpublishView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def post(self, request, pk, *args, **kwargs):
        job = generics.get_object_or_404(
            Job,
            pk=pk,
            organization=get_recruiter_organization(request),
        )
        job.unpublish()
        AuditLog.log(
            action="job.unpublished",
            user=request.user,
            entity=job,
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(JobSerializer(job).data)


class JobCloseView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def post(self, request, pk, *args, **kwargs):
        job = generics.get_object_or_404(
            Job,
            pk=pk,
            organization=get_recruiter_organization(request),
        )
        job.close()
        AuditLog.log(
            action="job.closed",
            user=request.user,
            entity=job,
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(JobSerializer(job).data)


class JobArchiveView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def post(self, request, pk, *args, **kwargs):
        job = generics.get_object_or_404(
            Job,
            pk=pk,
            organization=get_recruiter_organization(request),
        )
        job.archive()
        AuditLog.log(
            action="job.archived",
            user=request.user,
            entity=job,
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(JobSerializer(job).data)


class JobRestoreView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def post(self, request, pk, *args, **kwargs):
        job = generics.get_object_or_404(
            Job,
            pk=pk,
            organization=get_recruiter_organization(request),
        )
        job.restore()
        AuditLog.log(
            action="job.restored",
            user=request.user,
            entity=job,
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(JobSerializer(job).data)


class EmbeddingBackfillView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def post(self, request, *args, **kwargs):
        organization = get_recruiter_organization(request)
        force = str(request.data.get("force", "")).lower() in {"1", "true", "yes"}

        jobs = Job.objects.filter(organization=organization)
        parsed_resumes = ParsedResume.objects.filter(
            candidate__organization=organization,
            status=ParsedResume.Status.COMPLETED,
        )

        for job in jobs.only("id"):
            enqueue_job_embedding(job, force=force)

        for parsed_resume in parsed_resumes.only("id"):
            enqueue_parsed_resume_embedding(parsed_resume, force=force)

        AuditLog.log(
            action="embeddings.backfilled",
            user=request.user,
            ip_address=request.META.get("REMOTE_ADDR"),
            metadata={
                "job_count": jobs.count(),
                "parsed_resume_count": parsed_resumes.count(),
                "force": force,
            },
        )
        return Response(
            {
                "queued_jobs": jobs.count(),
                "queued_parsed_resumes": parsed_resumes.count(),
                "force": force,
            }
        )


class SimilarCandidatesView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def get(self, request, pk, *args, **kwargs):
        if connection.vendor != "postgresql":
            return Response(
                {"detail": "Candidate similarity requires PostgreSQL with pgvector."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        organization = get_recruiter_organization(request)
        job = generics.get_object_or_404(Job, pk=pk, organization=organization)
        limit = self._get_limit(request)

        if job.embedding is None:
            update_job_embedding(job)

        matches = (
            ParsedResume.objects.filter(
                candidate__organization=organization,
                status=ParsedResume.Status.COMPLETED,
                embedding__isnull=False,
            )
            .select_related("candidate", "application", "application__job")
            .annotate(distance=CosineDistance("embedding", job.embedding))
            .order_by("distance", "-created_at")[:limit]
        )

        results = []
        for parsed_resume in matches:
            distance = float(parsed_resume.distance)
            candidate = parsed_resume.candidate
            application = parsed_resume.application
            personal_info = (parsed_resume.data or {}).get("personal_info") or {}
            results.append(
                {
                    "parsed_resume_id": str(parsed_resume.id),
                    "candidate_id": str(candidate.id),
                    "application_id": str(application.id) if application else None,
                    "candidate_name": personal_info.get("full_name") or candidate.full_name,
                    "candidate_email": candidate.email,
                    "current_job_id": str(application.job_id) if application else None,
                    "similarity": round(1 - distance, 6),
                    "distance": round(distance, 6),
                    "embedding_model": parsed_resume.embedding_model,
                    "embedding_generated_at": parsed_resume.embedding_generated_at,
                }
            )

        return Response(
            {
                "job_id": str(job.id),
                "job_embedding_model": job.embedding_model,
                "job_embedding_generated_at": job.embedding_generated_at,
                "count": len(results),
                "results": results,
            }
        )

    def _get_limit(self, request) -> int:
        try:
            limit = int(request.query_params.get("limit", 10))
        except (TypeError, ValueError):
            limit = 10
        return min(max(limit, 1), 50)


class RankedCandidatesView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def get(self, request, pk, *args, **kwargs):
        organization = get_recruiter_organization(request)
        job = generics.get_object_or_404(Job, pk=pk, organization=organization)
        force = str(request.query_params.get("force", "")).lower() in {"1", "true", "yes"}
        limit = self._get_limit(request)
        min_score = self._get_min_score(request)
        skills_met = str(request.query_params.get("skills_met", "")).lower() in {
            "1",
            "true",
            "yes",
        }

        ranked_scores = [
            candidate_score
            for candidate_score in rank_candidates_for_job(job, force=force)
            if score_to_percent(candidate_score.final_score) >= min_score
            and not (skills_met and candidate_score.missing_skills)
        ][:limit]
        results = []
        for index, candidate_score in enumerate(ranked_scores, start=1):
            application = candidate_score.application
            candidate = application.candidate

            results.append(
                {
                    "rank": index,
                    "candidate": {
                        "id": str(candidate.id),
                        "name": candidate.full_name,
                        "email": candidate.email,
                    },
                    "application_id": str(application.id),
                    "score": score_to_percent(candidate_score.final_score),
                    "score_normalized": candidate_score.final_score,
                    "breakdown": {
                        "semantic_match": score_to_percent(candidate_score.semantic_score),
                        "skill_match": score_to_percent(candidate_score.skill_score),
                        "experience_match": score_to_percent(candidate_score.experience_score),
                    },
                    "breakdown_normalized": {
                        "semantic_score": candidate_score.semantic_score,
                        "skill_score": candidate_score.skill_score,
                        "experience_score": candidate_score.experience_score,
                        "final_score": candidate_score.final_score,
                    },
                    "matched_skills": candidate_score.matched_skills,
                    "missing_skills": candidate_score.missing_skills,
                    "job_skills": candidate_score.job_skills,
                    "candidate_skills": candidate_score.candidate_skills,
                    "required_experience_years": candidate_score.required_experience_years,
                    "candidate_experience_years": candidate_score.candidate_experience_years,
                    "score_version": application.score_version,
                    "score_calculated_at": application.score_calculated_at,
                }
            )

        AuditLog.log(
            action="candidates.ranked",
            user=request.user,
            entity=job,
            ip_address=request.META.get("REMOTE_ADDR"),
            metadata={
                "candidate_count": len(results),
                "force": force,
                "min_score": min_score,
                "skills_met": skills_met,
            },
        )
        return Response(
            {
                "job_id": str(job.id),
                "count": len(results),
                "filters": {
                    "min_score": min_score,
                    "skills_met": skills_met,
                    "limit": limit,
                },
                "results": results,
            }
        )

    def _get_limit(self, request) -> int:
        try:
            limit = int(request.query_params.get("limit", 50))
        except (TypeError, ValueError):
            limit = 50
        return min(max(limit, 1), 100)

    def _get_min_score(self, request) -> int:
        try:
            value = int(request.query_params.get("min_score", 0))
        except (TypeError, ValueError):
            value = 0
        return min(max(value, 0), 100)


class PublicJobListView(generics.ListAPIView):
    serializer_class = PublicJobSerializer
    permission_classes = [AllowAny]
    throttle_scope = "search"

    def list(self, request, *args, **kwargs):
        cache_key = f"jobs:public:list:{request.query_params.urlencode()}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        queryset = self.filter_queryset(self.get_queryset())
        data = self.get_serializer(queryset, many=True).data
        cache.set(cache_key, data, timeout=PUBLIC_JOB_LIST_CACHE_SECONDS)
        return Response(data)

    def get_queryset(self):
        queryset = Job.objects.filter(status=Job.Status.PUBLISHED).select_related("organization")
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(title__icontains=search)
        return queryset


class PublicJobDetailView(generics.RetrieveAPIView):
    serializer_class = PublicJobSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Job.objects.filter(status=Job.Status.PUBLISHED).select_related("organization")


class PublicJobApplyView(PublicApplicationResponseMixin, generics.CreateAPIView):
    serializer_class = PublicApplicationCreateSerializer
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_scope = "upload"

    def dispatch(self, request, *args, **kwargs):
        self.job = generics.get_object_or_404(
            Job.objects.select_related("organization"),
            pk=kwargs["pk"],
            status=Job.Status.PUBLISHED,
        )
        return super().dispatch(request, *args, **kwargs)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["job"] = self.job
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = serializer.save()
        resume_file = getattr(serializer, "resume_file", None)
        if resume_file:
            attach_resume_to_application(
                application,
                resume_file,
                uploaded_by=request.user,
            )
        audit_action = (
            "application.created"
            if getattr(serializer, "application_created", True)
            else "application.reused"
        )
        AuditLog.log(action=audit_action, entity=application)
        if getattr(serializer, "application_created", True):
            notify_recruiters_for_job(
                self.job,
                Notification.EventType.NEW_APPLICATION,
                title="New application",
                body=f"{application.candidate.full_name} applied to {self.job.title}.",
                data={
                    "url": f"/dashboard/applications/{application.id}",
                    "application_id": str(application.id),
                    "job_id": str(self.job.id),
                },
            )
        return Response(
            ApplicationSerializer(application).data,
            status=self.get_success_status(serializer),
        )
