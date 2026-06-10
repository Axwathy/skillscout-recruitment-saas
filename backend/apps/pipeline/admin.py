from django.contrib import admin

from .models import PipelineStage, PipelineStageHistory


@admin.register(PipelineStage)
class PipelineStageAdmin(admin.ModelAdmin):
    list_display = ("name", "job", "status", "order", "color", "is_terminal", "is_active")
    list_filter = ("status", "is_terminal", "is_active")
    search_fields = ("name", "job__title")
    ordering = ("job", "order")


@admin.register(PipelineStageHistory)
class PipelineStageHistoryAdmin(admin.ModelAdmin):
    list_display = ("application", "from_stage", "to_stage", "moved_by", "moved_at")
    list_filter = ("moved_at",)
    search_fields = ("application__candidate__email", "application__job__title")
    readonly_fields = ("application", "from_stage", "to_stage", "moved_by", "notes", "moved_at")
