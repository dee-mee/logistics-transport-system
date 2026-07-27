from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    ShipmentStatusEventViewSet, VehicleLocationPingViewSet, GeofenceViewSet, 
    GPSAlertViewSet, PublicShipmentTrackingView
)

router = DefaultRouter()
router.register("status-events", ShipmentStatusEventViewSet, basename='status-event')
router.register("location-pings", VehicleLocationPingViewSet, basename='location-ping')
router.register("geofences", GeofenceViewSet, basename='geofence')
router.register("alerts", GPSAlertViewSet, basename='gps-alert')

urlpatterns = [
    path("track/<str:tracking_code>/", PublicShipmentTrackingView.as_view(), name="public-tracking"),
] + router.urls
