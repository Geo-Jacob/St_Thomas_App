import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from common.pdf import generate_certificate_pdf, generate_qr_png


class CertificateRequest(models.Model):
    class CertificateType(models.TextChoices):
        BAPTISM = "BAPTISM", _("Baptism")
        MARRIAGE = "MARRIAGE", _("Marriage")

    class Status(models.TextChoices):
        PENDING = "PENDING", _("Pending")
        APPROVED = "APPROVED", _("Approved")
        ISSUED = "ISSUED", _("Issued")

    certificate_type = models.CharField(max_length=20, choices=CertificateType.choices)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="certificate_requests",
        on_delete=models.CASCADE,
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    applicant_name = models.CharField(max_length=150)
    notes = models.TextField(blank=True)
    approval_token = models.CharField(max_length=64, unique=True, null=True, blank=True)
    qr_payload = models.URLField(blank=True)
    qr_code = models.ImageField(upload_to="certificates/qr/", blank=True)
    pdf_file = models.FileField(upload_to="certificates/", blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="approved_certificate_requests",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    issued_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "certificate_requests"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.get_certificate_type_display()} - {self.applicant_name}"

    def approve(self, approved_by, verification_base_url: str = "") -> None:
        self.approval_token = uuid.uuid4().hex
        base_url = verification_base_url.rstrip("/")
        self.qr_payload = f"{base_url}/verify/{self.approval_token}/" if base_url else self.approval_token
        self.approved_by = approved_by
        self.status = self.Status.APPROVED

        qr_bytes = generate_qr_png(self.qr_payload)
        self.qr_code.save(
            f"qr-{self.approval_token}.png",
            ContentFile(qr_bytes),
            save=False,
        )

        pdf_context = {
            "title": f"{self.get_certificate_type_display()} Certificate",
            "member_name": self.applicant_name,
            "certificate_type": self.get_certificate_type_display(),
            "verification_code": self.approval_token,
            "qr_payload": self.qr_payload,
            "issued_on": timezone.localtime().strftime("%d %B %Y"),
            "notes": self.notes,
        }
        pdf_bytes = generate_certificate_pdf(pdf_context)
        file_name = f"{self.certificate_type.lower()}-{self.approval_token}.pdf"
        self.pdf_file.save(file_name, ContentFile(pdf_bytes), save=False)
        self.save(update_fields=[
            "approval_token",
            "qr_payload",
            "qr_code",
            "approved_by",
            "status",
            "pdf_file",
            "updated_at",
        ])

    def issue(self) -> None:
        self.status = self.Status.ISSUED
        self.issued_at = timezone.now()
        self.save(update_fields=["status", "issued_at", "updated_at"])
