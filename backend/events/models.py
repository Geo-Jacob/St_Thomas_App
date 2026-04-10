from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Event(models.Model):
    class EventType(models.TextChoices):
        MASS = "MASS", "Mass"
        MEETING = "MEETING", "Meeting"
        FESTIVAL = "FESTIVAL", "Festival"
        OTHER = "OTHER", "Other"

    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=20, choices=EventType.choices, default=EventType.OTHER)
    event_date = models.DateTimeField()
    location = models.CharField(max_length=160, blank=True)
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.CharField(max_length=120, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="events_created",
        on_delete=models.CASCADE,
    )

    class Meta:
        db_table = "events"
        ordering = ["event_date"]

    def __str__(self) -> str:
        return self.title


class WeeklyScheduleRule(models.Model):
    class Weekday(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    weekday = models.IntegerField(choices=Weekday.choices)
    is_active = models.BooleanField(default=False)
    service_time = models.TimeField(null=True, blank=True)
    service_label = models.CharField(max_length=80, blank=True)
    service_slots = models.JSONField(default=list, blank=True)
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="schedule_rules_created",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "weekly_schedule_rules"
        ordering = ["weekday", "-effective_from", "-id"]
        indexes = [
            models.Index(fields=["weekday", "effective_from"], name="sched_weekday_from_idx"),
            models.Index(fields=["weekday", "effective_to"], name="sched_weekday_to_idx"),
        ]

    def clean(self):
        if self.is_active:
            has_slots = isinstance(self.service_slots, list) and len(self.service_slots) > 0
            if not has_slots and not self.service_time:
                raise ValidationError({"service_slots": "At least one service time is required when schedule is active."})
        if self.effective_to and self.effective_to < self.effective_from:
            raise ValidationError({"effective_to": "Effective end date must be on or after effective start date."})

    def __str__(self) -> str:
        status = "active" if self.is_active else "inactive"
        return f"{self.get_weekday_display()} ({status}) from {self.effective_from}"
