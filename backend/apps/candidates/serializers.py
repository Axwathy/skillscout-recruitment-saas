from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework import serializers

from apps.core.security import sanitize_text, validate_resume_upload
from apps.jobs.models import Job

from .models import Application, ApplicationHistory, Candidate, CandidateNote, ParsedResume, Resume


class ParsedResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParsedResume
        fields = (
            "id",
            "status",
            "schema_version",
            "data",
            "confidence",
            "parser_model",
            "validation_errors",
            "token_usage",
            "estimated_cost",
            "parsed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class ResumeSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    view_url = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    parsed_resume = serializers.SerializerMethodField()

    class Meta:
        model = Resume
        fields = (
            "id",
            "candidate",
            "application",
            "file_name",
            "file_size",
            "mime_type",
            "status",
            "view_url",
            "download_url",
            "parsed_resume",
            "created_at",
        )
        read_only_fields = fields

    def get_download_url(self, obj):
        if not self.context.get("include_download_url"):
            return None
        return reverse("resume-download", args=[obj.id])

    def get_view_url(self, obj):
        if not self.context.get("include_download_url"):
            return None
        return reverse("resume-view", args=[obj.id])

    def get_status(self, obj):
        try:
            parsed_resume = obj.parsed_resume
        except ParsedResume.DoesNotExist:
            return obj.status

        if parsed_resume.status == ParsedResume.Status.COMPLETED:
            return Resume.Status.COMPLETED
        if parsed_resume.status == ParsedResume.Status.ERROR:
            return Resume.Status.ERROR
        return obj.status

    def get_parsed_resume(self, obj):
        if not self.context.get("include_parsed_resume", False):
            return None

        try:
            parsed_resume = obj.parsed_resume
        except ParsedResume.DoesNotExist:
            return None
        return ParsedResumeSerializer(parsed_resume).data


class ResumeUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    candidate_id = serializers.UUIDField(required=False)
    application_id = serializers.UUIDField(required=False)
    # optionally, we can pass email to create or match candidate
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)

    def validate(self, attrs):
        require_identity = self.context.get("require_identity", True)
        if (
            require_identity
            and not attrs.get("candidate_id")
            and not attrs.get("application_id")
            and not attrs.get("email")
        ):
            raise serializers.ValidationError(
                "Either application_id, candidate_id, or email is required to associate the resume."
            )
        
        file = attrs["file"]
        validate_resume_upload(file)
            
        return attrs

class CandidateSerializer(serializers.ModelSerializer):
    resumes = ResumeSerializer(many=True, read_only=True)

    class Meta:
        model = Candidate
        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "linkedin_url",
            "github_url",
            "state",
            "country",
            "years_of_experience",
            "institution",
            "cgpa",
            "skills",
            "projects",
            "experience_entries",
            "certifications",
            "resumes",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "resumes")


class CandidateProfileUpdateSerializer(serializers.ModelSerializer):
    """Writable fields a candidate may edit on their own profile."""

    class Meta:
        model = Candidate
        fields = (
            "first_name",
            "last_name",
            "phone",
            "linkedin_url",
            "github_url",
            "state",
            "country",
            "years_of_experience",
            "institution",
            "cgpa",
            "skills",
            "projects",
            "experience_entries",
            "certifications",
        )


class CandidateNoteSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True, default=None)

    class Meta:
        model = CandidateNote
        fields = (
            "id",
            "candidate",
            "author_email",
            "body",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "candidate", "author_email", "created_at", "updated_at")

    def validate_body(self, value):
        return sanitize_text(value)


class ApplicationHistorySerializer(serializers.ModelSerializer):
    changed_by_email = serializers.EmailField(
        source="changed_by.email",
        read_only=True,
        default=None,
    )

    class Meta:
        model = ApplicationHistory
        fields = (
            "id",
            "from_status",
            "to_status",
            "changed_by_email",
            "notes",
            "changed_at",
        )
        read_only_fields = fields


class ApplicationSerializer(serializers.ModelSerializer):
    candidate = CandidateSerializer(read_only=True)
    job_title = serializers.CharField(source="job.title", read_only=True)
    job_id = serializers.UUIDField(source="job.id", read_only=True)
    job_slug = serializers.SlugField(source="job.slug", read_only=True)
    organization = serializers.UUIDField(source="organization_id", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    current_stage = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = (
            "id",
            "candidate",
            "job_id",
            "job_title",
            "job_slug",
            "organization",
            "organization_name",
            "status",
            "source",
            "current_stage",
            "semantic_score",
            "skill_score",
            "experience_score",
            "final_score",
            "score_version",
            "score_calculated_at",
            "applied_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "candidate",
            "job_id",
            "job_title",
            "job_slug",
            "organization",
            "organization_name",
            "source",
            "current_stage",
            "semantic_score",
            "skill_score",
            "experience_score",
            "final_score",
            "score_version",
            "score_calculated_at",
            "applied_at",
            "updated_at",
        )

    def get_current_stage(self, obj):
        stage = obj.current_stage
        if not stage:
            return None

        return {
            "id": str(stage.id),
            "name": stage.name,
            "status": stage.status,
            "order": stage.order,
            "color": stage.color,
            "is_terminal": stage.is_terminal,
        }


class ApplicationDetailSerializer(ApplicationSerializer):
    """Extends ApplicationSerializer with full status history."""

    history = ApplicationHistorySerializer(many=True, read_only=True)
    resumes = serializers.SerializerMethodField()

    class Meta(ApplicationSerializer.Meta):
        fields = ApplicationSerializer.Meta.fields + ("history", "resumes")
        read_only_fields = ApplicationSerializer.Meta.read_only_fields + ("history", "resumes")

    def get_resumes(self, obj):
        resumes = obj.resumes.select_related("candidate", "application", "parsed_resume").all()
        return ResumeSerializer(
            resumes,
            many=True,
            context={
                "include_download_url": self.context.get("include_resume_download_urls", False),
                "include_parsed_resume": self.context.get("include_parsed_resume", False),
            },
        ).data


class ApplicationStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Application.Status.choices, required=False)
    stage_id = serializers.UUIDField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if not attrs.get("status") and not attrs.get("stage_id"):
            raise serializers.ValidationError("Either status or stage_id is required.")
        if "notes" in attrs:
            attrs["notes"] = sanitize_text(attrs["notes"])
        return attrs


class PublicApplicationCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    linkedin_url = serializers.URLField(required=False, allow_blank=True)
    github_url = serializers.URLField(required=False, allow_blank=True)
    source = serializers.ChoiceField(
        choices=Application.Source.choices,
        required=False,
        default=Application.Source.DIRECT,
    )
    resume = serializers.FileField(required=False)

    def validate(self, attrs):
        job = self.context["job"]
        if job.status != Job.Status.PUBLISHED:
            raise serializers.ValidationError("This job is not accepting applications.")
        attrs["email"] = attrs["email"].strip().lower()

        resume = attrs.get("resume")
        if resume:
            validate_resume_upload(resume, field_name="resume")
        return attrs

    def validate_first_name(self, value):
        return sanitize_text(value)

    def validate_last_name(self, value):
        return sanitize_text(value)

    def validate_phone(self, value):
        return sanitize_text(value)

    def create(self, validated_data):
        job = self.context["job"]
        self.resume_file = validated_data.pop("resume", None)
        self.application_created = False

        with transaction.atomic():
            candidate, created = Candidate.objects.get_or_create(
                organization=job.organization,
                email=validated_data["email"],
                defaults={
                    "first_name": validated_data["first_name"],
                    "last_name": validated_data["last_name"],
                    "phone": validated_data.get("phone", ""),
                    "linkedin_url": validated_data.get("linkedin_url", ""),
                    "github_url": validated_data.get("github_url", ""),
                },
            )

            if not created:
                for field in ("first_name", "last_name", "phone", "linkedin_url", "github_url"):
                    value = validated_data.get(field)
                    if value is not None:
                        setattr(candidate, field, value)
                candidate.save(
                    update_fields=[
                        "first_name",
                        "last_name",
                        "phone",
                        "linkedin_url",
                        "github_url",
                        "updated_at",
                    ]
                )

            try:
                application, app_created = Application.objects.get_or_create(
                    candidate=candidate,
                    job=job,
                    defaults={
                        "organization": job.organization,
                        "source": validated_data.get("source", Application.Source.DIRECT),
                    },
                )
            except IntegrityError:
                application = Application.objects.get(candidate=candidate, job=job)
                app_created = False

            self.application_created = app_created

            if app_created:
                from apps.pipeline.services import get_stage_for_status

                application.current_stage = get_stage_for_status(job, application.status)
                if application.current_stage:
                    application.save(update_fields=["current_stage", "updated_at"])
                ApplicationHistory.objects.create(
                    application=application,
                    from_status="",
                    to_status=application.status,
                    notes="Application submitted.",
                )

            return application


class PublicApplicationResponseMixin:
    def get_success_status(self, serializer) -> int:
        if getattr(serializer, "application_created", True):
            return 201
        return 200
