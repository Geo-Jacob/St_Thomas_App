"""ASGI config for ecclesia project."""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "St_Thomas_app.settings")

application = get_asgi_application()
