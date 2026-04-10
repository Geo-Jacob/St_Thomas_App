from datetime import date, timedelta

from django.db import transaction
from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DashboardBannerImage, Event, WeeklyScheduleRule
from .serializers import (
    DashboardBannerImageSerializer,
    EventSerializer,
    ScheduleApplySerializer,
    WeeklyScheduleRuleSerializer,
    build_current_weekly_schedule,
)


class IsAdminForWriteReadForAll(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_staff)


def _parse_reference_date(value: str | None) -> date:
    if not value:
        return date.today()
    try:
        return date.fromisoformat(value)
    except ValueError:
        return date.today()


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.select_related("created_by").all().order_by("event_date")
    serializer_class = EventSerializer
    permission_classes = [IsAdminForWriteReadForAll]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        date_param = self.request.query_params.get("date")
        if date_param:
            try:
                selected_date = date.fromisoformat(date_param)
                queryset = queryset.filter(event_date__date=selected_date)
            except ValueError:
                pass
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class WeeklyScheduleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        reference_date = _parse_reference_date(request.query_params.get("date"))
        items = build_current_weekly_schedule(reference_date)
        data = {
            "reference_date": reference_date,
            "days": WeeklyScheduleRuleSerializer(items, many=True).data,
        }
        return Response(data)


class ScheduleApplyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_staff:
            return Response({"detail": "You do not have permission to perform this action."}, status=403)

        serializer = ScheduleApplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            for weekday in data["days"]:
                open_rules = WeeklyScheduleRule.objects.filter(
                    weekday=weekday,
                    effective_to__isnull=True,
                )
                open_rules = open_rules.filter(~Q(effective_from=data["effective_from"]))
                open_rules.update(effective_to=data["effective_from"] - timedelta(days=1))

                existing_same_day = WeeklyScheduleRule.objects.filter(
                    weekday=weekday,
                    effective_from=data["effective_from"],
                ).order_by("-id")

                if existing_same_day.exists():
                    current = existing_same_day.first()
                    current.is_active = data["is_active"]
                    current.service_time = data["service_time"]
                    current.service_label = data["service_label"]
                    current.service_slots = data["service_slots"]
                    current.effective_to = None
                    current.created_by = request.user
                    current.full_clean()
                    current.save(
                        update_fields=[
                            "is_active",
                            "service_time",
                            "service_label",
                            "service_slots",
                            "effective_to",
                            "created_by",
                        ]
                    )
                    existing_same_day.exclude(pk=current.pk).delete()
                    continue

                new_rule = WeeklyScheduleRule(
                    weekday=weekday,
                    is_active=data["is_active"],
                    service_time=data["service_time"],
                    service_label=data["service_label"],
                    service_slots=data["service_slots"],
                    effective_from=data["effective_from"],
                    created_by=request.user,
                )
                new_rule.full_clean()
                new_rule.save()

        reference_date = _parse_reference_date(request.data.get("effective_from"))
        items = build_current_weekly_schedule(reference_date)
        return Response(
            {
                "reference_date": reference_date,
                "days": WeeklyScheduleRuleSerializer(items, many=True).data,
            }
        )


class DashboardBannerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        images = DashboardBannerImage.objects.filter(is_active=True).order_by("sort_order", "id")
        return Response(
            {
                "images": DashboardBannerImageSerializer(images, many=True, context={"request": request}).data,
            }
        )

    def post(self, request):
        if not request.user.is_staff:
            return Response({"detail": "You do not have permission to perform this action."}, status=403)

        files = request.FILES.getlist("images")
        if not files:
            return Response({"detail": "Please upload at least one image."}, status=400)

        next_sort_order = (
            DashboardBannerImage.objects.order_by("-sort_order").values_list("sort_order", flat=True).first() or 0
        )

        created = []
        for file_obj in files:
            next_sort_order += 1
            created.append(
                DashboardBannerImage.objects.create(
                    image=file_obj,
                    sort_order=next_sort_order,
                    is_active=True,
                    created_by=request.user,
                )
            )

        return Response(
            {
                "uploaded": DashboardBannerImageSerializer(created, many=True, context={"request": request}).data,
                "images": DashboardBannerImageSerializer(
                    DashboardBannerImage.objects.filter(is_active=True).order_by("sort_order", "id"),
                    many=True,
                    context={"request": request},
                ).data,
            }
        )


class DashboardBannerItemView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, banner_id: int):
        if not request.user.is_staff:
            return Response({"detail": "You do not have permission to perform this action."}, status=403)

        deleted_count, _ = DashboardBannerImage.objects.filter(pk=banner_id).delete()
        if not deleted_count:
            return Response({"detail": "Banner image not found."}, status=404)

        return Response(
            {
                "images": DashboardBannerImageSerializer(
                    DashboardBannerImage.objects.filter(is_active=True).order_by("sort_order", "id"),
                    many=True,
                    context={"request": request},
                ).data,
            }
        )
