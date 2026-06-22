
import hashlib

from django.conf import settings
from django.db.models import Q
from django.http import HttpResponse
from django.utils.http import content_disposition_header
from rest_framework import generics, status, views
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.accounts.permissions import IsVerifiedRecruiter
from apps.core.models import AuditLog
from apps.core.storage import download_file, upload_file
from apps.jobs.models import Job
from apps.notifications.models import Notification
from apps.notifications.services import notify_recruiters_for_job
from apps.pipeline.models import PipelineStage, PipelineStageHistory

from .models import Application, Candidate, CandidateNote, ParsedResume, Resume
from .serializers import (
    ApplicationDetailSerializer,
    ApplicationSerializer,
    ApplicationStatusUpdateSerializer,
    CandidateNoteSerializer,
    CandidateSerializer,
    ParsedResumeSerializer,
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
        queryset = (
            Candidate.objects.filter(organization=organization)
            .prefetch_related("resumes")
            .order_by("-created_at")
        )
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
            )
        return queryset

class CandidateDetailView(generics.RetrieveDestroyAPIView):
    """
    GET /api/v1/applications/candidates/<pk>/ — retrieve a candidate.
    DELETE /api/v1/applications/candidates/<pk>/ — permanently remove a candidate
    (and their applications, resumes, and notes via cascade). Restricted to the
    recruiter's own organization.
    """
    serializer_class = CandidateSerializer
    permission_classes = [IsVerifiedRecruiter]

    def get_queryset(self):
        organization = get_recruiter_organization(self.request)
        return Candidate.objects.filter(organization=organization).prefetch_related("resumes")


class CandidateProfileView(views.APIView):
    """
    GET /api/v1/applications/candidates/<pk>/profile/
    Aggregated recruiter view of a candidate across jobs, resumes, scores, notes, and activity.
    """

    permission_classes = [IsVerifiedRecruiter]

    def get(self, request, pk, *args, **kwargs):
        organization = get_recruiter_organization(request)
        candidate = generics.get_object_or_404(
            Candidate.objects.filter(organization=organization).prefetch_related("resumes"),
            pk=pk,
        )
        applications = (
            Application.objects.filter(candidate=candidate, organization=organization)
            .select_related("candidate", "job", "organization", "current_stage")
            .prefetch_related("history__changed_by", "resumes__parsed_resume")
            .order_by("-applied_at")
        )
        latest_application = applications.first()
        latest_resume = (
            Resume.objects.filter(candidate=candidate)
            .select_related("candidate", "application", "parsed_resume")
            .order_by("-created_at")
            .first()
        )
        latest_parsed_resume = (
            ParsedResume.objects.filter(candidate=candidate)
            .select_related("resume", "candidate", "application")
            .order_by("-parsed_at", "-created_at")
            .first()
        )
        notes = CandidateNote.objects.filter(candidate=candidate, organization=organization)

        return Response(
            {
                "candidate": CandidateSerializer(candidate).data,
                "latest_application": (
                    ApplicationSerializer(latest_application).data if latest_application else None
                ),
                "applications": ApplicationDetailSerializer(
                    applications,
                    many=True,
                    context={
                        "request": request,
                        "include_resume_download_urls": True,
                        "include_parsed_resume": True,
                    },
                ).data,
                "latest_resume": (
                    ResumeSerializer(
                        latest_resume,
                        context={
                            "request": request,
                            "include_download_url": True,
                            "include_parsed_resume": True,
                        },
                    ).data
                    if latest_resume
                    else None
                ),
                "parsed_resume": (
                    ParsedResumeSerializer(latest_parsed_resume).data
                    if latest_parsed_resume
                    else None
                ),
                "activity": self._build_activity(candidate, applications),
                "notes": CandidateNoteSerializer(notes, many=True).data,
            }
        )

    def _build_activity(self, candidate, applications):
        application_ids = [application.id for application in applications]
        activity = []

        for application in applications:
            activity.append(
                {
                    "id": f"application:{application.id}",
                    "type": "application_submitted",
                    "timestamp": application.applied_at,
                    "application_id": str(application.id),
                    "job_id": str(application.job_id),
                    "job_title": application.job.title,
                    "title": "Application submitted",
                    "description": f"Applied for {application.job.title}.",
                    "actor_email": None,
                }
            )

        for history in (
            Application.objects.none()
            if not application_ids
            else Application.objects.filter(id__in=application_ids)
            .select_related("job")
            .prefetch_related("history__changed_by")
        ):
            for entry in history.history.all():
                activity.append(
                    {
                        "id": f"status:{entry.id}",
                        "type": "status_change",
                        "timestamp": entry.changed_at,
                        "application_id": str(history.id),
                        "job_id": str(history.job_id),
                        "job_title": history.job.title,
                        "title": "Status changed",
                        "description": (
                            f"{entry.from_status or 'new'} -> {entry.to_status}"
                            if entry.from_status
                            else f"Set to {entry.to_status}"
                        ),
                        "notes": entry.notes,
                        "actor_email": entry.changed_by.email if entry.changed_by else None,
                    }
                )

        stage_history = (
            PipelineStageHistory.objects.filter(application_id__in=application_ids)
            .select_related("application__job", "from_stage", "to_stage", "moved_by")
            .order_by("-moved_at")
        )
        for entry in stage_history:
            from_name = entry.from_stage.name if entry.from_stage else "No stage"
            to_name = entry.to_stage.name if entry.to_stage else "No stage"
            activity.append(
                {
                    "id": f"stage:{entry.id}",
                    "type": "stage_change",
                    "timestamp": entry.moved_at,
                    "application_id": str(entry.application_id),
                    "job_id": str(entry.application.job_id),
                    "job_title": entry.application.job.title,
                    "title": "Pipeline stage changed",
                    "description": f"{from_name} -> {to_name}",
                    "notes": entry.notes,
                    "actor_email": entry.moved_by.email if entry.moved_by else None,
                }
            )

        resumes = (
            Resume.objects.filter(candidate=candidate)
            .select_related("application__job", "parsed_resume")
            .order_by("-created_at")
        )
        for resume in resumes:
            activity.append(
                {
                    "id": f"resume:{resume.id}:uploaded",
                    "type": "resume_uploaded",
                    "timestamp": resume.created_at,
                    "application_id": str(resume.application_id) if resume.application_id else None,
                    "job_id": str(resume.application.job_id) if resume.application_id else None,
                    "job_title": resume.application.job.title if resume.application_id else None,
                    "title": "Resume uploaded",
                    "description": resume.file_name,
                    "actor_email": resume.uploaded_by.email if resume.uploaded_by else None,
                }
            )
            try:
                parsed_resume = resume.parsed_resume
            except ParsedResume.DoesNotExist:
                continue
            activity.append(
                {
                    "id": f"resume:{resume.id}:parsed",
                    "type": "resume_parsed",
                    "timestamp": parsed_resume.parsed_at or parsed_resume.updated_at,
                    "application_id": str(resume.application_id) if resume.application_id else None,
                    "job_id": str(resume.application.job_id) if resume.application_id else None,
                    "job_title": resume.application.job.title if resume.application_id else None,
                    "title": "Resume parsed",
                    "description": f"Completed via {parsed_resume.parser_model or 'parser'}",
                    "actor_email": None,
                }
            )

        return sorted(activity, key=lambda item: item["timestamp"], reverse=True)[:100]


class CandidateNoteListCreateView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def get_candidate(self, request, pk):
        organization = get_recruiter_organization(request)
        return generics.get_object_or_404(Candidate, pk=pk, organization=organization)

    def get(self, request, pk, *args, **kwargs):
        candidate = self.get_candidate(request, pk)
        notes = CandidateNote.objects.filter(
            candidate=candidate,
            organization=candidate.organization,
        )
        return Response(CandidateNoteSerializer(notes, many=True).data)

    def post(self, request, pk, *args, **kwargs):
        candidate = self.get_candidate(request, pk)
        serializer = CandidateNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = serializer.save(
            candidate=candidate,
            organization=candidate.organization,
            author=request.user,
        )
        AuditLog.log(
            action="candidate.note_created",
            user=request.user,
            entity=note,
            metadata={"candidate_id": str(candidate.id)},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(CandidateNoteSerializer(note).data, status=status.HTTP_201_CREATED)


class CandidateNoteDetailView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def get_note(self, request, candidate_id, pk):
        organization = get_recruiter_organization(request)
        return generics.get_object_or_404(
            CandidateNote.objects.filter(
                pk=pk,
                candidate_id=candidate_id,
                organization=organization,
            )
        )

    def patch(self, request, candidate_id, pk, *args, **kwargs):
        note = self.get_note(request, candidate_id, pk)
        serializer = CandidateNoteSerializer(note, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        note = serializer.save()
        AuditLog.log(
            action="candidate.note_updated",
            user=request.user,
            entity=note,
            metadata={"candidate_id": str(note.candidate_id)},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(CandidateNoteSerializer(note).data)

    def delete(self, request, candidate_id, pk, *args, **kwargs):
        note = self.get_note(request, candidate_id, pk)
        note_id = note.id
        candidate_id = note.candidate_id
        note.delete()
        AuditLog.log(
            action="candidate.note_deleted",
            user=request.user,
            entity=None,
            metadata={"candidate_id": str(candidate_id), "note_id": str(note_id)},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ResumeUploadView(views.APIView):
    """
    POST /api/v1/candidates/resumes/upload/
    Accepts multipart/form-data.
    """
    permission_classes = [IsVerifiedRecruiter]
    parser_classes = [MultiPartParser, FormParser]
    throttle_scope = "upload"

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
            .select_related("candidate", "job", "organization", "current_stage")
            .prefetch_related("candidate__resumes")
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
            .select_related("candidate", "job", "organization", "current_stage")
            .prefetch_related("history__changed_by", "resumes", "candidate__resumes")
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

        if new_status == Application.Status.HIRED:
            notify_title = "🎉 Candidate hired"
            notify_body = (
                f"{application.candidate.full_name} was hired for {application.job.title}. "
                f"Review data retention — keep their record or remove their data."
            )
            notify_url = f"/dashboard/candidates/{application.candidate_id}"
        else:
            notify_title = "Candidate moved"
            notify_body = (
                f"{application.candidate.full_name} moved to "
                f"{application.get_status_display()}."
            )
            notify_url = f"/dashboard/applications/{application.id}"

        notify_recruiters_for_job(
            application.job,
            Notification.EventType.CANDIDATE_MOVED,
            title=notify_title,
            body=notify_body,
            data={
                "url": notify_url,
                "application_id": str(application.id),
                "job_id": str(application.job_id),
                "candidate_id": str(application.candidate_id),
            },
            actor=request.user,
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
            .prefetch_related("candidate__resumes")
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
