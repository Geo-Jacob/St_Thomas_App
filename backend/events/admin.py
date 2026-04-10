from django.contrib import admin

from .models import Event, WeeklyScheduleRule


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
