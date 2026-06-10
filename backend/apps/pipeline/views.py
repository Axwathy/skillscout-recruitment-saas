from django.db import transaction
from rest_framework import generics, status, views
from rest_framework.response import Response

from apps.accounts.permissions import IsVerifiedRecruiter
from apps.candidates.models import Application
from apps.candidates.serializers import ApplicationSerializer
from apps.core.models import AuditLog
from apps.jobs.models import Job

from .models import PipelineStage
from .serializers import (
    PipelineMoveSerializer,
    PipelineStageReorderSerializer,
    PipelineStageSerializer,
)
from .services import ensure_default_pipeline_stages, move_application_to_stage


def get_recruiter_organization(request):
    return request.user.recruiter_profile.organization


def build_job_pipeline_board(job, applications):
    stages = list(ensure_default_pipeline_stages(job))
    first_stage_by_status = {}
    for stage in stages:
        first_stage_by_status.setdefault(stage.status, stage)

    applications_by_stage = {stage.id: [] for stage in stages}
    for application in applications:
        stage = None
        if application.current_stage_id and application.current_stage.job_id == job.id:
            stage = application.current_stage
        if stage is None:
            stage = first_stage_by_status.get(application.status)
        if stage:
            applications_by_stage.setdefault(stage.id, []).append(application)

    return {
        "job_id": str(job.id),
        "columns": [
            {
                "id": str(stage.id),
                "stage_id": str(stage.id),
                "status": stage.status,
                "label": stage.name,
                "name": stage.name,
                "order": stage.order,
                "color": stage.color,
                "is_terminal": stage.is_terminal,
                "count": len(applications_by_stage.get(stage.id, [])),
                "applications": ApplicationSerializer(
                    applications_by_stage.get(stage.id, []),
                    many=True,
                ).data,
            }
            for stage in stages
        ],
    }


class JobPipelineBoardView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def get(self, request, job_id, *args, **kwargs):
        organization = get_recruiter_organization(request)
        job = generics.get_object_or_404(Job, pk=job_id, organization=organization)
        applications = (
            Application.objects.filter(organization=organization, job=job)
            .select_related("candidate", "job", "organization", "current_stage")
            .order_by("-applied_at")
        )
        return Response(build_job_pipeline_board(job, applications))


class PipelineStageListCreateView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def get(self, request, job_id, *args, **kwargs):
        job = self._get_job(request, job_id)
        stages = ensure_default_pipeline_stages(job)
        return Response(PipelineStageSerializer(stages, many=True).data)

    def post(self, request, job_id, *args, **kwargs):
        job = self._get_job(request, job_id)
        serializer = PipelineStageSerializer(data=request.data, context={"job": job})
        serializer.is_valid(raise_exception=True)
        stage = serializer.save(job=job)

        AuditLog.log(
            action="pipeline.stage_created",
            user=request.user,
            entity=stage,
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(PipelineStageSerializer(stage).data, status=status.HTTP_201_CREATED)

    def _get_job(self, request, job_id):
        return generics.get_object_or_404(
            Job,
            pk=job_id,
            organization=get_recruiter_organization(request),
        )


class PipelineStageDetailView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def patch(self, request, pk, *args, **kwargs):
        stage = self._get_stage(request, pk)
        serializer = PipelineStageSerializer(
            stage,
            data=request.data,
            partial=True,
            context={"job": stage.job},
        )
        serializer.is_valid(raise_exception=True)
        stage = serializer.save()

        AuditLog.log(
            action="pipeline.stage_updated",
            user=request.user,
            entity=stage,
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(PipelineStageSerializer(stage).data)

    def delete(self, request, pk, *args, **kwargs):
        stage = self._get_stage(request, pk)
        if stage.applications.exists():
            return Response(
                {"detail": "Move applications out of this stage before removing it."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stage.is_active = False
        stage.save(update_fields=["is_active", "updated_at"])
        AuditLog.log(
            action="pipeline.stage_removed",
            user=request.user,
            entity=stage,
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _get_stage(self, request, pk):
        return generics.get_object_or_404(
            PipelineStage.objects.select_related("job"),
            pk=pk,
            job__organization=get_recruiter_organization(request),
            is_active=True,
        )


class PipelineStageReorderView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def patch(self, request, *args, **kwargs):
        serializer = PipelineStageReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        organization = get_recruiter_organization(request)
        job = generics.get_object_or_404(
            Job,
            pk=serializer.validated_data["job_id"],
            organization=organization,
        )
        stage_ids = serializer.validated_data["stage_ids"]
        stages = list(PipelineStage.objects.filter(job=job, is_active=True, id__in=stage_ids))
        stages_by_id = {stage.id: stage for stage in stages}
        if set(stages_by_id) != set(stage_ids):
            return Response(
                {"detail": "Stage list must contain only active stages for this job."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            for index, stage in enumerate(stages, start=1):
                stage.order = 10000 + index
            PipelineStage.objects.bulk_update(stages, ["order"])

            ordered_stages = []
            for index, stage_id in enumerate(stage_ids, start=1):
                stage = stages_by_id[stage_id]
                stage.order = index * 10
                ordered_stages.append(stage)
            PipelineStage.objects.bulk_update(ordered_stages, ["order"])

        AuditLog.log(
            action="pipeline.stages_reordered",
            user=request.user,
            entity=job,
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(PipelineStageSerializer(ordered_stages, many=True).data)


class PipelineMoveView(views.APIView):
    permission_classes = [IsVerifiedRecruiter]

    def post(self, request, *args, **kwargs):
        serializer = PipelineMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        organization = get_recruiter_organization(request)
        application = generics.get_object_or_404(
            Application.objects.select_related("candidate", "job", "organization", "current_stage"),
            pk=serializer.validated_data["application_id"],
            organization=organization,
        )
        stage = generics.get_object_or_404(
            PipelineStage,
            pk=serializer.validated_data["stage_id"],
            job=application.job,
            is_active=True,
        )

        application = move_application_to_stage(
            application,
            stage,
            moved_by=request.user,
            notes=serializer.validated_data["notes"],
        )
        AuditLog.log(
            action="pipeline.application_moved",
            user=request.user,
            entity=application,
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(ApplicationSerializer(application).data)
