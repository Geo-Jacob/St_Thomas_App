from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0001_initial"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="family",
            table="families",
        ),
    ]
