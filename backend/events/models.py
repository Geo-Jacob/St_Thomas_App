from django.conf import settings
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
