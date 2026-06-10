import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class PipelineStage(models.Model):
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
    job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.CASCADE,
        related_name="pipeline_stages",
    )
    name = models.CharField(max_length=100)
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.APPLIED,
        help_text="Canonical application status this stage maps to.",
    )
    order = models.PositiveIntegerField(default=0)
    color = models.CharField(max_length=32, default="primary")
    is_terminal = models.BooleanField(default=False)
    auto_actions = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["job", "order", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["job", "order"],
                condition=Q(is_active=True),
                name="unique_active_pipeline_stage_order_per_job",
            ),
        ]
        indexes = [
            models.Index(fields=["job", "is_active", "order"]),
            models.Index(fields=["job", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.job}: {self.name}"


class PipelineStageHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        "candidates.Application",
        on_delete=models.CASCADE,
        related_name="stage_history",
    )
    from_stage = models.ForeignKey(
        PipelineStage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    to_stage = models.ForeignKey(
        PipelineStage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    moved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pipeline_stage_moves",
    )
    notes = models.TextField(blank=True)
    moved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["moved_at"]
        indexes = [
            models.Index(fields=["application", "moved_at"]),
        ]

    def __str__(self) -> str:
        from_name = self.from_stage.name if self.from_stage else "None"
        to_name = self.to_stage.name if self.to_stage else "None"
        return f"{self.application_id}: {from_name} -> {to_name}"
