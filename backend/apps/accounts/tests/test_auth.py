import pytest
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Recruiter, User
from apps.organizations.models import Organization

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


def register_payload(**overrides):
    payload = {
        "first_name": "Asha",
        "last_name": "Patel",
        "company_name": "Nexus Talent",
        "website": "https://example.com",
        "email": "asha@example.com",
        "password": "StrongPass123!",
        "confirm_password": "StrongPass123!",
    }
    payload.update(overrides)
    return payload


def create_recruiter(
    *,
    email="recruiter@example.com",
    password="StrongPass123!",
    recruiter_status=Recruiter.VerificationStatus.APPROVED,
    organization_status=Organization.ApprovalStatus.APPROVED,
):
    user = User.objects.create_user(
        email=email,
        password=password,
        first_name="Rina",
        last_name="Shah",
        role=User.Role.RECRUITER,
    )
    organization = Organization.objects.create(
        name=f"{email} Org",
        approval_status=organization_status,
    )
    recruiter = Recruiter.objects.create(
        user=user,
        first_name=user.first_name,
        last_name=user.last_name,
        organization=organization,
        verification_status=recruiter_status,
        is_verified=recruiter_status == Recruiter.VerificationStatus.APPROVED,
    )
    return user, organization, recruiter


def test_registration_creates_user_organization_and_recruiter_profile(api_client):
    response = api_client.post(reverse("auth-register"), register_payload(), format="json")

    assert response.status_code == 201
    assert response.cookies["access"]["httponly"]
    assert response.cookies["refresh"]["httponly"]
    user = User.objects.get(email="asha@example.com")
    recruiter = user.recruiter_profile
    assert user.role == User.Role.RECRUITER
    assert recruiter.verification_status == Recruiter.VerificationStatus.APPROVED
    assert recruiter.is_verified is True
    assert recruiter.organization.name == "Nexus Talent"


def test_registration_rejects_duplicate_email(api_client):
    User.objects.create_user(email="asha@example.com", password="StrongPass123!")

    response = api_client.post(reverse("auth-register"), register_payload(), format="json")

    assert response.status_code == 400
    assert "email" in response.json()


def test_registration_requires_matching_password_confirmation(api_client):
    response = api_client.post(
        reverse("auth-register"),
        register_payload(confirm_password="DifferentPass123!"),
        format="json",
    )

    assert response.status_code == 400
    assert "confirm_password" in response.json()


def test_pending_recruiter_can_log_in_while_approval_workflow_is_dormant(api_client):
    create_recruiter(recruiter_status=Recruiter.VerificationStatus.PENDING)

    response = api_client.post(
        reverse("auth-login"),
        {"email": "recruiter@example.com", "password": "StrongPass123!"},
        format="json",
    )

    assert response.status_code == 200
    assert response.cookies["access"]["httponly"]
    assert response.cookies["refresh"]["httponly"]


def test_approved_recruiter_can_log_in_and_receives_cookies(api_client):
    create_recruiter()

    response = api_client.post(
        reverse("auth-login"),
        {"email": "recruiter@example.com", "password": "StrongPass123!"},
        format="json",
    )

    assert response.status_code == 200
    assert response.cookies["access"]["httponly"]
    assert response.cookies["refresh"]["httponly"]


def test_logout_clears_auth_cookies(api_client):
    create_recruiter()
    login_response = api_client.post(
        reverse("auth-login"),
        {"email": "recruiter@example.com", "password": "StrongPass123!"},
        format="json",
    )
    api_client.cookies["access"] = login_response.cookies["access"].value
    api_client.cookies["refresh"] = login_response.cookies["refresh"].value

    response = api_client.post(reverse("auth-logout"), format="json")

    assert response.status_code == 200
    assert response.cookies["access"].value == ""
    assert response.cookies["refresh"].value == ""


def test_refresh_renews_auth_cookies(api_client):
    create_recruiter()
    login_response = api_client.post(
        reverse("auth-login"),
        {"email": "recruiter@example.com", "password": "StrongPass123!"},
        format="json",
    )
    api_client.cookies["refresh"] = login_response.cookies["refresh"].value

    response = api_client.post(reverse("auth-refresh"), format="json")

    assert response.status_code == 200
    assert response.cookies["access"]["httponly"]
    assert response.cookies["refresh"]["httponly"]


def test_protected_endpoint_rejects_unauthenticated_requests(api_client):
    response = api_client.get(reverse("auth-me"), format="json")

    assert response.status_code in {401, 403}


def test_admin_endpoint_rejects_non_admin_users(api_client):
    create_recruiter()
    login_response = api_client.post(
        reverse("auth-login"),
        {"email": "recruiter@example.com", "password": "StrongPass123!"},
        format="json",
    )
    api_client.cookies["access"] = login_response.cookies["access"].value

    response = api_client.get(reverse("admin-recruiters-list"), format="json")

    assert response.status_code == 403


def test_login_rate_limit_returns_too_many_requests(api_client):
    payload = {"email": "missing@example.com", "password": "WrongPass123!"}

    responses = [
        api_client.post(reverse("auth-login"), payload, format="json")
        for _ in range(6)
    ]

    assert responses[-1].status_code == 429
