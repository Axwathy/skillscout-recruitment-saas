from django.urls import path

from . import views

urlpatterns = [
    path("public/", views.PublicJobListView.as_view(), name="public-job-list"),
    path("public/<slug:slug>/", views.PublicJobDetailView.as_view(), name="public-job-detail"),
    path("embeddings/backfill/", views.EmbeddingBackfillView.as_view(), name="embedding-backfill"),
    path("", views.JobListCreateView.as_view(), name="job-list"),
    path("<uuid:pk>/", views.JobDetailView.as_view(), name="job-detail"),
    path(
        "<uuid:pk>/similar-candidates/",
        views.SimilarCandidatesView.as_view(),
        name="job-similar-candidates",
    ),
    path(
        "<uuid:pk>/ranked-candidates/",
        views.RankedCandidatesView.as_view(),
        name="job-ranked-candidates",
    ),
    path("<uuid:pk>/apply/", views.PublicJobApplyView.as_view(), name="job-apply"),
    path("<uuid:pk>/publish/", views.JobPublishView.as_view(), name="job-publish"),
    path("<uuid:pk>/unpublish/", views.JobUnpublishView.as_view(), name="job-unpublish"),
    path("<uuid:pk>/close/", views.JobCloseView.as_view(), name="job-close"),
    path("<uuid:pk>/archive/", views.JobArchiveView.as_view(), name="job-archive"),
]
