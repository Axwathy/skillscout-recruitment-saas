
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Recruiter, User
from apps.ai_engine.ranking import (
    calculate_experience_match,
    calculate_hybrid_score,
    calculate_semantic_similarity,
    calculate_skill_match,
    rank_candidates_for_job,
    score_application,
)
from apps.ai_engine.tasks import batch_score_applications
from apps.candidates.models import Application, Candidate, ParsedResume, Resume
from apps.jobs.models import Job
from apps.organizations.models import Organization

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


def vector(*values: float) -> list[float]:
    return [*values, *([0.0] * (384 - len(values)))]


def create_recruiter():
    user = User.objects.create_user(
        email="recruiter@example.com",
        password="StrongPass123!",
        first_name="Rina",
        last_name="Shah",
        role=User.Role.RECRUITER,
    )
    organization = Organization.objects.create(
        name="Nexus Talent",
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


def create_job(organization, user):
    return Job.objects.create(
        organization=organization,
        created_by=user,
        title="Backend Engineer",
        description="Build APIs for recruitment workflows.",
        requirements="Python Django React 3 years experience.",
        location="Remote",
        employment_type=Job.EmploymentType.FULL_TIME,
        embedding=vector(1.0),
        embedding_model="BAAI/bge-small-en-v1.5",
        embedding_text_hash="job-hash",
    )


def create_application_with_parsed_resume(
    *,
    organization,
    job,
    email,
    skills,
    years,
    embedding,
) -> Application:
    candidate = Candidate.objects.create(
        organization=organization,
        first_name=email.split("@", 1)[0].title(),
        last_name="Candidate",
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
        file_url=f"{organization.id}/{candidate.id}/resume.pdf",
        file_name="resume.pdf",
        file_size=100,
        mime_type="application/pdf",
        status=Resume.Status.COMPLETED,
    )
    ParsedResume.objects.create(
        resume=resume,
        candidate=candidate,
        application=application,
        status=ParsedResume.Status.COMPLETED,
        data={
            "skills": [{"name": skill} for skill in skills],
            "_metadata": {"total_years_experience": years},
        },
        confidence=ParsedResume.Confidence.HIGH,
        embedding=embedding,
        embedding_model="BAAI/bge-small-en-v1.5",
        embedding_text_hash=f"{email}-hash",
    )
    return application


def test_hybrid_score_uses_sprint_7_formula():
    score = calculate_hybrid_score(
        semantic_similarity=0.92,
        skill_match=0.85,
        experience_match=0.80,
    )

    assert score == 0.869


def test_semantic_skill_and_experience_scores_are_deterministic():
    semantic = calculate_semantic_similarity([1, 0, 0], [0.8, 0.6, 0])
    skill, matched, missing = calculate_skill_match(
        ["Python", "Django", "PostgreSQL"],
        ["Python", "Django", "React"],
    )

    assert semantic == 0.8
    assert skill == 0.66667
    assert matched == ["Python", "Django"]
    assert missing == ["PostgreSQL"]
    assert calculate_experience_match(3, 4) == 1.0
    assert calculate_experience_match(4, 2) == 0.5


def test_score_application_stores_breakdown_and_reads_parser_metadata():
    user, organization = create_recruiter()
    job = create_job(organization, user)
    application = create_application_with_parsed_resume(
        organization=organization,
        job=job,
        email="asha@example.com",
        skills=["Python", "Django", "PostgreSQL"],
        years=4,
        embedding=vector(0.8, 0.6),
    )

    score = score_application(application)
    application.refresh_from_db()

    assert score.semantic_score == 0.8
    assert score.skill_score == 0.66667
    assert score.experience_score == 1.0
    assert score.final_score == 0.81
    assert score.candidate_experience_years == 4
    assert application.semantic_score == Decimal("0.80000")
    assert application.skill_score == Decimal("0.66667")
    assert application.experience_score == Decimal("1.00000")
    assert application.final_score == Decimal("0.81000")
    assert application.score_version == "hybrid-v1"
    assert application.score_calculated_at is not None


def test_rank_candidates_for_job_sorts_descending_by_final_score():
    user, organization = create_recruiter()
    job = create_job(organization, user)
    stronger = create_application_with_parsed_resume(
        organization=organization,
        job=job,
        email="strong@example.com",
        skills=["Python", "Django", "React"],
        years=5,
        embedding=vector(1.0),
    )
    weaker = create_application_with_parsed_resume(
        organization=organization,
        job=job,
        email="weak@example.com",
        skills=["React"],
        years=1,
        embedding=vector(0.0, 1.0),
    )

    ranked = rank_candidates_for_job(job)

    assert [score.application.id for score in ranked] == [
        stronger.id,
        weaker.id,
    ]


def test_ranked_candidates_api_returns_ranked_breakdown(api_client):
    user, organization = create_recruiter()
    job = create_job(organization, user)
    application = create_application_with_parsed_resume(
        organization=organization,
        job=job,
        email="asha@example.com",
        skills=["Python", "Django", "PostgreSQL"],
        years=4,
        embedding=vector(0.8, 0.6),
    )
    api_client.force_authenticate(user=user)

    response = api_client.get(reverse("job-ranked-candidates", args=[job.id]))

    assert response.status_code == 200
    payload = response.json()
    assert payload["job_id"] == str(job.id)
    assert payload["count"] == 1
    result = payload["results"][0]
    assert result["rank"] == 1
    assert result["application_id"] == str(application.id)
    assert result["score"] == 81
    assert result["breakdown"] == {
        "semantic_match": 80,
        "skill_match": 67,
        "experience_match": 100,
    }


def test_ranked_candidates_get_is_read_only(api_client):
    user, organization = create_recruiter()
    job = create_job(organization, user)
    application = create_application_with_parsed_resume(
        organization=organization,
        job=job,
        email="asha@example.com",
        skills=["Python", "Django", "PostgreSQL"],
        years=4,
        embedding=vector(0.8, 0.6),
    )
    api_client.force_authenticate(user=user)
    url = reverse("job-ranked-candidates", args=[job.id])

    # A plain GET computes and returns scores but must NOT persist them.
    response = api_client.get(url)
    assert response.status_code == 200
    assert response.json()["results"][0]["score"] == 81
    application.refresh_from_db()
    assert application.score_calculated_at is None
    assert application.final_score is None

    # force=true persists the computed scores (and regenerates embeddings, so the
    # exact value depends on the live model — assert persistence, not the number).
    response = api_client.get(url, {"force": "true"})
    assert response.status_code == 200
    application.refresh_from_db()
    assert application.score_calculated_at is not None
    assert application.final_score is not None
    assert application.score_version == "hybrid-v1"


def test_batch_score_applications_persists_scores():
    user, organization = create_recruiter()
    job = create_job(organization, user)
    application = create_application_with_parsed_resume(
        organization=organization,
        job=job,
        email="asha@example.com",
        skills=["Python", "Django", "PostgreSQL"],
        years=4,
        embedding=vector(0.8, 0.6),
    )
    assert application.score_calculated_at is None

    count = batch_score_applications(str(job.id))

    assert count == 1
    application.refresh_from_db()
    assert application.final_score == Decimal("0.81000")
    assert application.score_version == "hybrid-v1"
    assert application.score_calculated_at is not None


def _seed_strong_and_weak(organization, job):
    create_application_with_parsed_resume(
        organization=organization,
        job=job,
        email="strong@example.com",
        skills=["Python", "Django", "React"],
        years=5,
        embedding=vector(1.0),
    )
    create_application_with_parsed_resume(
        organization=organization,
        job=job,
        email="weak@example.com",
        skills=["React"],
        years=1,
        embedding=vector(0.0, 1.0),
    )


def test_ranked_candidates_min_score_filter(api_client):
    user, organization = create_recruiter()
    job = create_job(organization, user)
    _seed_strong_and_weak(organization, job)
    api_client.force_authenticate(user=user)

    response = api_client.get(
        reverse("job-ranked-candidates", args=[job.id]), {"min_score": 50}
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["filters"]["min_score"] == 50
    assert payload["count"] == 1
    assert payload["results"][0]["candidate"]["email"] == "strong@example.com"


def test_ranked_candidates_skills_met_filter(api_client):
    user, organization = create_recruiter()
    job = create_job(organization, user)
    _seed_strong_and_weak(organization, job)
    api_client.force_authenticate(user=user)

    response = api_client.get(
        reverse("job-ranked-candidates", args=[job.id]), {"skills_met": "true"}
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["filters"]["skills_met"] is True
    assert [r["candidate"]["email"] for r in payload["results"]] == ["strong@example.com"]
