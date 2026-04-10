from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Q, Value
from django.db.models.functions import Coalesce, Greatest
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import (
    CurrentUserSerializer,
    FirstLoginPasswordChangeSerializer,
    MemberAdminSerializer,
    MemberSerializer,
    PhoneTokenObtainPairSerializer,
)


class PhoneTokenObtainPairView(TokenObtainPairView):
    serializer_class = PhoneTokenObtainPairSerializer


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(CurrentUserSerializer(request.user).data)


class FirstLoginPasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    allow_first_login = True

    def post(self, request):
        serializer = FirstLoginPasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CurrentUserSerializer(request.user).data, status=status.HTTP_200_OK)


class IsAdminForWriteReadForAll(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_staff


class MemberViewSet(viewsets.ModelViewSet):
    queryset = (
        User.objects.select_related("family", "family__unit", "family__unit__ward")
        .filter(is_staff=False, is_superuser=False)
        .order_by("first_name")
    )
    permission_classes = [IsAdminForWriteReadForAll]

    def get_serializer_class(self):
        if self.request.method in permissions.SAFE_METHODS:
            return MemberSerializer
        if self.request.user.is_staff:
            return MemberAdminSerializer
        return MemberSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        ward_id = params.get("ward")
        unit_id = params.get("unit")
        family_id = params.get("family")
        search_term = (params.get("search") or "").strip()

        if ward_id:
            queryset = queryset.filter(family__unit__ward_id=ward_id)
        if unit_id:
            queryset = queryset.filter(family__unit_id=unit_id)
        if family_id:
            queryset = queryset.filter(family_id=family_id)

        if search_term:
            search_match = Q(first_name__icontains=search_term)
            search_match |= Q(last_name__icontains=search_term)
            search_match |= Q(house_name__icontains=search_term)
            search_match |= Q(phone_number__icontains=search_term)
            search_match |= Q(family__name__icontains=search_term)
            search_match |= Q(family__name_ml__icontains=search_term)
            search_match |= Q(family__unit__name__icontains=search_term)
            search_match |= Q(family__unit__name_ml__icontains=search_term)
            search_match |= Q(family__unit__ward__name__icontains=search_term)
            search_match |= Q(family__unit__ward__name_ml__icontains=search_term)

            matching_family_ids = list(
                queryset.filter(search_match, family_id__isnull=False)
                .values_list("family_id", flat=True)
                .distinct()
            )
            matching_member_ids = list(
                queryset.filter(search_match, family_id__isnull=True).values_list("id", flat=True).distinct()
            )

            queryset = queryset.filter(Q(family_id__in=matching_family_ids) | Q(id__in=matching_member_ids))

            queryset = queryset.annotate(
                similarity=Greatest(
                    TrigramSimilarity("first_name", search_term),
                    TrigramSimilarity("last_name", search_term),
                    TrigramSimilarity("house_name", search_term),
                    TrigramSimilarity("phone_number", search_term),
                    Coalesce(TrigramSimilarity("family__name", search_term), Value(0.0)),
                    Coalesce(TrigramSimilarity("family__unit__name", search_term), Value(0.0)),
                    Coalesce(TrigramSimilarity("family__unit__ward__name", search_term), Value(0.0)),
                    Coalesce(TrigramSimilarity("family__name_ml", search_term), Value(0.0)),
                    Coalesce(TrigramSimilarity("family__unit__name_ml", search_term), Value(0.0)),
                    Coalesce(TrigramSimilarity("family__unit__ward__name_ml", search_term), Value(0.0)),
                )
            ).order_by("family_id", "-similarity", "first_name", "last_name")

        return queryset

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        return Response(CurrentUserSerializer(request.user).data)
