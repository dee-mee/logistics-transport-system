from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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
    path("api/routes/", include("routes.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/documents/", include("documents.urls")),
    path("api/reports/", include("reports.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
