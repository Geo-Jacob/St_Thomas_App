from django.contrib import admin

from .models import CertificateRequest


@admin.register(CertificateRequest)
class CertificateRequestAdmin(admin.ModelAdmin):
    list_display = ("applicant_name", "certificate_type", "status", "user", "approved_by", "created_at")
    list_filter = ("certificate_type", "status", "created_at")
    search_fields = ("applicant_name", "approval_token", "user__phone_number", "user__first_name")
