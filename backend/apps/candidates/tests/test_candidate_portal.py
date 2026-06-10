from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Recruiter, User
from apps.candidates.models import Application, ApplicationHistory, Candidate, ParsedResume, Resume
from apps.jobs.models import Job
from apps.organizations.models import Organization

pytestmark = pytest.mark.django_db


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    return APIClient()


def create_recruiter(email="recruiter@example.com"):
    user = User.objects.create_user(
        email=email, password="StrongPass123!", role=User.Role.RECRUITER,
        first_name="Rina", last_name="Shah",
    )
    org = Organization.objects.create(
        name=f"{email} Org", approval_status=Organization.ApprovalStatus.APPROVED,
    )
    Recruiter.objects.create(
        user=user, first_name="Rina", last_name="Shah", organization=org,
        verification_status=Recruiter.VerificationStatus.APPROVED, is_verified=True,
    )
    return user, org


def create_candidate_user(email="candidate@example.com"):
    return User.objects.create_user(
        email=email, password="StrongPass123!", role=User.Role.CANDIDATE,
        first_name="Alice", last_name="Smith",
    )


def create_job(org, user):
    return Job.objects.create(
        organization=org, created_by=user,
        title="Backend Engineer",
        description="Build APIs.", requirements="Python.", location="Remote",
        employment_type=Job.EmploymentType.FULL_TIME,
        status=Job.Status.PUBLISHED,
    )


def create_candidate(org, email="candidate@example.com"):
    return Candidate.objects.create(
        organization=org, first_name="Alice", last_name="Smith", email=email,
    )


def create_application(org, job, email="candidate@example.com"):
    candidate = create_candidate(org, email)
    return Application.objects.create(candidate=candidate, job=job, organization=org)


def resume_file(name="resume.pdf", content_type="application/pdf"):
    return SimpleUploadedFile(
        name,
        b"%PDF-1.4 resume bytes",
        content_type=content_type,
    )


# ─── Candidate Registration ───────────────────────────────────────────────────

def test_candidate_can_register(api_client):
    response = api_client.post(
        reverse("candidate-register"),
        {"first_name": "Alice", "last_name": "Smith",
         "email": "alice@example.com", "password": "StrongPass123!",
         "confirm_password": "StrongPass123!"},
        format="json",
    )
    assert response.status_code == 201
    user = User.objects.get(email="alice@example.com")
    assert user.role == User.Role.CANDIDATE


def test_candidate_register_duplicate_email(api_client):
    create_candidate_user("alice@example.com")
    response = api_client.post(
        reverse("candidate-register"),
        {"first_name": "Alice", "last_name": "Smith",
         "email": "alice@example.com", "password": "StrongPass123!",
         "confirm_password": "StrongPass123!"},
        format="json",
    )
    assert response.status_code == 400


# ─── Candidate Portal — Own Applications ─────────────────────────────────────

def test_candidate_sees_own_applications(api_client):
    recruiter, org = create_recruiter()
    job = create_job(org, recruiter)
    application = create_application(org, job, email="alice@example.com")

    candidate_user = create_candidate_user("alice@example.com")
    api_client.force_authenticate(user=candidate_user)

    response = api_client.get(reverse("candidate-application-list"))
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == str(application.id)


def test_candidate_cannot_see_other_candidate_applications(api_client):
    recruiter, org = create_recruiter()
    job = create_job(org, recruiter)
    create_application(org, job, email="other@example.com")  # different email

    my_user = create_candidate_user("alice@example.com")
    api_client.force_authenticate(user=my_user)

    response = api_client.get(reverse("candidate-application-list"))
    assert response.status_code == 200
    assert len(response.json()) == 0


def test_candidate_application_detail_includes_history(api_client):
    recruiter, org = create_recruiter()
    job = create_job(org, recruiter)
    application = create_application(org, job, email="alice@example.com")
    ApplicationHistory.objects.create(
        application=application, from_status="", to_status="applied",
        notes="Application submitted.",
    )

    candidate_user = create_candidate_user("alice@example.com")
    api_client.force_authenticate(user=candidate_user)

    response = api_client.get(
        reverse("candidate-application-detail", args=[application.id])
    )
    assert response.status_code == 200
    data = response.json()
    assert "history" in data
    assert len(data["history"]) == 1
    assert data["history"][0]["to_status"] == "applied"


def test_candidate_uploads_resume_linked_to_application(api_client):
    recruiter, org = create_recruiter()
    job = create_job(org, recruiter)
    application = create_application(org, job, email="alice@example.com")

    candidate_user = create_candidate_user("alice@example.com")
    api_client.force_authenticate(user=candidate_user)

    with (
        patch("apps.core.storage.upload_file", return_value="path") as upload,
        patch("apps.candidates.tasks.extract_resume_text") as task,
    ):
        response = api_client.post(
            reverse("candidate-resume-upload"),
            {"application_id": str(application.id), "file": resume_file()},
            format="multipart",
        )

    assert response.status_code == 201
    resume = Resume.objects.get(id=response.json()["id"])
    assert resume.application == application
    assert resume.candidate == application.candidate
    upload.assert_called_once()
    task.delay.assert_called_once_with(str(resume.id))


def test_candidate_resume_upload_rejects_other_candidate_application(api_client):
    recruiter, org = create_recruiter()
    job = create_job(org, recruiter)
    application = create_application(org, job, email="other@example.com")

    candidate_user = create_candidate_user("alice@example.com")
    api_client.force_authenticate(user=candidate_user)

    response = api_client.post(
        reverse("candidate-resume-upload"),
        {"application_id": str(application.id), "file": resume_file()},
        format="multipart",
    )

    assert response.status_code == 404


def test_recruiter_cannot_access_candidate_portal(api_client):
    recruiter, _ = create_recruiter()
    api_client.force_authenticate(user=recruiter)
    response = api_client.get(reverse("candidate-application-list"))
    assert response.status_code == 403


def test_recruiter_application_detail_includes_resume_file_urls(api_client):
    recruiter, org = create_recruiter()
    job = create_job(org, recruiter)
    application = create_application(org, job)
    Resume.objects.create(
        candidate=application.candidate,
        application=application,
        file_url=f"{org.id}/{application.candidate_id}/resume.pdf",
        file_name="resume.pdf",
        file_size=123,
        mime_type="application/pdf",
        file_hash="abc",
        uploaded_by=recruiter,
    )
    api_client.force_authenticate(user=recruiter)

    response = api_client.get(reverse("application-detail", args=[application.id]))

    assert response.status_code == 200
    resumes = response.json()["resumes"]
    assert resumes[0]["application"] == str(application.id)
    assert resumes[0]["view_url"] == reverse("resume-view", args=[resumes[0]["id"]])
    assert resumes[0]["download_url"] == reverse("resume-download", args=[resumes[0]["id"]])


def test_recruiter_application_detail_reconciles_completed_parsed_resume_status(api_client):
    recruiter, org = create_recruiter()
    job = create_job(org, recruiter)
    application = create_application(org, job)
    resume = Resume.objects.create(
        candidate=application.candidate,
        application=application,
        file_url=f"{org.id}/{application.candidate_id}/resume.pdf",
        file_name="resume.pdf",
        file_size=123,
        mime_type="application/pdf",
        file_hash="abc",
        status=Resume.Status.PROCESSING,
        uploaded_by=recruiter,
    )
    ParsedResume.objects.create(
        resume=resume,
        candidate=application.candidate,
        application=application,
        status=ParsedResume.Status.COMPLETED,
        data={"_metadata": {"total_years_experience": 4}},
        confidence=ParsedResume.Confidence.HIGH,
    )
    api_client.force_authenticate(user=recruiter)

    response = api_client.get(reverse("application-detail", args=[application.id]))

    assert response.status_code == 200
    resume_payload = response.json()["resumes"][0]
    assert resume_payload["status"] == Resume.Status.COMPLETED
    assert resume_payload["parsed_resume"]["status"] == ParsedResume.Status.COMPLETED


def test_resume_extraction_parses_inline_and_refreshes_scores(settings):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    recruiter, org = create_recruiter()
    job = create_job(org, recruiter)
    application = create_application(org, job, email="alice@example.com")
    resume = Resume.objects.create(
        candidate=application.candidate,
        application=application,
        file_url=f"{org.id}/{application.candidate_id}/resume.pdf",
        file_name="resume.pdf",
        file_size=100,
        mime_type="application/pdf",
        status=Resume.Status.PENDING,
    )

    parse_result = SimpleNamespace(
        data={
            "skills": [{"name": "Python"}],
            "_metadata": {"total_years_experience": 4},
        },
        confidence=ParsedResume.Confidence.HIGH,
        model="heuristic-fallback",
        validation_errors=[],
        token_usage={},
        estimated_cost=None,
    )

    with (
        patch("apps.candidates.tasks.extract_text_from_bytes", return_value="Python 4 years"),
        patch("apps.candidates.tasks.parse_resume_text", return_value=parse_result),
    ):
        from apps.candidates.tasks import extract_resume_text_from_bytes

        extract_resume_text_from_bytes(resume, b"%PDF-1.4 resume bytes")

    resume.refresh_from_db()
    application.refresh_from_db()
    parsed_resume = ParsedResume.objects.get(resume=resume)

    assert resume.status == Resume.Status.COMPLETED
    assert parsed_resume.status == ParsedResume.Status.COMPLETED
    assert application.skill_score == 1
    assert application.final_score is not None
    assert application.final_score > 0


def test_recruiter_resume_upload_enforces_org_application_isolation(api_client):
    recruiter_a, org_a = create_recruiter("a@example.com")
    recruiter_b, org_b = create_recruiter("b@example.com")
    job_a = create_job(org_a, recruiter_a)
    application_a = create_application(org_a, job_a, email="candidate@example.com")

    api_client.force_authenticate(user=recruiter_b)

    with patch("apps.candidates.views.upload_file"):
        response = api_client.post(
            reverse("resume-upload"),
            {
                "application_id": str(application_a.id),
                "file": resume_file(),
                "email": "candidate@example.com",
            },
            format="multipart",
        )

    assert response.status_code == 404
    assert not Resume.objects.filter(
        uploaded_by=recruiter_b,
        candidate__organization=org_b,
    ).exists()


def test_resume_upload_rejects_non_pdf_doc_files(api_client):
    recruiter, org = create_recruiter()
    job = create_job(org, recruiter)
    application = create_application(org, job)

    api_client.force_authenticate(user=recruiter)

    with patch("apps.candidates.views.upload_file"):
        response = api_client.post(
            reverse("resume-upload"),
            {
                "application_id": str(application.id),
                "file": resume_file("resume.txt", "text/plain"),
                "email": application.candidate.email,
            },
            format="multipart",
        )

    assert response.status_code == 400
    assert not Resume.objects.exists()


# ─── Recruiter — Application Status Update ───────────────────────────────────

def test_recruiter_can_update_application_status(api_client):
    recruiter, org = create_recruiter()
    job = create_job(org, recruiter)
    application = create_application(org, job)
    api_client.force_authenticate(user=recruiter)

    response = api_client.patch(
        reverse("application-status-update", args=[application.id]),
        {"status": "under_review", "notes": "Looks good."},
        format="json",
    )
    assert response.status_code == 200
    application.refresh_from_db()
    assert application.status == Application.Status.UNDER_REVIEW


def test_status_update_creates_history_entry(api_client):
    recruiter, org = create_recruiter()
    job = create_job(org, recruiter)
    application = create_application(org, job)
    api_client.force_authenticate(user=recruiter)

    api_client.patch(
        reverse("application-status-update", args=[application.id]),
        {"status": "shortlisted", "notes": "Strong candidate."},
        format="json",
    )

    history = ApplicationHistory.objects.filter(application=application)
    assert history.count() == 1
    entry = history.first()
    assert entry.from_status == "applied"
    assert entry.to_status == "shortlisted"
    assert entry.changed_by == recruiter
    assert entry.notes == "Strong candidate."


# ─── Recruiter — Pipeline Board ───────────────────────────────────────────────

def test_pipeline_board_groups_by_status(api_client):
    recruiter, org = create_recruiter()
    job = create_job(org, recruiter)

    create_application(org, job, email="a@example.com")
    app2 = create_application(org, job, email="b@example.com")
    app2.status = Application.Status.UNDER_REVIEW
    app2.save()

    api_client.force_authenticate(user=recruiter)
    response = api_client.get(reverse("pipeline-board"))
    assert response.status_code == 200

    columns = {col["status"]: col for col in response.json()["columns"]}
    assert columns["applied"]["count"] == 1
    assert columns["under_review"]["count"] == 1


def test_pipeline_board_org_isolation(api_client):
    recruiter_a, org_a = create_recruiter("a@example.com")
    recruiter_b, org_b = create_recruiter("b@example.com")

    job_a = create_job(org_a, recruiter_a)
    create_application(org_a, job_a, email="c@example.com")

    api_client.force_authenticate(user=recruiter_b)
    response = api_client.get(reverse("pipeline-board"))
    assert response.status_code == 200
    total = sum(col["count"] for col in response.json()["columns"])
    assert total == 0  # recruiter B sees none of org A's applications
