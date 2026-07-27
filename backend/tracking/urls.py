from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ShipmentStatusEventViewSet, VehicleLocationPingViewSet, PublicShipmentTrackingView

router = DefaultRouter()
router.register("status-events", ShipmentStatusEventViewSet)
router.register("location-pings", VehicleLocationPingViewSet)

urlpatterns = [
    path("track/<str:tracking_code>/", PublicShipmentTrackingView.as_view(), name="public-tracking"),
] + router.urls
