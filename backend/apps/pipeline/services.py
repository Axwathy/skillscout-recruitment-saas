from __future__ import annotations

from django.db import transaction
from django.db.models import Max

from .models import PipelineStage, PipelineStageHistory

DEFAULT_PIPELINE_STAGES = (
    {
        "name": "Applied",
        "status": PipelineStage.Status.APPLIED,
        "order": 10,
        "color": "primary",
        "is_terminal": False,
    },
    {
        "name": "Under Review",
        "status": PipelineStage.Status.UNDER_REVIEW,
        "order": 20,
        "color": "warning",
        "is_terminal": False,
    },
    {
        "name": "Shortlisted",
        "status": PipelineStage.Status.SHORTLISTED,
        "order": 30,
        "color": "sky",
        "is_terminal": False,
    },
    {
        "name": "Technical Round",
        "status": PipelineStage.Status.TECHNICAL_ROUND,
        "order": 40,
        "color": "purple",
        "is_terminal": False,
    },
    {
        "name": "HR Round",
        "status": PipelineStage.Status.HR_ROUND,
        "order": 50,
        "color": "indigo",
        "is_terminal": False,
    },
    {
        "name": "Offer",
        "status": PipelineStage.Status.OFFER,
        "order": 60,
        "color": "success",
        "is_terminal": False,
    },
    {
        "name": "Hired",
        "status": PipelineStage.Status.HIRED,
        "order": 70,
        "color": "emerald",
        "is_terminal": True,
    },
    {
        "name": "Rejected",
        "status": PipelineStage.Status.REJECTED,
        "order": 80,
        "color": "danger",
        "is_terminal": True,
    },
)


def ensure_default_pipeline_stages(job):
    active_stages = job.pipeline_stages.filter(is_active=True).order_by("order", "created_at")
    if active_stages.exists():
        return active_stages

    PipelineStage.objects.bulk_create(
        PipelineStage(job=job, **stage_definition)
        for stage_definition in DEFAULT_PIPELINE_STAGES
    )
    return job.pipeline_stages.filter(is_active=True).order_by("order", "created_at")


def get_stage_for_status(job, status: str) -> PipelineStage | None:
    ensure_default_pipeline_stages(job)
    return (
        PipelineStage.objects.filter(job=job, is_active=True, status=status)
        .order_by("order", "created_at")
        .first()
    )


def next_stage_order(job) -> int:
    current_max = (
        PipelineStage.objects.filter(job=job, is_active=True).aggregate(max_order=Max("order"))[
            "max_order"
        ]
        or 0
    )
    return current_max + 10


def move_application_to_stage(application, stage: PipelineStage, *, moved_by=None, notes: str = ""):
    if stage.job_id != application.job_id:
        raise ValueError("Pipeline stage must belong to the application's job.")

    old_stage = application.current_stage
    old_status = application.status

    with transaction.atomic():
        application.current_stage = stage
        application.status = stage.status
        application.save(update_fields=["current_stage", "status", "updated_at"])

        from apps.candidates.models import ApplicationHistory

        ApplicationHistory.objects.create(
            application=application,
            from_status=old_status,
            to_status=stage.status,
            changed_by=moved_by,
            notes=notes,
        )
        PipelineStageHistory.objects.create(
            application=application,
            from_stage=old_stage,
            to_stage=stage,
            moved_by=moved_by,
            notes=notes,
        )

    return application
