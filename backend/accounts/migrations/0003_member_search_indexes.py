from django.contrib.postgres.indexes import GinIndex
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_user_hierarchy_phone_login"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="user",
            index=GinIndex(fields=["first_name"], name="member_fname_trgm", opclasses=["gin_trgm_ops"]),
        ),
        migrations.AddIndex(
            model_name="user",
            index=GinIndex(fields=["last_name"], name="member_lname_trgm", opclasses=["gin_trgm_ops"]),
        ),
        migrations.AddIndex(
            model_name="user",
            index=GinIndex(fields=["house_name"], name="member_house_trgm", opclasses=["gin_trgm_ops"]),
        ),
        migrations.AddIndex(
            model_name="user",
            index=GinIndex(fields=["phone_number"], name="member_phone_trgm", opclasses=["gin_trgm_ops"]),
        ),
    ]
