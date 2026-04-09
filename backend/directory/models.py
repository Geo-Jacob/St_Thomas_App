from django.contrib.postgres.indexes import GinIndex
from django.db import models
from django.utils.translation import gettext_lazy as _


class Ward(models.Model):
    name = models.CharField(max_length=120, unique=True)
    name_ml = models.CharField(max_length=120, blank=True)
    code = models.CharField(max_length=30, unique=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            GinIndex(fields=["name"], name="ward_name_trgm", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["name_ml"], name="ward_name_ml_trgm", opclasses=["gin_trgm_ops"]),
        ]
        verbose_name = _("Ward")
        verbose_name_plural = _("Wards")

    def __str__(self):
        return self.name


class Unit(models.Model):
    ward = models.ForeignKey(Ward, related_name="units", on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    name_ml = models.CharField(max_length=120, blank=True)
    code = models.CharField(max_length=30)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["ward", "name"], name="unique_unit_per_ward"),
            models.UniqueConstraint(fields=["ward", "code"], name="unique_unit_code_per_ward"),
        ]
        indexes = [
            GinIndex(fields=["name"], name="unit_name_trgm", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["name_ml"], name="unit_name_ml_trgm", opclasses=["gin_trgm_ops"]),
        ]
        verbose_name = _("Unit")
        verbose_name_plural = _("Units")

    def __str__(self):
        return f"{self.ward.name} - {self.name}"


class Family(models.Model):
    unit = models.ForeignKey(Unit, related_name="families", on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    name_ml = models.CharField(max_length=120, blank=True)
    code = models.CharField(max_length=30)

    class Meta:
        db_table = "families"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["unit", "name"], name="unique_family_per_unit"),
            models.UniqueConstraint(fields=["unit", "code"], name="unique_family_code_per_unit"),
        ]
        indexes = [
            GinIndex(fields=["name"], name="family_name_trgm", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["name_ml"], name="family_name_ml_trgm", opclasses=["gin_trgm_ops"]),
        ]
        verbose_name = _("Family")
        verbose_name_plural = _("Families")

    def __str__(self):
        return f"{self.unit.ward.name} - {self.unit.name} - {self.name}"
