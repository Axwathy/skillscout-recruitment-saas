from rest_framework import serializers

from .models import Job


class JobSerializer(serializers.ModelSerializer):
    application_count = serializers.SerializerMethodField()
    has_embedding = serializers.SerializerMethodField()
    organization = serializers.UUIDField(source="organization_id", read_only=True)
    created_by = serializers.UUIDField(source="created_by_id", read_only=True)

    class Meta:
        model = Job
        fields = (
            "id",
            "organization",
            "title",
            "slug",
            "description",
            "requirements",
            "location",
            "department",
            "employment_type",
            "remote_policy",
            "salary_range",
            "status",
            "created_by",
            "application_count",
            "has_embedding",
            "embedding_model",
            "embedding_generated_at",
            "published_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "organization",
            "slug",
            "created_by",
            "application_count",
            "has_embedding",
            "embedding_model",
            "embedding_generated_at",
            "published_at",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        status = attrs.get("status")
        if status == Job.Status.PUBLISHED:
            self._validate_publishable(attrs)
        return attrs

    def get_application_count(self, obj) -> int:
        annotated_count = getattr(obj, "application_count", None)
        if annotated_count is not None:
            return annotated_count
        if obj.pk:
            return obj.applications.count()
        return 0

    def get_has_embedding(self, obj) -> bool:
        return obj.embedding is not None

    def _validate_publishable(self, attrs):
        instance = self.instance
        required_fields = ("title", "description", "requirements", "location")
        missing_fields = []
        for field in required_fields:
            value = attrs.get(field, getattr(instance, field, None))
            if not value:
                missing_fields.append(field)

        if missing_fields:
            raise serializers.ValidationError(
                {"status": f"Cannot publish job with missing fields: {', '.join(missing_fields)}"}
            )


class PublicJobSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)

    class Meta:
        model = Job
        fields = (
            "id",
            "title",
            "slug",
            "organization_name",
            "description",
            "requirements",
            "location",
            "department",
            "employment_type",
            "remote_policy",
            "salary_range",
            "published_at",
            "created_at",
        )

        read_only_fields = (
            "id",
            "organization",
            "slug",
            "created_by",
            "application_count",
            "published_at",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        status = attrs.get("status")
        if status == Job.Status.PUBLISHED:
            self._validate_publishable(attrs)
        return attrs

    def get_application_count(self, obj) -> int:
        annotated_count = getattr(obj, "application_count", None)
        if annotated_count is not None:
            return annotated_count
        if obj.pk:
            return obj.applications.count()
        return 0

    def _validate_publishable(self, attrs):
        instance = self.instance
        required_fields = ("title", "description", "requirements", "location")
        missing_fields = []
        for field in required_fields:
            value = attrs.get(field, getattr(instance, field, None))
            if not value:
                missing_fields.append(field)

        if missing_fields:
            raise serializers.ValidationError(
                {"status": f"Cannot publish job with missing fields: {', '.join(missing_fields)}"}
            )
