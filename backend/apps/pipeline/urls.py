from django.urls import path

from . import views

urlpatterns = [
    path("board/<uuid:job_id>/", views.JobPipelineBoardView.as_view(), name="pipeline-board-job"),
    path(
        "jobs/<uuid:job_id>/stages/",
        views.PipelineStageListCreateView.as_view(),
        name="pipeline-stage-list",
    ),
    path(
        "stages/<uuid:pk>/",
        views.PipelineStageDetailView.as_view(),
        name="pipeline-stage-detail",
    ),
    path(
        "stages/reorder/",
        views.PipelineStageReorderView.as_view(),
        name="pipeline-stage-reorder",
    ),
    path("move/", views.PipelineMoveView.as_view(), name="pipeline-move"),
]
