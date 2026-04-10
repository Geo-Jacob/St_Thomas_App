from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import EventViewSet, ScheduleApplyView, WeeklyScheduleView

router = DefaultRouter()
router.register("events", EventViewSet, basename="events")

urlpatterns = [
    path("schedule/weekly/", WeeklyScheduleView.as_view(), name="schedule-weekly"),
    path("schedule/apply/", ScheduleApplyView.as_view(), name="schedule-apply"),
    *router.urls,
]
