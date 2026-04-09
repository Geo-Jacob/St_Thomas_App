from django.conf import settings
from django.db import models


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        INFO = "INFO", "Info"
        CERTIFICATE = "CERTIFICATE", "Certificate"
        REMINDER = "REMINDER", "Reminder"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="notifications",
        on_delete=models.CASCADE,
    )
    type = models.CharField(max_length=30, choices=NotificationType.choices, default=NotificationType.INFO)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user_id} - {self.type}"
