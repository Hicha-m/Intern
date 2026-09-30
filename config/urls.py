from django.contrib import admin
from django.urls import include, path

from jobboard.api.health import live, ready

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("jobboard.api.auth")),
    path("api/v1/", include("jobboard.api.catalogue")),
    path("api/v1/", include("jobboard.api.profiles")),
    path("api/v1/", include("jobboard.api.applications")),
    path("api/v1/", include("jobboard.api.accounts")),
    path("health/live/", live),
    path("health/ready/", ready),
]
handler404 = "jobboard.api.core.not_found"
handler500 = "jobboard.api.core.server_error"
