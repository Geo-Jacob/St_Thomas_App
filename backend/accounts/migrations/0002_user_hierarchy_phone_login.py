from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("directory", "0001_initial"),
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="username",
        ),
        migrations.RemoveField(
            model_name="user",
            name="family_id",
        ),
        migrations.AddField(
            model_name="user",
            name="family",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="members", to="directory.family"),
        ),
        migrations.AddField(
            model_name="user",
            name="is_first_login",
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name="user",
            name="phone_number",
            field=models.CharField(db_index=True, max_length=20, unique=True, verbose_name="Phone number"),
        ),
        migrations.AlterField(
            model_name="user",
            name="area_ward",
            field=models.CharField(blank=True, max_length=80, verbose_name="Area ward"),
        ),
    ]
