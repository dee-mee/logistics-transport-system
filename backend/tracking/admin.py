from django.contrib import admin
from .models import ShipmentStatusEvent, VehicleLocationPing, Geofence, GPSAlert


@admin.register(ShipmentStatusEvent)
class ShipmentStatusEventAdmin(admin.ModelAdmin):
    list_display = ['shipment', 'status', 'location_description', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['shipment__tracking_code', 'location_description']
    readonly_fields = ['id', 'created_at']


@admin.register(VehicleLocationPing)
class VehicleLocationPingAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'driver', 'lat', 'lng', 'status_update', 'is_verified', 'recorded_at']
    list_filter = ['recorded_at', 'status_update', 'is_verified']
    search_fields = ['vehicle__plate_number', 'driver__user__username', 'address']
    readonly_fields = ['id', 'recorded_at', 'verified_at']


@admin.register(Geofence)
class GeofenceAdmin(admin.ModelAdmin):
    list_display = ['name', 'geofence_type', 'boundary_type', 'status', 'address']
    list_filter = ['geofence_type', 'boundary_type', 'status']
    search_fields = ['name', 'description', 'address']
    filter_horizontal = ['vehicles']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(GPSAlert)
class GPSAlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'alert_type', 'severity', 'vehicle', 'status', 'created_at']
    list_filter = ['alert_type', 'severity', 'status', 'created_at']
    search_fields = ['title', 'description', 'vehicle__plate_number']
    readonly_fields = ['id', 'created_at', 'acknowledged_at', 'resolved_at']