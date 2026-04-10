from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.contrib.postgres.indexes import GinIndex
from django.core.validators import RegexValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


phone_validator = RegexValidator(
    regex=r"^[0-9+()\-\s]{7,20}$",
    message=_("Enter a valid phone number."),
)

class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, phone_number, password, **extra_fields):
        if not phone_number:
            raise ValueError("The phone number must be set")
        phone_number = str(phone_number).strip().replace(" ", "")
        user = self.model(phone_number=phone_number, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, phone_number, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(phone_number, password, **extra_fields)

    def create_superuser(self, phone_number, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_first_login", False)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(phone_number, password, **extra_fields)


class User(AbstractUser):
    class FamilyRelation(models.TextChoices):
        FATHER = "FATHER", _("Father")
        MOTHER = "MOTHER", _("Mother")
        SPOUSE = "SPOUSE", _("Spouse")
        SON = "SON", _("Son")
        DAUGHTER = "DAUGHTER", _("Daughter")
        OTHER = "OTHER", _("Other")

    class Gender(models.TextChoices):
        MALE = "MALE", _("Male")
        FEMALE = "FEMALE", _("Female")
        OTHER = "OTHER", _("Other")

    username = None
    house_name = models.CharField(_("House name"), max_length=150, blank=True)
    family = models.ForeignKey(
        "directory.Family",
        related_name="members",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    area_ward = models.CharField(_("Area ward"), max_length=80, blank=True)
    phone_number = models.CharField(
        _("Phone number"),
        max_length=20,
        validators=[phone_validator],
        null=True,
        blank=True,
        unique=True,
        db_index=True,
    )
    date_of_birth = models.DateField(null=True, blank=True)
    relation_to_family = models.CharField(
        max_length=20,
        choices=FamilyRelation.choices,
        default=FamilyRelation.OTHER,
    )
    gender = models.CharField(max_length=10, choices=Gender.choices, default=Gender.OTHER)
    is_deceased = models.BooleanField(default=False)
    is_family_head = models.BooleanField(default=False)
    is_first_login = models.BooleanField(default=True)

    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = "users"
        verbose_name = _("Member")
        verbose_name_plural = _("Members")
        indexes = [
            models.Index(fields=["area_ward"], name="accounts_area_ward_idx"),
            GinIndex(fields=["first_name"], name="member_fname_trgm", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["last_name"], name="member_lname_trgm", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["house_name"], name="member_house_trgm", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["phone_number"], name="member_phone_trgm", opclasses=["gin_trgm_ops"]),
        ]

    def __str__(self) -> str:
        full_name = self.get_full_name().strip()
        return full_name or self.phone_number
