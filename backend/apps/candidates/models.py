
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from pgvector.django import HnswIndex, VectorField


class Candidate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="candidates",
    )
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True)
    linkedin_url = models.URLField(blank=True)
    github_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name", "email"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "email"],
                name="unique_candidate_email_per_organization",
            )
        ]
        indexes = [
            models.Index(fields=["organization", "email"]),
        ]

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.email

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class Resume(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        ERROR = "error", "Error"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name="resumes",
    )
    application = models.ForeignKey(
        "candidates.Application",
        on_delete=models.CASCADE,
        related_name="resumes",
        null=True,
        blank=True,
    )
    file_url = models.URLField(max_length=500, blank=True, help_text="Supabase storage path")
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    mime_type = models.CharField(max_length=100)
    file_hash = models.CharField(
        max_length=64,
        blank=True,
        help_text="SHA-256 hash for deduplication",
    )
    raw_text = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_resumes",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["candidate"]),
            models.Index(fields=["file_hash"]),
        ]

    def __str__(self) -> str:
        return f"Resume {self.file_name} for {self.candidate}"


class ParsedResume(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        ERROR = "error", "Error"

    class Confidence(models.TextChoices):
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resume = models.OneToOneField(
        Resume,
        on_delete=models.CASCADE,
        related_name="parsed_resume",
    )
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name="parsed_resumes",
    )
    application = models.ForeignKey(
        "candidates.Application",
        on_delete=models.CASCADE,
        related_name="parsed_resumes",
        null=True,
        blank=True,
    )
    schema_version = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    data = models.JSONField(default=dict, blank=True)
    confidence = models.CharField(
        max_length=20,
        choices=Confidence.choices,
        default=Confidence.LOW,
    )
    parser_model = models.CharField(max_length=100, blank=True)
    validation_errors = models.JSONField(default=list, blank=True)
    token_usage = models.JSONField(default=dict, blank=True)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    parsed_at = models.DateTimeField(null=True, blank=True)
    embedding = VectorField(dimensions=384, null=True, blank=True)
    embedding_model = models.CharField(max_length=100, blank=True)
    embedding_text_hash = models.CharField(max_length=64, blank=True, db_index=True)
    embedding_generated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["candidate", "status"]),
            models.Index(fields=["application", "status"]),
            HnswIndex(
                fields=["embedding"],
                name="parsed_resume_embedding_hnsw",
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def __str__(self) -> str:
        return f"Parsed resume for {self.candidate}"



class Application(models.Model):
    class Status(models.TextChoices):
        APPLIED = "applied", "Applied"
        UNDER_REVIEW = "under_review", "Under Review"
        SHORTLISTED = "shortlisted", "Shortlisted"
        TECHNICAL_ROUND = "technical_round", "Technical Round"
        HR_ROUND = "hr_round", "HR Round"
        OFFER = "offer", "Offer"
        REJECTED = "rejected", "Rejected"
        HIRED = "hired", "Hired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.CASCADE,
        related_name="applications",
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="applications",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.APPLIED,
        db_index=True,
    )
    semantic_score = models.DecimalField(
        max_digits=6,
        decimal_places=5,
        null=True,
        blank=True,
        help_text="Normalized semantic similarity score from 0.0 to 1.0.",
    )
    skill_score = models.DecimalField(
        max_digits=6,
        decimal_places=5,
        null=True,
        blank=True,
        help_text="Normalized skill match score from 0.0 to 1.0.",
    )
    experience_score = models.DecimalField(
        max_digits=6,
        decimal_places=5,
        null=True,
        blank=True,
        help_text="Normalized experience match score from 0.0 to 1.0.",
    )
    final_score = models.DecimalField(
        max_digits=6,
        decimal_places=5,
        null=True,
        blank=True,
        db_index=True,
        help_text="Weighted normalized candidate ranking score from 0.0 to 1.0.",
    )
    score_version = models.CharField(max_length=50, blank=True)
    score_calculated_at = models.DateTimeField(null=True, blank=True)
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-applied_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["candidate", "job"],
                name="unique_application_candidate_job",
            )
        ]
        indexes = [
            models.Index(fields=["organization", "job"]),
            models.Index(fields=["organization", "status"]),
            models.Index(
                fields=["organization", "job", "final_score"],
                name="applications_job_score_idx",
            ),
            models.Index(fields=["applied_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.candidate} -> {self.job}"

    def set_scores(
        self,
        *,
        semantic_score: float,
        skill_score: float,
        experience_score: float,
        final_score: float,
        score_version: str,
    ) -> None:
        self.semantic_score = _score_decimal(semantic_score)
        self.skill_score = _score_decimal(skill_score)
        self.experience_score = _score_decimal(experience_score)
        self.final_score = _score_decimal(final_score)
        self.score_version = score_version
        self.score_calculated_at = timezone.now()

    def transition_status(self, new_status: str, changed_by=None, notes: str = "") -> None:
        """Change status and record the transition in ApplicationHistory."""
        old_status = self.status
        self.status = new_status
        self.save(update_fields=["status", "updated_at"])
        ApplicationHistory.objects.create(
            application=self,
            from_status=old_status,
            to_status=new_status,
            changed_by=changed_by,
            notes=notes,
        )


def _score_decimal(value: float) -> str:
    bounded = min(max(float(value), 0.0), 1.0)
    return f"{bounded:.5f}"


class ApplicationHistory(models.Model):
    """Immutable audit log of every application status transition."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name="history",
    )
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="application_transitions",
    )
    notes = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["changed_at"]

    def __str__(self) -> str:
        return f"{self.application_id}: {self.from_status} -> {self.to_status}"
