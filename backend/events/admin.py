from django.contrib import admin

from .models import DashboardBanner, DashboardBannerImage, Event, WeeklyScheduleRule


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "event_date", "location", "is_recurring", "created_by")
    list_filter = ("type", "is_recurring")
    search_fields = ("title", "description", "location")


@admin.register(WeeklyScheduleRule)
class WeeklyScheduleRuleAdmin(admin.ModelAdmin):
    list_display = ("weekday", "is_active", "service_time", "effective_from", "effective_to", "created_by")
    list_filter = ("weekday", "is_active")
    search_fields = ("service_label",)


@admin.register(DashboardBanner)
class DashboardBannerAdmin(admin.ModelAdmin):
    list_display = ("id", "updated_by", "updated_at")


@admin.register(DashboardBannerImage)
class DashboardBannerImageAdmin(admin.ModelAdmin):
    list_display = ("id", "sort_order", "is_active", "created_by", "created_at")
    list_filter = ("is_active",)
    ordering = ("sort_order", "id")
