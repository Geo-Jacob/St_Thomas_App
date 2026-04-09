import argparse
import os
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--phone-number", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--first-name", required=True)
    parser.add_argument("--last-name", required=True)
    parser.add_argument("--email", default="")
    parser.add_argument("--house-name", default="")
    parser.add_argument("--ward-code", default="WARD-A")
    parser.add_argument("--ward-name", default="Ward A")
    parser.add_argument("--unit-code", default="U-A1")
    parser.add_argument("--unit-name", default="Unit A1")
    parser.add_argument("--family-code", default="FAM001")
    parser.add_argument("--family-name", default="Family One")
    args = parser.parse_args()

    backend_path = Path(__file__).resolve().parent
    sys.path.insert(0, str(backend_path))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "St_Thomas_app.settings")

    import django

    django.setup()

    from accounts.models import User
    from directory.models import Family, Unit, Ward

    ward, _ = Ward.objects.get_or_create(
        code=args.ward_code,
        defaults={"name": args.ward_name, "name_ml": ""},
    )
    unit, _ = Unit.objects.get_or_create(
        ward=ward,
        code=args.unit_code,
        defaults={"name": args.unit_name, "name_ml": ""},
    )
    family, _ = Family.objects.get_or_create(
        unit=unit,
        code=args.family_code,
        defaults={"name": args.family_name, "name_ml": ""},
    )

    user, created = User.objects.update_or_create(
        phone_number=args.phone_number,
        defaults={
            "first_name": args.first_name,
            "last_name": args.last_name,
            "email": args.email,
            "house_name": args.house_name,
            "family": family,
        },
    )
    user.set_password(args.password)
    user.is_first_login = True
    user.save(update_fields=["password", "is_first_login"])

    print("created" if created else "updated", user.id, user.phone_number)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
