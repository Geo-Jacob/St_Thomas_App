import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Event",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=160)),
                ("description", models.TextField(blank=True)),
                ("type", models.CharField(choices=[("MASS", "Mass"), ("MEETING", "Meeting"), ("FESTIVAL", "Festival"), ("OTHER", "Other")], default="OTHER", max_length=20)),
                ("event_date", models.DateTimeField()),
                ("location", models.CharField(blank=True, max_length=160)),
                ("is_recurring", models.BooleanField(default=False)),
                ("recurrence_rule", models.CharField(blank=True, max_length=120)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events_created", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "events",
                "ordering": ["event_date"],
            },
        ),
    ]
