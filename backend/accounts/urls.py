from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CurrentUserView,
    FirstLoginPasswordChangeView,
    MemberViewSet,
    PhoneTokenObtainPairView,
)

router = DefaultRouter()
router.register(r"members", MemberViewSet, basename="members")

urlpatterns = [
    path("auth/login/", PhoneTokenObtainPairView.as_view(), name="auth-login"),
    path("auth/me/", CurrentUserView.as_view(), name="auth-me"),
    path(
        "auth/first-login-password/",
        FirstLoginPasswordChangeView.as_view(),
        name="auth-first-login-password",
    ),
    *router.urls,
]
