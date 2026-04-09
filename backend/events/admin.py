from django.contrib import admin

from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "event_date", "location", "is_recurring", "created_by")
    list_filter = ("type", "is_recurring")
    search_fields = ("title", "description", "location")
