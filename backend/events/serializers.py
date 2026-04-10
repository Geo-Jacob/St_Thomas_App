from datetime import date

from django.db.models import Q
from rest_framework import serializers

from .models import DashboardBanner, DashboardBannerImage, Event, WeeklyScheduleRule


WEEKDAY_KEYS = {
    0: "monday",
    1: "tuesday",
    2: "wednesday",
    3: "thursday",
    4: "friday",
    5: "saturday",
    6: "sunday",
}


class WeeklyScheduleRuleSerializer(serializers.ModelSerializer):
    weekday_name = serializers.CharField(source="get_weekday_display", read_only=True)
    weekday_key = serializers.SerializerMethodField()
    service_slots = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyScheduleRule
        fields = (
            "id",
            "weekday",
            "weekday_name",
            "weekday_key",
            "is_active",
            "service_time",
            "service_label",
            "service_slots",
            "effective_from",
            "effective_to",
        )

    def get_weekday_key(self, obj: WeeklyScheduleRule) -> str:
        return WEEKDAY_KEYS.get(obj.weekday, "")

    def get_service_slots(self, obj: WeeklyScheduleRule):
        if isinstance(obj.service_slots, list) and obj.service_slots:
            return obj.service_slots
        if obj.service_time:
            return [
                {
                    "time": obj.service_time.strftime("%H:%M:%S"),
                    "label": obj.service_label or "",
                }
            ]
        return []


class ScheduleSlotInputSerializer(serializers.Serializer):
    time = serializers.TimeField()
    label = serializers.CharField(required=False, allow_blank=True, max_length=80)


class ScheduleApplySerializer(serializers.Serializer):
    days = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=6),
        allow_empty=False,
    )
    is_active = serializers.BooleanField()
    service_time = serializers.TimeField(required=False, allow_null=True)
    service_label = serializers.CharField(required=False, allow_blank=True, max_length=80)
    service_slots = ScheduleSlotInputSerializer(many=True, required=False)
    effective_from = serializers.DateField(required=False)

    def validate_days(self, value):
        unique_days = sorted(set(value))
        if not unique_days:
            raise serializers.ValidationError("Please select at least one day.")
        return unique_days

    def validate(self, attrs):
        is_active = attrs.get("is_active")
        slots = attrs.get("service_slots") or []
        service_time = attrs.get("service_time")

        normalized_slots = []
        first_slot_time_obj = None
        for slot in slots:
            if first_slot_time_obj is None:
                first_slot_time_obj = slot["time"]
            normalized_slots.append(
                {
                    "time": slot["time"].strftime("%H:%M:%S"),
                    "label": (slot.get("label") or "").strip(),
                }
            )

        if not normalized_slots and service_time:
            normalized_slots.append(
                {
                    "time": service_time.strftime("%H:%M:%S"),
                    "label": (attrs.get("service_label") or "").strip(),
                }
            )

        if is_active and not normalized_slots:
            raise serializers.ValidationError({"service_slots": "At least one service time is required when day is enabled."})

        if not is_active:
            attrs["service_time"] = None
            attrs["service_slots"] = []
        else:
            attrs["service_slots"] = normalized_slots
            attrs["service_time"] = first_slot_time_obj or service_time
            attrs["service_label"] = normalized_slots[0]["label"] if normalized_slots else ""
        attrs["effective_from"] = attrs.get("effective_from") or date.today()
        return attrs


class WeeklyScheduleResponseSerializer(serializers.Serializer):
    reference_date = serializers.DateField()
    days = WeeklyScheduleRuleSerializer(many=True)


class EventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = Event
        fields = (
            "id",
            "title",
            "description",
            "type",
            "event_date",
            "location",
            "is_recurring",
            "recurrence_rule",
            "created_by",
            "created_by_name",
        )
        read_only_fields = ("created_by",)


class DashboardBannerSerializer(serializers.ModelSerializer):
    banner_one_url = serializers.SerializerMethodField()
    banner_two_url = serializers.SerializerMethodField()

    class Meta:
        model = DashboardBanner
        fields = (
            "id",
            "banner_one",
            "banner_two",
            "banner_one_url",
            "banner_two_url",
            "updated_at",
        )
        read_only_fields = ("id", "banner_one_url", "banner_two_url", "updated_at")

    def get_banner_one_url(self, obj: DashboardBanner):
        request = self.context.get("request")
        if not obj.banner_one:
            return ""
        url = obj.banner_one.url
        return request.build_absolute_uri(url) if request else url

    def get_banner_two_url(self, obj: DashboardBanner):
        request = self.context.get("request")
        if not obj.banner_two:
            return ""
        url = obj.banner_two.url
        return request.build_absolute_uri(url) if request else url


class DashboardBannerImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = DashboardBannerImage
        fields = ("id", "image_url", "sort_order")

    def get_image_url(self, obj: DashboardBannerImage):
        request = self.context.get("request")
        if not obj.image:
            return ""
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url



def build_current_weekly_schedule(reference_date: date):
    entries = []
    for weekday in range(7):
        rule = (
            WeeklyScheduleRule.objects.filter(
                weekday=weekday,
                effective_from__lte=reference_date,
            )
            .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=reference_date))
            .order_by("-effective_from", "-id")
            .first()
        )

        if rule:
            entries.append(rule)
            continue

        entries.append(
            WeeklyScheduleRule(
                weekday=weekday,
                is_active=False,
                service_time=None,
                service_label="",
                effective_from=reference_date,
                effective_to=None,
            )
        )

    return entries
