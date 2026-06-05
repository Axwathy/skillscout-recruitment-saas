
from django.contrib import admin

from .models import Application, Candidate, ParsedResume, Resume


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ("email", "first_name", "last_name", "organization", "created_at")
    list_filter = ("organization",)
    search_fields = ("email", "first_name", "last_name", "phone")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "candidate",
        "job",
        "organization",
        "status",
        "final_score",
        "score_calculated_at",
        "applied_at",
    )
    list_filter = ("status", "organization")
    search_fields = (
        "candidate__email",
        "candidate__first_name",
        "candidate__last_name",
        "job__title",
    )
    readonly_fields = (
        "id",
        "semantic_score",
        "skill_score",
        "experience_score",
        "final_score",
        "score_version",
        "score_calculated_at",
        "applied_at",
        "updated_at",
    )
    ordering = ("-applied_at",)


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ("file_name", "candidate", "application", "status", "created_at")
    list_filter = ("status", "mime_type")
    search_fields = (
        "file_name",
        "candidate__email",
        "candidate__first_name",
        "candidate__last_name",
    )
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(ParsedResume)
class ParsedResumeAdmin(admin.ModelAdmin):
    list_display = ("resume", "candidate", "status", "confidence", "parser_model", "parsed_at")
    list_filter = ("status", "confidence", "parser_model")
    search_fields = ("resume__file_name", "candidate__email")
    readonly_fields = ("id", "created_at", "updated_at", "parsed_at")
    ordering = ("-created_at",)
