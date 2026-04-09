from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = (
        (None, {"fields": ("phone_number", "password")}),
        (
            "Personal info",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "email",
                    "house_name",
                    "family",
                    "area_ward",
                    "date_of_birth",
                    "relation_to_family",
                    "is_deceased",
                    "is_family_head",
                )
            },
        ),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
        ("Security", {"fields": ("is_first_login",)}),
    )
    ordering = ("phone_number",)
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("phone_number", "password1", "password2", "is_staff", "is_superuser"),
            },
        ),
    )
    list_display = (
        "phone_number",
        "get_full_name",
        "family",
        "relation_to_family",
        "is_family_head",
        "is_deceased",
        "area_ward",
        "is_first_login",
        "is_staff",
    )
    search_fields = (
        "phone_number",
        "first_name",
        "last_name",
        "family__name",
        "house_name",
        "area_ward",
    )
