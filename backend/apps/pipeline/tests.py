import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Recruiter, User
from apps.candidates.models import Application, ApplicationHistory, Candidate
from apps.jobs.models import Job
from apps.organizations.models import Organization

from .models import PipelineStage, PipelineStageHistory
from .services import ensure_default_pipeline_stages, get_stage_for_status

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


def create_recruiter(email="recruiter@example.com"):
    user = User.objects.create_user(
        email=email,
        password="StrongPass123!",
        role=User.Role.RECRUITER,
        first_name="Rina",
        last_name="Shah",
    )
    organization = Organization.objects.create(
        name=f"{email} Org",
        approval_status=Organization.ApprovalStatus.APPROVED,
    )
    Recruiter.objects.create(
        user=user,
        first_name="Rina",
        last_name="Shah",
        organization=organization,
        verification_status=Recruiter.VerificationStatus.APPROVED,
        is_verified=True,
    )
    return user, organization


def create_job(organization, user):
    return Job.objects.create(
        organization=organization,
        created_by=user,
        title="Backend Engineer",
        description="Build APIs.",
        requirements="Python.",
        location="Remote",
        employment_type=Job.EmploymentType.FULL_TIME,
        status=Job.Status.PUBLISHED,
    )


def create_application(organization, job, email="candidate@example.com"):
    candidate = Candidate.objects.create(
        organization=organization,
        first_name="Alice",
        last_name="Smith",
        email=email,
    )
    return Application.objects.create(candidate=candidate, job=job, organization=organization)


def test_job_create_api_seeds_default_pipeline_stages(api_client):
    recruiter, _organization = create_recruiter()
    api_client.force_authenticate(user=recruiter)

    response = api_client.post(
        reverse("job-list"),
        {
            "title": "Product Designer",
            "description": "Own recruiter workflow design.",
            "requirements": "Portfolio and SaaS experience.",
            "location": "Bengaluru",
            "employment_type": "full_time",
        },
        format="json",
    )

    assert response.status_code == 201
    job = Job.objects.get(id=response.json()["id"])
    stages = list(PipelineStage.objects.filter(job=job).order_by("order"))
    assert len(stages) == 8
    assert stages[0].status == Application.Status.APPLIED
    assert stages[-1].status == Application.Status.REJECTED


def test_job_pipeline_board_uses_configured_stage_labels(api_client):
    recruiter, organization = create_recruiter()
    job = create_job(organization, recruiter)
    ensure_default_pipeline_stages(job)
    stage = get_stage_for_status(job, Application.Status.UNDER_REVIEW)
    stage.name = "Screening"
    stage.save(update_fields=["name", "updated_at"])
    application = create_application(organization, job)
    application.current_stage = stage
    application.status = stage.status
    application.save(update_fields=["current_stage", "status", "updated_at"])
    api_client.force_authenticate(user=recruiter)

    response = api_client.get(reverse("pipeline-board"), {"job": str(job.id)}, format="json")

    assert response.status_code == 200
    columns = {column["stage_id"]: column for column in response.json()["columns"]}
    assert columns[str(stage.id)]["label"] == "Screening"
    assert columns[str(stage.id)]["count"] == 1
    assert columns[str(stage.id)]["applications"][0]["current_stage"]["name"] == "Screening"


def test_pipeline_move_updates_stage_status_and_histories(api_client):
    recruiter, organization = create_recruiter()
    job = create_job(organization, recruiter)
    ensure_default_pipeline_stages(job)
    application = create_application(organization, job)
    stage = get_stage_for_status(job, Application.Status.SHORTLISTED)
    api_client.force_authenticate(user=recruiter)

    response = api_client.post(
        reverse("pipeline-move"),
        {
            "application_id": str(application.id),
            "stage_id": str(stage.id),
            "notes": "Strong fit.",
        },
        format="json",
    )

    assert response.status_code == 200
    application.refresh_from_db()
    assert application.current_stage == stage
    assert application.status == Application.Status.SHORTLISTED
    assert ApplicationHistory.objects.filter(application=application).count() == 1
    stage_history = PipelineStageHistory.objects.get(application=application)
    assert stage_history.to_stage == stage
    assert stage_history.moved_by == recruiter


def test_pipeline_stage_reorder_updates_stage_order(api_client):
    recruiter, organization = create_recruiter()
    job = create_job(organization, recruiter)
    stages = list(ensure_default_pipeline_stages(job))
    reordered_ids = [str(stage.id) for stage in reversed(stages)]
    api_client.force_authenticate(user=recruiter)

    response = api_client.patch(
        reverse("pipeline-stage-reorder"),
        {"job_id": str(job.id), "stage_ids": reordered_ids},
        format="json",
    )

    assert response.status_code == 200
    ordered = list(PipelineStage.objects.filter(job=job, is_active=True).order_by("order"))
    assert [str(stage.id) for stage in ordered] == reordered_ids
