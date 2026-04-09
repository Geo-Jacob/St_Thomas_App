from rest_framework import serializers

from .models import CertificateRequest


class CertificateRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateRequest
        fields = (
            "id",
            "certificate_type",
            "user",
            "applicant_name",
            "notes",
            "status",
            "approval_token",
            "qr_payload",
            "qr_code",
            "pdf_file",
            "created_at",
            "updated_at",
            "issued_at",
        )
        read_only_fields = (
            "user",
            "status",
            "approval_token",
            "qr_payload",
            "qr_code",
            "pdf_file",
            "created_at",
            "updated_at",
            "issued_at",
        )


class CertificateApprovalSerializer(serializers.Serializer):
    verification_base_url = serializers.URLField(required=False, allow_blank=True)
