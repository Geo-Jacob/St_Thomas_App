from rest_framework import serializers

from .models import Family, Unit, Ward


class WardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ward
        fields = ("id", "name", "name_ml", "code")


class UnitSerializer(serializers.ModelSerializer):
    ward_name = serializers.CharField(source="ward.name", read_only=True)

    class Meta:
        model = Unit
        fields = ("id", "ward", "ward_name", "name", "name_ml", "code")


class FamilySerializer(serializers.ModelSerializer):
    unit_name = serializers.CharField(source="unit.name", read_only=True)
    ward = serializers.IntegerField(source="unit.ward_id", read_only=True)
    ward_name = serializers.CharField(source="unit.ward.name", read_only=True)

    class Meta:
        model = Family
        fields = ("id", "unit", "unit_name", "ward", "ward_name", "name", "name_ml", "code")
