from django.contrib import admin

from .models import Family, Unit, Ward


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = ("name", "name_ml", "code")
    search_fields = ("name", "name_ml", "code")


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ("name", "name_ml", "code", "ward")
    list_filter = ("ward",)
    search_fields = ("name", "name_ml", "code", "ward__name")


@admin.register(Family)
class FamilyAdmin(admin.ModelAdmin):
    list_display = ("name", "name_ml", "code", "unit")
    list_filter = ("unit__ward", "unit")
    search_fields = ("name", "name_ml", "code", "unit__name", "unit__ward__name")
