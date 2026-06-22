"""
Candidate portal views — authenticated as role=CANDIDATE.
Candidates see only their own applications, linked by email.
"""

from rest_framework import generics, status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.jobs.models import Job

from .models import Application, Candidate, ParsedResume, Resume
from .serializers import (
    ApplicationDetailSerializer,
    ApplicationSerializer,
    CandidateProfileUpdateSerializer,
    CandidateSerializer,
)


def candidate_skill_set(email: str) -> set[str]:
    """Collect a candidate's skills from their profile records and parsed resumes."""
    skills: set[str] = set()
    for candidate in Candidate.objects.filter(email=email):
        for skill in candidate.skills or []:
            if isinstance(skill, str) and skill.strip():
                skills.add(skill.strip().lower())
    parsed = (
        ParsedResume.objects.filter(candidate__email=email)
        .order_by("-parsed_at", "-created_at")
        .first()
    )
    if parsed and isinstance(parsed.data, dict):
        for skill in parsed.data.get("skills") or []:
            name = skill.get("name") if isinstance(skill, dict) else skill
            if isinstance(name, str) and name.strip():
                skills.add(name.strip().lower())
    return skills


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


class CandidateApplicationDetailView(generics.RetrieveDestroyAPIView):
    """
    GET /api/v1/candidate/me/applications/<pk>/ — single application with history.
    DELETE /api/v1/candidate/me/applications/<pk>/ — candidate withdraws/removes
    their own application. Scoped to the logged-in candidate's email.
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
        return self._profile_response(request)

    def patch(self, request, *args, **kwargs):
        candidates = list(Candidate.objects.filter(email=request.user.email))
        if not candidates:
            return Response(
                {"detail": "Apply to a job before completing your profile."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = CandidateProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        # Propagate the candidate's edits to every record under their email.
        for candidate in candidates:
            for field, value in serializer.validated_data.items():
                setattr(candidate, field, value)
            candidate.save()
        return self._profile_response(request)

    def _profile_response(self, request):
        candidate = (
            Candidate.objects.filter(email=request.user.email).order_by("-created_at").first()
        )
        if not candidate:
            # Candidate has an account but hasn't applied to anything yet.
            return Response(
                {
                    "email": request.user.email,
                    "first_name": request.user.first_name,
                    "last_name": request.user.last_name,
                    "phone": "",
                    "linkedin_url": "",
                    "github_url": "",
                    "state": "",
                    "country": "",
                    "years_of_experience": None,
                    "institution": "",
                    "cgpa": "",
                    "skills": [],
                    "projects": [],
                    "experience_entries": [],
                    "certifications": [],
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
    throttle_scope = "upload"

    def post(self, request, *args, **kwargs):
        import hashlib

        from apps.core.storage import upload_file

        from .serializers import ResumeSerializer, ResumeUploadSerializer
        from .tasks import extract_resume_text

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
        
        try:
            extract_resume_text.delay(str(resume.id))
        except Exception:
            pass

        return Response(ResumeSerializer(resume).data, status=201)


class CandidateRecommendationsView(views.APIView):
    """
    GET /api/v1/candidate/me/recommendations/
    Top open jobs ranked by how well they fit the candidate's skills.
    Returns a 0-100 match estimate (graded by skill overlap with the job text).
    """

    permission_classes = [IsCandidateUser]

    def get(self, request, *args, **kwargs):
        skills = candidate_skill_set(request.user.email)
        applied_job_ids = set(
            Application.objects.filter(candidate__email=request.user.email).values_list(
                "job_id", flat=True
            )
        )

        jobs = (
            Job.objects.filter(status="published")
            .select_related("organization")
            .order_by("-published_at")[:50]
        )

        results = []
        for job in jobs:
            if job.id in applied_job_ids:
                continue
            text = f"{job.title} {job.requirements} {job.description}".lower()
            matched = [s for s in skills if s and s in text]
            if skills:
                ratio = len(matched) / len(skills)
                score = round(min(98, 50 + 48 * ratio))
            else:
                score = None
            results.append(
                {
                    "id": str(job.id),
                    "slug": job.slug,
                    "title": job.title,
                    "organization_name": job.organization.name,
                    "location": job.location,
                    "employment_type": job.employment_type,
                    "remote_policy": job.remote_policy,
                    "salary_range": job.salary_range,
                    "match_score": score,
                    "matched_skills": len(matched),
                }
            )

        results.sort(
            key=lambda r: (r["match_score"] is not None, r["match_score"] or 0),
            reverse=True,
        )
        return Response(results[:5])
