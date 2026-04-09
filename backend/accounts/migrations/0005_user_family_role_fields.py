from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_users_table_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="date_of_birth",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="is_deceased",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="is_family_head",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="relation_to_family",
            field=models.CharField(
                choices=[
                    ("FATHER", "Father"),
                    ("MOTHER", "Mother"),
                    ("SON", "Son"),
                    ("DAUGHTER", "Daughter"),
                    ("OTHER", "Other"),
                ],
                default="OTHER",
                max_length=20,
            ),
        ),
    ]
