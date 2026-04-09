from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_member_search_indexes"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="user",
            table="users",
        ),
    ]
