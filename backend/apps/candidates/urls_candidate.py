from django.urls import path

from . import candidate_views
from .auth_views import CandidateRegisterView

urlpatterns = [
    path("auth/register/", CandidateRegisterView.as_view(), name="candidate-register"),
    path("me/profile/", candidate_views.CandidateProfileView.as_view(), name="candidate-profile"),
    path(
        "me/applications/",
        candidate_views.CandidateApplicationListView.as_view(),
        name="candidate-application-list",
    ),
    path(
        "me/applications/<uuid:pk>/",
        candidate_views.CandidateApplicationDetailView.as_view(),
        name="candidate-application-detail",
    ),
    path(
        "me/resumes/upload/",
        candidate_views.CandidateResumeUploadView.as_view(),
        name="candidate-resume-upload",
    ),
    path(
        "me/recommendations/",
        candidate_views.CandidateRecommendationsView.as_view(),
        name="candidate-recommendations",
    ),
]
