from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Recruiter, User
from apps.candidates.models import Application, Candidate, ParsedResume, Resume
from apps.jobs.models import Job
from apps.organizations.models import Organization

pytestmark = pytest.mark.django_db


def create_recruiter(email: str):
    user = User.objects.create_user(
        email=email,
        password="StrongPass123!",
        first_name="Rina",
        last_name="Shah",
        role=User.Role.RECRUITER,
    )
    organization = Organization.objects.create(
        name=f"{email} Org",
        approval_status=Organization.ApprovalStatus.APPROVED,
    )
    Recruiter.objects.create(
        user=user,
        first_name=user.first_name,
        last_name=user.last_name,
        organization=organization,
        verification_status=Recruiter.VerificationStatus.APPROVED,
        is_verified=True,
    )
    return user, organization


def create_job(organization, created_by, **overrides):
    payload = {
        "organization": organization,
        "created_by": created_by,
        "title": "Senior Backend Engineer",
        "description": "Build reliable recruiting platform APIs.",
        "requirements": "Python, Django, REST APIs, PostgreSQL.",
        "location": "Remote",
        "employment_type": Job.EmploymentType.FULL_TIME,
        "salary_range": "$120k-$160k",
    }
    payload.update(overrides)
    return Job.objects.create(**payload)


def create_parsed_resume(organization, job, *, email="candidate@example.com", skills=None):
    candidate = Candidate.objects.create(
        organization=organization,
        first_name="Alice",
        last_name="Smith",
        email=email,
    )
    application = Application.objects.create(
        candidate=candidate,
        job=job,
        organization=organization,
    )
    resume = Resume.objects.create(
        candidate=candidate,
        application=application,
        file_url=f"https://example.com/{candidate.id}/resume.pdf",
        file_name="resume.pdf",
        file_size=123,
        mime_type="application/pdf",
        status=Resume.Status.COMPLETED,
    )
    return ParsedResume.objects.create(
        resume=resume,
        candidate=candidate,
        application=application,
        status=ParsedResume.Status.COMPLETED,
        confidence=ParsedResume.Confidence.HIGH,
        parser_model="gpt-oss:20b",
        data={
            "personal_info": {"full_name": candidate.full_name},
            "summary": "Backend engineer building reliable APIs.",
            "skills": [{"name": skill} for skill in (skills or ["Python", "Django"])],
        },
    )


@pytest.fixture
def api_client():
    return APIClient()


def test_recruiter_can_create_and_list_organization_jobs(api_client):
    user, organization = create_recruiter("recruiter@example.com")
    api_client.force_authenticate(user=user)

    response = api_client.post(
        reverse("job-list"),
        {
            "title": "Product Designer",
            "description": "Own core recruiter workflow design.",
            "requirements": "Portfolio, systems thinking, SaaS experience.",
            "location": "Bengaluru",
            "employment_type": "full_time",
            "salary_range": "$90k-$130k",
        },
        format="json",
    )

    assert response.status_code == 201
    job = Job.objects.get(title="Product Designer")
    assert job.organization == organization
    assert job.created_by == user

    list_response = api_client.get(reverse("job-list"), format="json")

    assert list_response.status_code == 200
    assert len(list_response.json()) == 1
    assert list_response.json()[0]["title"] == "Product Designer"


def test_job_detail_is_tenant_scoped(api_client):
    user, _organization = create_recruiter("recruiter@example.com")
    other_user, other_organization = create_recruiter("other@example.com")
    other_job = create_job(other_organization, other_user)
    api_client.force_authenticate(user=user)

    response = api_client.get(reverse("job-detail", args=[other_job.id]), format="json")

    assert response.status_code == 404


def test_recruiter_can_publish_unpublish_and_archive_job(api_client):
    user, organization = create_recruiter("recruiter@example.com")
    job = create_job(organization, user)
    api_client.force_authenticate(user=user)

    publish_response = api_client.post(reverse("job-publish", args=[job.id]), format="json")
    job.refresh_from_db()
    assert publish_response.status_code == 200
    assert job.status == Job.Status.PUBLISHED
    assert job.published_at is not None

    unpublish_response = api_client.post(reverse("job-unpublish", args=[job.id]), format="json")
    job.refresh_from_db()
    assert unpublish_response.status_code == 200
    assert job.status == Job.Status.DRAFT

    archive_response = api_client.post(reverse("job-archive", args=[job.id]), format="json")
    job.refresh_from_db()
    assert archive_response.status_code == 200
    assert job.status == Job.Status.ARCHIVED


def test_public_job_list_only_shows_published_jobs(api_client):
    user, organization = create_recruiter("recruiter@example.com")
    published_job = create_job(organization, user, status=Job.Status.PUBLISHED)
    create_job(organization, user, title="Draft Job", status=Job.Status.DRAFT)

    response = api_client.get(reverse("public-job-list"), format="json")

    assert response.status_code == 200
    assert [job["id"] for job in response.json()] == [str(published_job.id)]


def test_public_candidate_can_apply_to_published_job(api_client):
    user, organization = create_recruiter("recruiter@example.com")
    job = create_job(organization, user, status=Job.Status.PUBLISHED)

    response = api_client.post(
        reverse("job-apply", args=[job.id]),
        {
            "first_name": "Asha",
            "last_name": "Patel",
            "email": "asha@example.com",
            "phone": "+1 555 0101",
            "linkedin_url": "https://linkedin.com/in/asha",
            "github_url": "https://github.com/asha",
        },
        format="json",
    )

    assert response.status_code == 201
    candidate = Candidate.objects.get(email="asha@example.com")
    application = Application.objects.get(candidate=candidate, job=job)
    assert candidate.organization == organization
    assert application.organization == organization
    assert application.status == Application.Status.APPLIED


def test_public_candidate_can_apply_with_resume(api_client):
    user, organization = create_recruiter("recruiter@example.com")
    job = create_job(organization, user, status=Job.Status.PUBLISHED)
    resume_file = SimpleUploadedFile(
        "asha-resume.pdf",
        b"%PDF-1.4 resume bytes",
        content_type="application/pdf",
    )

    with (
        patch("apps.jobs.views.upload_file", return_value="stored/path.pdf") as upload,
        patch("apps.jobs.views.extract_resume_text_from_bytes") as extract_inline,
    ):
        response = api_client.post(
            reverse("job-apply", args=[job.id]),
            {
                "first_name": "Asha",
                "last_name": "Patel",
                "email": "asha@example.com",
                "phone": "+1 555 0101",
                "linkedin_url": "https://linkedin.com/in/asha",
                "github_url": "https://github.com/asha",
                "resume": resume_file,
            },
            format="multipart",
        )

    assert response.status_code == 201
    application = Application.objects.get(job=job, candidate__email="asha@example.com")
    resume = Resume.objects.get(application=application)
    assert resume.candidate == application.candidate
    assert resume.file_name == "asha-resume.pdf"
    upload.assert_called_once()
    extract_inline.assert_called_once_with(resume, b"%PDF-1.4 resume bytes")


def test_existing_candidate_can_apply_to_job_they_have_not_applied_to(api_client):
    user, organization = create_recruiter("recruiter@example.com")
    job = create_job(organization, user, status=Job.Status.PUBLISHED)
    Candidate.objects.create(
        organization=organization,
        first_name="Asha",
        last_name="Existing",
        email="asha@example.com",
    )

    response = api_client.post(
        reverse("job-apply", args=[job.id]),
        {
            "first_name": "Asha",
            "last_name": "Patel",
            "email": "ASHA@example.com",
            "phone": "+1 555 0101",
            "linkedin_url": "",
            "github_url": "",
        },
        format="json",
    )

    assert response.status_code == 201
    assert Candidate.objects.filter(email="asha@example.com").count() == 1
    application = Application.objects.get(job=job, candidate__email="asha@example.com")
    assert application.status == Application.Status.APPLIED


def test_public_apply_is_idempotent_for_existing_application(api_client):
    user, organization = create_recruiter("recruiter@example.com")
    job = create_job(organization, user, status=Job.Status.PUBLISHED)
    candidate = Candidate.objects.create(
        organization=organization,
        first_name="Asha",
        last_name="Patel",
        email="asha@example.com",
    )
    existing_application = Application.objects.create(
        candidate=candidate,
        job=job,
        organization=organization,
    )

    response = api_client.post(
        reverse("job-apply", args=[job.id]),
        {
            "first_name": "Asha",
            "last_name": "Patel",
            "email": "asha@example.com",
            "phone": "+1 555 0101",
            "linkedin_url": "",
            "github_url": "",
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["id"] == str(existing_application.id)
    assert Application.objects.filter(candidate=candidate, job=job).count() == 1


def test_application_list_is_tenant_scoped(api_client):
    user, organization = create_recruiter("recruiter@example.com")
    other_user, other_organization = create_recruiter("other@example.com")
    job = create_job(organization, user, status=Job.Status.PUBLISHED)
    other_job = create_job(other_organization, other_user, status=Job.Status.PUBLISHED)
    candidate = Candidate.objects.create(
        organization=organization,
        first_name="Asha",
        last_name="Patel",
        email="asha@example.com",
    )
    other_candidate = Candidate.objects.create(
        organization=other_organization,
        first_name="Mia",
        last_name="Chen",
        email="mia@example.com",
    )
    own_application = Application.objects.create(
        candidate=candidate,
        job=job,
        organization=organization,
    )
    Application.objects.create(
        candidate=other_candidate,
        job=other_job,
        organization=other_organization,
    )
    api_client.force_authenticate(user=user)

    response = api_client.get(reverse("application-list"), format="json")

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [str(own_application.id)]


def test_recruiter_can_close_job(api_client):
    user, organization = create_recruiter("recruiter@example.com")
    job = create_job(organization, user, status=Job.Status.PUBLISHED)
    api_client.force_authenticate(user=user)

    close_response = api_client.post(reverse("job-close", args=[job.id]), format="json")
    job.refresh_from_db()
    assert close_response.status_code == 200
    assert job.status == Job.Status.CLOSED


def test_job_created_with_department_and_remote_policy(api_client):
    user, _organization = create_recruiter("recruiter@example.com")
    api_client.force_authenticate(user=user)

    response = api_client.post(
        reverse("job-list"),
        {
            "title": "Frontend Engineer",
            "description": "Build the recruiter-facing UI.",
            "requirements": "React, TypeScript, TailwindCSS.",
            "location": "Bengaluru",
            "employment_type": "full_time",
            "department": "Engineering",
            "remote_policy": "hybrid",
            "salary_range": "$80k-$110k",
        },
        format="json",
    )

    assert response.status_code == 201
    data = response.json()
    assert data["department"] == "Engineering"
    assert data["remote_policy"] == "hybrid"


def test_job_list_filters_by_department(api_client):
    user, organization = create_recruiter("recruiter@example.com")
    create_job(organization, user, title="Backend Role", department="Engineering")
    create_job(organization, user, title="HR Manager", department="People")
    api_client.force_authenticate(user=user)

    response = api_client.get(reverse("job-list"), {"department": "Engineering"}, format="json")

    assert response.status_code == 200
    titles = [job["title"] for job in response.json()]
    assert "Backend Role" in titles
    assert "HR Manager" not in titles


def test_job_list_filters_by_search(api_client):
    user, organization = create_recruiter("recruiter@example.com")
    create_job(organization, user, title="Python Developer")
    create_job(organization, user, title="Sales Manager")
    api_client.force_authenticate(user=user)

    response = api_client.get(reverse("job-list"), {"search": "Python"}, format="json")

    assert response.status_code == 200
    titles = [job["title"] for job in response.json()]
    assert "Python Developer" in titles
    assert "Sales Manager" not in titles


def test_embedding_backfill_generates_job_and_candidate_vectors(api_client):
    if connection.vendor != "postgresql":
        pytest.skip("pgvector embedding tests require PostgreSQL")

    user, organization = create_recruiter("recruiter@example.com")
    job = create_job(organization, user)
    parsed_resume = create_parsed_resume(organization, job)
    api_client.force_authenticate(user=user)

    response = api_client.post(reverse("embedding-backfill"), {}, format="json")

    assert response.status_code == 200
    assert response.json()["queued_jobs"] == 1
    assert response.json()["queued_parsed_resumes"] == 1
    job.refresh_from_db()
    parsed_resume.refresh_from_db()
    assert job.embedding is not None
    assert job.embedding_model
    assert parsed_resume.embedding is not None
    assert parsed_resume.embedding_model


def test_similar_candidates_are_scoped_to_recruiter_organization(api_client):
    if connection.vendor != "postgresql":
        pytest.skip("pgvector embedding tests require PostgreSQL")

    user, organization = create_recruiter("recruiter@example.com")
    other_user, other_organization = create_recruiter("other@example.com")
    job = create_job(
        organization,
        user,
        description="Build Python and Django APIs for recruitment workflows.",
        requirements="Python, Django, PostgreSQL.",
    )
    other_job = create_job(other_organization, other_user)
    own_resume = create_parsed_resume(
        organization,
        job,
        email="alice@example.com",
        skills=["Python", "Django", "PostgreSQL"],
    )
    create_parsed_resume(
        other_organization,
        other_job,
        email="outsider@example.com",
        skills=["Python", "Django"],
    )
    api_client.force_authenticate(user=user)
    api_client.post(reverse("embedding-backfill"), {}, format="json")

    response = api_client.get(reverse("job-similar-candidates", args=[job.id]), format="json")

    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
    assert data["results"][0]["parsed_resume_id"] == str(own_resume.id)
    assert data["results"][0]["candidate_email"] == "alice@example.com"


def test_ranked_candidates_returns_scores_and_persists_breakdown(api_client):
    if connection.vendor != "postgresql":
        pytest.skip("pgvector ranking tests require PostgreSQL")

    user, organization = create_recruiter("recruiter@example.com")
    job = create_job(
        organization,
        user,
        description="Build production Python and Django services.",
        requirements="Python, Django, PostgreSQL, 3 years experience.",
    )
    strong_resume = create_parsed_resume(
        organization,
        job,
        email="strong@example.com",
        skills=["Python", "Django", "PostgreSQL"],
    )
    strong_resume.data["metadata"] = {"total_years_experience": 4}
    strong_resume.save(update_fields=["data", "updated_at"])
    weak_candidate = Candidate.objects.create(
        organization=organization,
        first_name="No",
        last_name="Resume",
        email="noresume@example.com",
    )
    weak_application = Application.objects.create(
        candidate=weak_candidate,
        job=job,
        organization=organization,
    )
    api_client.force_authenticate(user=user)

    response = api_client.get(reverse("job-ranked-candidates", args=[job.id]), format="json")

    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 2
    assert data["results"][0]["candidate"]["email"] == "strong@example.com"
    assert data["results"][0]["rank"] == 1
    assert data["results"][0]["score"] > data["results"][1]["score"]
    assert data["results"][0]["breakdown"]["skill_match"] == 100
    assert data["results"][0]["breakdown"]["experience_match"] == 100
    assert data["results"][0]["matched_skills"] == ["Django", "PostgreSQL", "Python"]

    strong_application = strong_resume.application
    strong_application.refresh_from_db()
    weak_application.refresh_from_db()
    assert strong_application.final_score is not None
    assert strong_application.semantic_score is not None
    assert str(strong_application.skill_score) == "1.00000"
    assert str(strong_application.experience_score) == "1.00000"
    assert str(weak_application.final_score) == "0.00000"


def test_ranked_candidates_use_candidate_profile_name_not_parsed_resume_name(api_client):
    if connection.vendor != "postgresql":
        pytest.skip("pgvector ranking tests require PostgreSQL")

    user, organization = create_recruiter("recruiter-name@example.com")
    job = create_job(
        organization,
        user,
        description="Build frontend React applications.",
        requirements="React, TypeScript, 2 years experience.",
    )
    parsed_resume = create_parsed_resume(
        organization,
        job,
        email="athira@example.com",
        skills=["React", "TypeScript"],
    )
    parsed_resume.candidate.first_name = "Athira"
    parsed_resume.candidate.last_name = "S"
    parsed_resume.candidate.save(update_fields=["first_name", "last_name", "updated_at"])
    parsed_resume.data["personal_info"] = {"full_name": "PARTHIV A M"}
    parsed_resume.save(update_fields=["data", "updated_at"])

    api_client.force_authenticate(user=user)

    response = api_client.get(reverse("job-ranked-candidates", args=[job.id]), format="json")

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["candidate"]["name"] == "Athira S"
    assert result["candidate"]["email"] == "athira@example.com"
