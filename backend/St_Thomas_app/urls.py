from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView


def api_home(request):
    return JsonResponse(
        {
            "app": "St Thomas App Backend",
            "status": "running",
            "admin": "/admin/",
            "auth_login": "/api/auth/login/",
            "auth_refresh": "/api/auth/refresh/",
            "members": "/api/members/",
            "wards": "/api/wards/",
            "units": "/api/units/",
            "families": "/api/families/",
            "certificates": "/api/certificates/",
        }
    )

urlpatterns = [
    path("", api_home, name="api-home"),
    path("admin/", admin.site.urls),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/", include("accounts.urls")),
    path("api/", include("directory.urls")),
    path("api/certificates/", include("certificates.urls")),
]
