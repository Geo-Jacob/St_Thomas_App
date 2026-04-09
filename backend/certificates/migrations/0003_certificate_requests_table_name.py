from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("certificates", "0002_certificate_user_qr_code"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="certificaterequest",
            table="certificate_requests",
        ),
    ]
