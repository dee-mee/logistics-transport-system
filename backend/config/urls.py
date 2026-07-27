from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/organizations/", include("organizations.urls")),
    path("api/permissions/", include("permissions.urls")),
    path("api/fleet/", include("fleet.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/dispatch/", include("dispatch.urls")),
    path("api/tracking/", include("tracking.urls")),
    path("api/fuel/", include("fuel.urls")),
    path("api/dashboard/", include("dashboard.urls")),
]
