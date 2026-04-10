import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WeeklyScheduleRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "weekday",
                    models.IntegerField(
                        choices=[
                            (0, "Monday"),
                            (1, "Tuesday"),
                            (2, "Wednesday"),
                            (3, "Thursday"),
                            (4, "Friday"),
                            (5, "Saturday"),
                            (6, "Sunday"),
                        ]
                    ),
                ),
                ("is_active", models.BooleanField(default=False)),
                ("service_time", models.TimeField(blank=True, null=True)),
                ("service_label", models.CharField(blank=True, max_length=80)),
                ("effective_from", models.DateField()),
                ("effective_to", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="schedule_rules_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "weekly_schedule_rules",
                "ordering": ["weekday", "-effective_from", "-id"],
            },
        ),
        migrations.AddIndex(
            model_name="weeklyschedulerule",
            index=models.Index(fields=["weekday", "effective_from"], name="sched_weekday_from_idx"),
        ),
        migrations.AddIndex(
            model_name="weeklyschedulerule",
            index=models.Index(fields=["weekday", "effective_to"], name="sched_weekday_to_idx"),
        ),
    ]
