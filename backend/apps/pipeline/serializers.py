from rest_framework import serializers

from .models import PipelineStage
from .services import next_stage_order


class PipelineStageSerializer(serializers.ModelSerializer):
    job = serializers.UUIDField(source="job_id", read_only=True)

    class Meta:
        model = PipelineStage
        fields = (
            "id",
            "job",
            "name",
            "status",
            "order",
            "color",
            "is_terminal",
            "auto_actions",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "job", "created_at", "updated_at")

    def validate_order(self, value):
        if value < 0:
            raise serializers.ValidationError("Order must be zero or greater.")
        return value

    def validate(self, attrs):
        job = self.context.get("job")
        if not job:
            return attrs

        order = attrs.get("order")
        if self.instance is None and order is None:
            attrs["order"] = next_stage_order(job)
            return attrs

        if order is not None:
            conflict = PipelineStage.objects.filter(
                job=job,
                is_active=True,
                order=order,
            )
            if self.instance is not None:
                conflict = conflict.exclude(pk=self.instance.pk)
            if conflict.exists():
                raise serializers.ValidationError(
                    {"order": "Another active stage already uses this order."}
                )

        return attrs


class PipelineMoveSerializer(serializers.Serializer):
    application_id = serializers.UUIDField()
    stage_id = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class PipelineStageReorderSerializer(serializers.Serializer):
    job_id = serializers.UUIDField()
    stage_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )
