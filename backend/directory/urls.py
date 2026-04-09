from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FamilyViewSet, UnitViewSet, WardViewSet

router = DefaultRouter()
router.register("wards", WardViewSet, basename="wards")
router.register("units", UnitViewSet, basename="units")
router.register("families", FamilyViewSet, basename="families")

urlpatterns = [
    path("", include(router.urls)),
]
