"""
Candidate portal views — authenticated as role=CANDIDATE.
Candidates see only their own applications, linked by email.
"""

from django.conf import settings
from rest_framework import generics, status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Application, Candidate, Resume
from .serializers import ApplicationDetailSerializer, ApplicationSerializer, CandidateSerializer


class IsCandidateUser(IsAuthenticated):
    """Allow access only to authenticated users with role=CANDIDATE."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        role = getattr(request.user, "role", None)
        return role == "candidate"


class CandidateApplicationListView(generics.ListAPIView):
    """
    GET /api/v1/candidate/me/applications/
    Lists all applications where the candidate email matches the logged-in user's email.
    """

    serializer_class = ApplicationSerializer
    permission_classes = [IsCandidateUser]

    def get_queryset(self):
        return (
            Application.objects.filter(candidate__email=self.request.user.email)
            .select_related("candidate", "job", "organization")
            .order_by("-applied_at")
        )


class CandidateApplicationDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/candidate/me/applications/<pk>/
    Returns a single application with full status history.
    """

    serializer_class = ApplicationDetailSerializer
    permission_classes = [IsCandidateUser]

    def get_queryset(self):
        return (
            Application.objects.filter(candidate__email=self.request.user.email)
            .select_related("candidate", "job", "organization")
            .prefetch_related("history__changed_by")
        )


class CandidateProfileView(views.APIView):
    """
    GET /api/v1/candidate/me/profile/
    Returns aggregated profile info from the most recent Candidate record for this email.
    """

    permission_classes = [IsCandidateUser]

    def get(self, request, *args, **kwargs):
        # Get the most recently created Candidate record for this email
        candidate = (
            Candidate.objects.filter(email=request.user.email)
            .order_by("-created_at")
            .first()
        )

        if not candidate:
            # Candidate has account but hasn't applied to anything yet
            return Response(
                {
                    "email": request.user.email,
                    "first_name": request.user.first_name,
                    "last_name": request.user.last_name,
                    "phone": "",
                    "linkedin_url": "",
                    "github_url": "",
                    "application_count": 0,
                }
            )

        data = CandidateSerializer(candidate).data
        data["application_count"] = Application.objects.filter(
            candidate__email=request.user.email
        ).count()
        return Response(data)


class CandidateResumeUploadView(views.APIView):
    """
    POST /api/v1/candidate/me/resumes/upload/
    Candidates upload their own resumes.
    """
    from rest_framework.parsers import FormParser, MultiPartParser
    permission_classes = [IsCandidateUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        import hashlib

        from apps.core.storage import upload_file

        from .serializers import ResumeSerializer, ResumeUploadSerializer
        from .tasks import extract_resume_text, extract_resume_text_from_bytes

        serializer = ResumeUploadSerializer(
            data=request.data,
            context={"require_identity": False},
        )
        serializer.is_valid(raise_exception=True)
        
        # Determine candidate record
        candidate = (
            Candidate.objects.filter(email=request.user.email)
            .order_by("-created_at")
            .first()
        )
        application_id = serializer.validated_data.get("application_id")
        if not candidate and not application_id:
            return Response(
                {
                    "detail": (
                        "You must apply to at least one job before uploading a general "
                        "resume, or there is no candidate record found."
                    )
                },
                status=400,
            )

        file = serializer.validated_data["file"]
        file_bytes = file.read()
        file_hash = hashlib.sha256(file_bytes).hexdigest()
        
        applications = Application.objects.filter(candidate__email=request.user.email)
        if application_id:
            application = generics.get_object_or_404(applications, id=application_id)
            candidate = application.candidate
        else:
            application = applications.order_by("-applied_at").first()
            if application:
                candidate = application.candidate

        if not application:
            return Response(
                {"detail": "You must apply to a job before uploading a resume."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_resume = Resume.objects.filter(
            application=application,
            file_hash=file_hash,
        ).first()
        if existing_resume:
            return Response(ResumeSerializer(existing_resume).data, status=200)

        file_ext = file.name.split('.')[-1].lower() if '.' in file.name else 'bin'
        bucket_name = "resumes"
        file_path = f"{candidate.organization_id}/{candidate.id}/{file_hash}.{file_ext}"
        
        file.seek(0)
        try:
            upload_file(bucket_name, file_path, file, file.content_type)
        except Exception as e:
            return Response({"detail": f"Storage error: {e}"}, status=500)

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
        
        if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
            extract_resume_text_from_bytes(resume, file_bytes)
        else:
            extract_resume_text.delay(str(resume.id))
        
        return Response(ResumeSerializer(resume).data, status=201)
