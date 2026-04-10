from django.db import migrations, models


def backfill_service_slots(apps, schema_editor):
    WeeklyScheduleRule = apps.get_model("events", "WeeklyScheduleRule")
    for rule in WeeklyScheduleRule.objects.all().iterator():
        if rule.service_slots:
            continue
        if rule.service_time:
            rule.service_slots = [
                {
                    "time": rule.service_time.strftime("%H:%M:%S"),
                    "label": rule.service_label or "",
                }
            ]
            rule.save(update_fields=["service_slots"])


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0002_weekly_schedule_rule"),
    ]

    operations = [
        migrations.AddField(
            model_name="weeklyschedulerule",
            name="service_slots",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(backfill_service_slots, migrations.RunPython.noop),
    ]
