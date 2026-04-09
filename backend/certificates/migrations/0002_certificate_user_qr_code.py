import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("certificates", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RenameField(
            model_name="certificaterequest",
            old_name="member",
            new_name="user",
        ),
        migrations.AlterField(
            model_name="certificaterequest",
            name="user",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="certificate_requests", to=settings.AUTH_USER_MODEL),
        ),
        migrations.RemoveField(
            model_name="certificaterequest",
            name="requested_by",
        ),
        migrations.AddField(
            model_name="certificaterequest",
            name="qr_code",
            field=models.ImageField(blank=True, upload_to="certificates/qr/"),
        ),
    ]
