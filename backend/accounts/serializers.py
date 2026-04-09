from django.contrib.auth import password_validation
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class PhoneTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "phone_number"

    @staticmethod
    def _phone_variants(raw_phone: str) -> list[str]:
        cleaned = (raw_phone or "").strip()
        digits = "".join(ch for ch in cleaned if ch.isdigit())
        variants = [cleaned]

        if cleaned.startswith("+") and cleaned[1:]:
            variants.append(cleaned[1:])
        if digits:
            variants.append(digits)
            variants.append(f"+{digits}")

        seen = set()
        unique = []
        for value in variants:
            if value and value not in seen:
                unique.append(value)
                seen.add(value)
        return unique

    def validate(self, attrs):
        incoming_phone = attrs.get(self.username_field, "")
        last_error = None

        for candidate in self._phone_variants(incoming_phone):
            try:
                attempt_attrs = {**attrs, self.username_field: candidate}
                data = super().validate(attempt_attrs)
                data["is_first_login"] = self.user.is_first_login
                data["user"] = CurrentUserSerializer(self.user).data
                return data
            except serializers.ValidationError as exc:
                last_error = exc

        if last_error is not None:
            raise last_error

        data = super().validate(attrs)
        data["is_first_login"] = self.user.is_first_login
        data["user"] = CurrentUserSerializer(self.user).data
        return data


class CurrentUserSerializer(serializers.ModelSerializer):
    ward = serializers.SerializerMethodField()
    unit = serializers.SerializerMethodField()
    family_name = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "display_name",
            "first_name",
            "last_name",
            "phone_number",
            "house_name",
            "date_of_birth",
            "relation_to_family",
            "is_deceased",
            "is_family_head",
            "area_ward",
            "family",
            "family_name",
            "unit",
            "ward",
            "is_first_login",
            "is_staff",
        )

    def get_display_name(self, obj: User) -> str:
        return obj.get_full_name().strip() or obj.phone_number

    def get_family_name(self, obj: User):
        return obj.family.name if obj.family else ""

    def get_unit(self, obj: User):
        return obj.family.unit.name if obj.family and obj.family.unit else ""

    def get_ward(self, obj: User):
        if obj.family and obj.family.unit and obj.family.unit.ward:
            return obj.family.unit.ward.name
        return obj.area_ward


class FirstLoginPasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    default_error_messages = {
        "invalid_password": _("Current password is incorrect."),
    }

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            self.fail("invalid_password")
        return value

    def validate_new_password(self, value):
        user = self.context["request"].user
        password_validation.validate_password(value, user=user)
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.is_first_login = False
        user.save(update_fields=["password", "is_first_login"])
        return user


class MemberSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    family_name = serializers.SerializerMethodField()
    family_code = serializers.SerializerMethodField()
    unit_name = serializers.SerializerMethodField()
    unit_code = serializers.SerializerMethodField()
    ward_name = serializers.SerializerMethodField()
    ward_code = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "display_name",
            "first_name",
            "last_name",
            "house_name",
            "phone_number",
            "date_of_birth",
            "relation_to_family",
            "family",
            "family_name",
            "family_code",
            "unit_name",
            "unit_code",
            "ward_name",
            "ward_code",
        )

    def get_display_name(self, obj: User) -> str:
        return obj.get_full_name().strip() or obj.phone_number

    def get_family_name(self, obj: User):
        return obj.family.name if obj.family else ""

    def get_family_code(self, obj: User):
        return obj.family.code if obj.family else ""

    def get_unit_name(self, obj: User):
        return obj.family.unit.name if obj.family and obj.family.unit else ""

    def get_unit_code(self, obj: User):
        return obj.family.unit.code if obj.family and obj.family.unit else ""

    def get_ward_name(self, obj: User):
        if obj.family and obj.family.unit and obj.family.unit.ward:
            return obj.family.unit.ward.name
        return obj.area_ward

    def get_ward_code(self, obj: User):
        if obj.family and obj.family.unit and obj.family.unit.ward:
            return obj.family.unit.ward.code
        return ""


class MemberAdminSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "house_name",
            "family",
            "date_of_birth",
            "relation_to_family",
            "is_deceased",
            "is_family_head",
            "area_ward",
            "phone_number",
            "password",
            "is_active",
            "is_staff",
            "is_first_login",
        )

    def _enforce_family_head_rules(self, user: User) -> None:
        if not user.family_id:
            return

        family_members = User.objects.filter(
            family_id=user.family_id,
            is_staff=False,
            is_superuser=False,
        )
        father = family_members.filter(relation_to_family=User.FamilyRelation.FATHER).order_by("id").first()
        mother = family_members.filter(relation_to_family=User.FamilyRelation.MOTHER).order_by("id").first()

        if father and not father.is_deceased:
            family_members.update(is_family_head=False)
            User.objects.filter(pk=father.pk).update(is_family_head=True)
            return

        if mother and not mother.is_deceased:
            family_members.update(is_family_head=False)
            User.objects.filter(pk=mother.pk).update(is_family_head=True)
            return

        if user.is_family_head:
            family_members.exclude(pk=user.pk).update(is_family_head=False)

    @transaction.atomic
    def create(self, validated_data):
        raw_password = validated_data.pop("password", "")
        user = super().create(validated_data)
        if not raw_password:
            raw_password = user.phone_number
        if raw_password:
            user.set_password(raw_password)
            user.save(update_fields=["password"])
        self._enforce_family_head_rules(user)
        user.refresh_from_db()
        return user

    @transaction.atomic
    def update(self, instance, validated_data):
        raw_password = validated_data.pop("password", "")
        user = super().update(instance, validated_data)
        if raw_password:
            user.set_password(raw_password)
            user.save(update_fields=["password"])
        self._enforce_family_head_rules(user)
        user.refresh_from_db()
        return user
