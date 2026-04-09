from django.conf import settings
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import CertificateRequest
from .serializers import CertificateApprovalSerializer, CertificateRequestSerializer


class CertificateRequestViewSet(viewsets.ModelViewSet):
    serializer_class = CertificateRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return CertificateRequest.objects.all().order_by("-created_at")
        return CertificateRequest.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        certificate_request = self.get_object()
        serializer = CertificateApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        verification_base_url = serializer.validated_data.get("verification_base_url") or getattr(
            settings, "CERTIFICATE_VERIFICATION_BASE_URL", ""
        )
        certificate_request.approve(request.user, verification_base_url)
        return Response(self.get_serializer(certificate_request).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def issue(self, request, pk=None):
        certificate_request = self.get_object()
        certificate_request.issue()
        return Response(self.get_serializer(certificate_request).data)
