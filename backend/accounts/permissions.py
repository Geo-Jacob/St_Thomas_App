from rest_framework import permissions


class EnforceFirstLoginPasswordChange(permissions.BasePermission):
    message = "Password reset required on first login."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return True

        if request.user.is_staff or request.user.is_superuser:
            return True

        if not request.user.is_first_login:
            return True

        return bool(getattr(view, "allow_first_login", False))
