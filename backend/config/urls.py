from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from apps.candidates.views import ResumeDownloadFileView, ResumeReparseView, ResumeViewFileView

admin.site.site_header = "SkillScout Admin"
admin.site.site_title = "SkillScout"
admin.site.index_title = "Recruitment Operations"

urlpatterns = [
    path("admin/", admin.site.urls),
    # API documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/jobs/", include("apps.jobs.urls")),
    path("api/v1/search/", include("apps.ai_engine.urls")),
    path("api/v1/interviews/", include("apps.interviews.urls")),
    path("api/v1/applications/", include("apps.candidates.urls")),
    path("api/v1/pipeline/", include("apps.pipeline.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/analytics/", include("apps.analytics.urls")),
    path("api/v1/batch/", include("apps.batch.urls")),
    path("api/v1/resumes/<uuid:pk>/view/", ResumeViewFileView.as_view(), name="resume-view"),
    path(
        "api/v1/resumes/<uuid:pk>/download/",
        ResumeDownloadFileView.as_view(),
        name="resume-download",
    ),
    path("api/v1/resumes/<uuid:pk>/reparse/", ResumeReparseView.as_view(), name="resume-reparse"),
    path("api/v1/candidate/", include("apps.candidates.urls_candidate")),
    path("api/v1/health/", include("apps.core.urls")),
]
