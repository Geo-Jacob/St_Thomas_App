"""Seed test data for St Thomas App."""

import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "St_Thomas_app.settings")
django.setup()

from accounts.models import User
from directory.models import Family, Unit, Ward

DEFAULT_PASSWORD = os.getenv("SEED_DEFAULT_PASSWORD", "testpass123")

ward_a, _ = Ward.objects.get_or_create(code="WARD-A", defaults={"name": "Ward A", "name_ml": "വാർഡ് A"})
ward_b, _ = Ward.objects.get_or_create(code="WARD-B", defaults={"name": "Ward B", "name_ml": "വാർഡ് B"})

unit_a1, _ = Unit.objects.get_or_create(ward=ward_a, code="U-A1", defaults={"name": "Unit A1", "name_ml": "യൂണിറ്റ് A1"})
unit_b1, _ = Unit.objects.get_or_create(ward=ward_b, code="U-B1", defaults={"name": "Unit B1", "name_ml": "യൂണിറ്റ് B1"})

family_1, _ = Family.objects.get_or_create(unit=unit_a1, code="FAM001", defaults={"name": "Doe Family", "name_ml": "ഡോ കുടുംബം"})
family_2, _ = Family.objects.get_or_create(unit=unit_b1, code="FAM002", defaults={"name": "Smith Family", "name_ml": "സ്മിത്ത് കുടുംബം"})

members = [
    {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "house_name": "Saint Johns House",
        "family": family_1,
        "phone_number": "+919876543210",
    },
    {
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane@example.com",
        "house_name": "Saint Marys House",
        "family": family_2,
        "phone_number": "+919876543211",
    },
]

for member_data in members:
    if not User.objects.filter(phone_number=member_data["phone_number"]).exists():
        User.objects.create_user(password=DEFAULT_PASSWORD, **member_data)
        print(f"Created {member_data['first_name']} {member_data['last_name']}")
    else:
        print(f"Skipped {member_data['first_name']} {member_data['last_name']} (already exists)")

print("Seed data ready.")
