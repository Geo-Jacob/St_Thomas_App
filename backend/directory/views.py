from rest_framework import permissions, viewsets

from .models import Family, Unit, Ward
from .serializers import FamilySerializer, UnitSerializer, WardSerializer


class IsAdminForWriteReadForAll(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_staff


class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.all().order_by("name")
    serializer_class = WardSerializer
    permission_classes = [IsAdminForWriteReadForAll]
    pagination_class = None


class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.select_related("ward").all().order_by("name")
    serializer_class = UnitSerializer
    permission_classes = [IsAdminForWriteReadForAll]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        ward_id = self.request.query_params.get("ward")
        if ward_id:
            queryset = queryset.filter(ward_id=ward_id)
        return queryset


class FamilyViewSet(viewsets.ModelViewSet):
    queryset = Family.objects.select_related("unit", "unit__ward").all().order_by("name")
    serializer_class = FamilySerializer
    permission_classes = [IsAdminForWriteReadForAll]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        ward_id = self.request.query_params.get("ward")
        unit_id = self.request.query_params.get("unit")
        if ward_id:
            queryset = queryset.filter(unit__ward_id=ward_id)
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        return queryset
