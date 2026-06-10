
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from pgvector.django import HnswIndex, VectorField


class Job(models.Model):
    class EmploymentType(models.TextChoices):
        FULL_TIME = "full_time", "Full Time"
        PART_TIME = "part_time", "Part Time"
        CONTRACT = "contract", "Contract"
        INTERNSHIP = "internship", "Internship"

    class RemotePolicy(models.TextChoices):
        ONSITE = "onsite", "On-site"
        HYBRID = "hybrid", "Hybrid"
        REMOTE = "remote", "Remote"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        CLOSED = "closed", "Closed"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="jobs",
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField()
    requirements = models.TextField()
    location = models.CharField(max_length=255)
    department = models.CharField(max_length=150, blank=True)
    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME,
    )
    remote_policy = models.CharField(
        max_length=20,
        choices=RemotePolicy.choices,
        default=RemotePolicy.ONSITE,
        blank=True,
    )
    salary_range = models.CharField(max_length=120, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_jobs",
    )
    published_at = models.DateTimeField(null=True, blank=True)
    embedding = VectorField(dimensions=384, null=True, blank=True)
    embedding_model = models.CharField(max_length=100, blank=True)
    embedding_text_hash = models.CharField(max_length=64, blank=True, db_index=True)
    embedding_generated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["organization", "department"]),
            HnswIndex(
                fields=["embedding"],
                name="jobs_job_embedding_hnsw",
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._build_unique_slug()
        super().save(*args, **kwargs)

    def _build_unique_slug(self) -> str:
        org_part = self.organization.slug if self.organization_id else "job"
        base_slug = slugify(f"{self.title}-{org_part}")[:250] or str(self.id)
        slug = base_slug
        counter = 1
        while Job.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    def publish(self) -> None:
        self.status = self.Status.PUBLISHED
        if not self.published_at:
            self.published_at = timezone.now()
        self.save(update_fields=["status", "published_at", "updated_at"])

    def unpublish(self) -> None:
        self.status = self.Status.DRAFT
        self.save(update_fields=["status", "updated_at"])

    def close(self) -> None:
        self.status = self.Status.CLOSED
        self.save(update_fields=["status", "updated_at"])

    def archive(self) -> None:
        self.status = self.Status.ARCHIVED
        self.save(update_fields=["status", "updated_at"])
