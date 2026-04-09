from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        TrigramExtension(),
        migrations.CreateModel(
            name="Ward",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120, unique=True)),
                ("name_ml", models.CharField(blank=True, max_length=120)),
                ("code", models.CharField(max_length=30, unique=True)),
            ],
            options={
                "verbose_name": "Ward",
                "verbose_name_plural": "Wards",
                "ordering": ["name"],
                "indexes": [
                    GinIndex(fields=["name"], name="ward_name_trgm", opclasses=["gin_trgm_ops"]),
                    GinIndex(fields=["name_ml"], name="ward_name_ml_trgm", opclasses=["gin_trgm_ops"]),
                ],
            },
        ),
        migrations.CreateModel(
            name="Unit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("name_ml", models.CharField(blank=True, max_length=120)),
                ("code", models.CharField(max_length=30)),
                (
                    "ward",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="units", to="directory.ward"),
                ),
            ],
            options={
                "verbose_name": "Unit",
                "verbose_name_plural": "Units",
                "ordering": ["name"],
                "indexes": [
                    GinIndex(fields=["name"], name="unit_name_trgm", opclasses=["gin_trgm_ops"]),
                    GinIndex(fields=["name_ml"], name="unit_name_ml_trgm", opclasses=["gin_trgm_ops"]),
                ],
                "constraints": [
                    models.UniqueConstraint(fields=("ward", "name"), name="unique_unit_per_ward"),
                    models.UniqueConstraint(fields=("ward", "code"), name="unique_unit_code_per_ward"),
                ],
            },
        ),
        migrations.CreateModel(
            name="Family",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("name_ml", models.CharField(blank=True, max_length=120)),
                ("code", models.CharField(max_length=30)),
                (
                    "unit",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="families", to="directory.unit"),
                ),
            ],
            options={
                "verbose_name": "Family",
                "verbose_name_plural": "Families",
                "ordering": ["name"],
                "indexes": [
                    GinIndex(fields=["name"], name="family_name_trgm", opclasses=["gin_trgm_ops"]),
                    GinIndex(fields=["name_ml"], name="family_name_ml_trgm", opclasses=["gin_trgm_ops"]),
                ],
                "constraints": [
                    models.UniqueConstraint(fields=("unit", "name"), name="unique_family_per_unit"),
                    models.UniqueConstraint(fields=("unit", "code"), name="unique_family_code_per_unit"),
                ],
            },
        ),
    ]
