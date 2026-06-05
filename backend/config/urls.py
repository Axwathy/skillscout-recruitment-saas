from django.contrib import admin
from django.urls import include, path

from apps.candidates.views import ResumeDownloadFileView, ResumeReparseView, ResumeViewFileView

admin.site.site_header = "Lumina Nexus Admin"
admin.site.site_title = "Lumina Nexus"
admin.site.index_title = "Recruitment Operations"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/jobs/", include("apps.jobs.urls")),
    path("api/v1/applications/", include("apps.candidates.urls")),
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
