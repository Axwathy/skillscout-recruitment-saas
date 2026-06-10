
import hashlib

from django.conf import settings
from django.http import HttpResponse
from django.utils.http import content_disposition_header
from rest_framework import generics, status, views
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.accounts.permissions import IsVerifiedRecruiter
from apps.core.models import AuditLog
from apps.core.storage import download_file, upload_file
from apps.jobs.models import Job
from apps.pipeline.models import PipelineStage

from .models import Application, Candidate, Resume
from .serializers import (
    ApplicationDetailSerializer,
    ApplicationSerializer,
    ApplicationStatusUpdateSerializer,
    CandidateSerializer,
    ResumeSerializer,
    ResumeUploadSerializer,
)
from .tasks import extract_resume_text, extract_resume_text_from_bytes, parse_resume_with_llm


def get_recruiter_organization(request):
    return request.user.recruiter_profile.organization


def _dispatch_resume_extraction(resume, file_bytes: bytes | None = None):
    if file_bytes and getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
        extract_resume_text_from_bytes(resume, file_bytes)
        return

    extract_resume_text.delay(str(resume.id))


def _get_recruiter_resume_or_404(request, pk):
    organization = get_recruiter_organization(request)
    return generics.get_object_or_404(
        Resume.objects.select_related("candidate", "application"),
        pk=pk,
        candidate__organization=organization,
    )


def _resume_file_response(resume, *, as_attachment: bool) -> HttpResponse:
    file_bytes = download_file("resumes", resume.file_url)
    response = HttpResponse(
        file_bytes,
        content_type=resume.mime_type or "application/octet-stream",
    )
    response["Content-Disposition"] = content_disposition_header(
        as_attachment=as_attachment,
        filename=resume.file_name,
    )
    response["Content-Length"] = str(len(file_bytes))
    return response


class CandidateListView(generics.ListAPIView):
    """
    GET /api/v1/candidates/
    List candidates for the recruiter's organization.
    """
    serializer_class = CandidateSerializer
    permission_classes = [IsVerifiedRecruiter]

    def get_queryset(self):
        organization = get_recruiter_organization(self.request)
        return (
            Candidate.objects.filter(organization=organization)
            .prefetch_related("resumes")
            .order_by("-created_at")
        )

class CandidateDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/candidates/<pk>/
    """
    serializer_class = CandidateSerializer
    permission_classes = [IsVerifiedRecruiter]

    def get_queryset(self):
        organization = get_recruiter_organization(self.request)
        return Candidate.objects.filter(organization=organization).prefetch_related("resumes")

class ResumeUploadView(views.APIView):
    """
    POST /api/v1/candidates/resumes/upload/
    Accepts multipart/form-data.
    """
    permission_classes = [IsVerifiedRecruiter]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        serializer = ResumeUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        organization = get_recruiter_organization(request)
        candidate_id = serializer.validated_data.get("candidate_id")
        application_id = serializer.validated_data.get("application_id")
        email = serializer.validated_data.get("email")
        
        if application_id:
            application = generics.get_object_or_404(
                Application.objects.select_related("candidate"),
                id=application_id,
                organization=organization,
            )
            candidate = application.candidate
        elif candidate_id:
            candidate = generics.get_object_or_404(
                Candidate,
                id=candidate_id,
                organization=organization,
            )
            application = (
                Application.objects.filter(candidate=candidate, organization=organization)
                .order_by("-applied_at")
                .first()
            )
        else:
            candidate, _created = Candidate.objects.get_or_create(
                organization=organization,
                email=email,
                defaults={
                    "first_name": serializer.validated_data.get("first_name", "Unknown"),
                    "last_name": serializer.validated_data.get("last_name", ""),
                }
            )
            application = (
                Application.objects.filter(candidate=candidate, organization=organization)
                .order_by("-applied_at")
                .first()
            )

        if not application:
            return Response(
                {"detail": "Resume uploads must be linked to an application."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file = serializer.validated_data["file"]
        file_bytes = file.read()
        file_hash = hashlib.sha256(file_bytes).hexdigest()
        
        # Check deduplication
        existing_resume = Resume.objects.filter(
            application=application,
            file_hash=file_hash,
        ).first()
        if existing_resume:
            return Response(ResumeSerializer(existing_resume).data, status=status.HTTP_200_OK)
            
        # Upload to Supabase
        file_ext = file.name.split('.')[-1].lower() if '.' in file.name else 'bin'
        bucket_name = "resumes"
        # Path: org_id/candidate_id/hash.ext
        file_path = f"{organization.id}/{candidate.id}/{file_hash}.{file_ext}"
        
        # Rewind file for upload
        file.seek(0)
        
        try:
            upload_file(bucket_name, file_path, file, file.content_type)
        except Exception as e:
            return Response(
                {"detail": f"Storage error: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        resume = Resume.objects.create(
            candidate=candidate,
            application=application,
            file_url=file_path,
            file_name=file.name,
            file_size=file.size,
            mime_type=file.content_type,
            file_hash=file_hash,
            uploaded_by=request.user,
        )
        
        _dispatch_resume_extraction(resume, file_bytes)
        
        return Response(ResumeSerializer(resume).data, status=status.HTTP_201_CREATED)
class ApplicationListView(generics.ListAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [IsVerifiedRecruiter]

    def get_queryset(self):
        organization = get_recruiter_organization(self.request)
        queryset = (
            Application.objects.filter(organization=organization)
            .select_related("candidate", "job", "organization")
            .order_by("-applied_at")
        )

        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        job_id = self.request.query_params.get("job")
        if job_id:
            queryset = queryset.filter(job_id=job_id)

        return queryset


class ApplicationDetailView(generics.RetrieveAPIView):
    serializer_class = ApplicationDetailSerializer
    permission_classes = [IsVerifiedRecruiter]

    def get_queryset(self):
        organization = get_recruiter_organization(self.request)
        return (
            Application.objects.filter(organization=organization)
            .select_related("candidate", "job", "organization")
            .prefetch_related("history__changed_by", "resumes")
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["include_resume_download_urls"] = True
        context["include_parsed_resume"] = True
        return context


class ApplicationStatusUpdateView(views.APIView):
    """
    PATCH /api/v1/applications/<pk>/status/
    Recruiter moves an application to a new pipeline stage.
    Records an ApplicationHistory entry automatically via transition_status().
    """

    permission_classes = [IsVerifiedRecruiter]

    def patch(self, request, pk, *args, **kwargs):
        organization = get_recruiter_organization(request)
        application = generics.get_object_or_404(
            Application.objects.select_related("candidate", "job", "organization"),
            pk=pk,
            organization=organization,
        )

        serializer = ApplicationStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        stage = None
        stage_id = serializer.validated_data.get("stage_id")
        if stage_id:
            stage = generics.get_object_or_404(
                PipelineStage,
                pk=stage_id,
                job=application.job,
                is_active=True,
            )
            new_status = stage.status
        else:
            new_status = serializer.validated_data["status"]
        notes = serializer.validated_data.get("notes", "")

        application.transition_status(
            new_status,
            changed_by=request.user,
            notes=notes,
            stage=stage,
        )

        AuditLog.log(
            action="application.status_updated",
            user=request.user,
            entity=application,
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response(
            ApplicationDetailSerializer(
                application,
                context={
                    "request": request,
                    "include_resume_download_urls": True,
                    "include_parsed_resume": True,
                },
            ).data
        )


class ResumeReparseView(views.APIView):
    """
    POST /api/v1/resumes/<pk>/reparse/
    Re-parse a resume owned by the recruiter's organization.
    Runs synchronously so the response always contains fresh parsed data.
    """

    permission_classes = [IsVerifiedRecruiter]

    def post(self, request, pk, *args, **kwargs):
        organization = get_recruiter_organization(request)
        resume = generics.get_object_or_404(
            Resume.objects.select_related("candidate", "application"),
            pk=pk,
            candidate__organization=organization,
        )

        resume.status = Resume.Status.PROCESSING
        resume.save(update_fields=["status", "updated_at"])

        try:
            # If raw_text is missing (e.g. extraction failed on upload), re-extract
            # from the stored file before attempting to parse.
            if not resume.raw_text:
                from .tasks import extract_text_from_bytes
                file_bytes = download_file("resumes", resume.file_url)
                resume.raw_text = extract_text_from_bytes(file_bytes, resume.mime_type)
                resume.save(update_fields=["raw_text", "updated_at"])

            # Always run the parse synchronously so this request completes the full
            # pipeline and the response contains fresh parsed data.  Relying on
            # .delay() here is unreliable: the task is queued to Redis but there is
            # no guarantee a Celery worker is running to consume it, and the
            # frontend does a single refresh immediately after the response.
            parse_resume_with_llm(str(resume.id))

        except Exception as exc:
            resume.status = Resume.Status.ERROR
            resume.save(update_fields=["status", "updated_at"])
            return Response(
                {"detail": f"Re-parse failed: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        resume.refresh_from_db()

        AuditLog.log(
            action="resume.reparse_requested",
            user=request.user,
            entity=resume,
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response(
            ResumeSerializer(
                resume,
                context={
                    "request": request,
                    "include_download_url": True,
                    "include_parsed_resume": True,
                },
            ).data,
            status=status.HTTP_200_OK,
        )


class ResumeViewFileView(views.APIView):
    """
    GET /api/v1/resumes/<pk>/view/
    Stream a resume inline for recruiters in the owning organization.
    """

    permission_classes = [IsVerifiedRecruiter]

    def get(self, request, pk, *args, **kwargs):
        resume = _get_recruiter_resume_or_404(request, pk)
        try:
            return _resume_file_response(resume, as_attachment=False)
        except Exception as exc:
            return Response(
                {"detail": f"Could not load resume file: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class ResumeDownloadFileView(views.APIView):
    """
    GET /api/v1/resumes/<pk>/download/
    Download a resume for recruiters in the owning organization.
    """

    permission_classes = [IsVerifiedRecruiter]

    def get(self, request, pk, *args, **kwargs):
        resume = _get_recruiter_resume_or_404(request, pk)
        try:
            return _resume_file_response(resume, as_attachment=True)
        except Exception as exc:
            return Response(
                {"detail": f"Could not load resume file: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class PipelineBoardView(views.APIView):
    """
    GET /api/v1/pipeline/
    Returns applications for the recruiter's org grouped by status (Kanban columns).
    Optional ?job=<uuid> filter.
    """

    permission_classes = [IsVerifiedRecruiter]

    PIPELINE_STAGES = [
        Application.Status.APPLIED,
        Application.Status.UNDER_REVIEW,
        Application.Status.SHORTLISTED,
        Application.Status.TECHNICAL_ROUND,
        Application.Status.HR_ROUND,
        Application.Status.OFFER,
        Application.Status.HIRED,
        Application.Status.REJECTED,
    ]

    def get(self, request, *args, **kwargs):
        organization = get_recruiter_organization(request)
        queryset = (
            Application.objects.filter(organization=organization)
            .select_related("candidate", "job", "organization", "current_stage")
            .order_by("-applied_at")
        )

        job_id = request.query_params.get("job")
        if job_id:
            job = generics.get_object_or_404(Job, pk=job_id, organization=organization)
            from apps.pipeline.views import build_job_pipeline_board

            queryset = queryset.filter(job_id=job_id)
            return Response(build_job_pipeline_board(job, queryset))

        # Build Kanban columns
        columns = []
        for stage in self.PIPELINE_STAGES:
            stage_apps = [app for app in queryset if app.status == stage]
            columns.append(
                {
                    "status": stage,
                    "label": Application.Status(stage).label,
                    "count": len(stage_apps),
                    "applications": ApplicationSerializer(stage_apps, many=True).data,
                }
            )

        return Response({"columns": columns})
