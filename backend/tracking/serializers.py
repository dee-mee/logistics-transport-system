from rest_framework import serializers
from .models import ShipmentStatusEvent, VehicleLocationPing, Geofence, GPSAlert


class ShipmentStatusEventSerializer(serializers.ModelSerializer):
    shipment_code = serializers.CharField(source='shipment.tracking_code', read_only=True)
    
    class Meta:
        model = ShipmentStatusEvent
        fields = ['id', 'shipment', 'shipment_code', 'status', 'location_description', 
                  'lat', 'lng', 'note', 'created_at']
        read_only_fields = ['id', 'created_at']


class VehicleLocationPingSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    driver_name = serializers.CharField(source='driver.user.get_full_name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)
    
    class Meta:
        model = VehicleLocationPing
        fields = ['id', 'organization', 'vehicle', 'vehicle_plate', 'driver', 'driver_name',
                  'lat', 'lng', 'address', 'speed_kmh', 'heading_deg', 'odometer_km', 
                  'trip_id', 'status_update', 'notes', 'is_verified', 'verified_by', 
                  'verified_by_name', 'verified_at', 'recorded_at']
        read_only_fields = ['id', 'recorded_at', 'verified_at']


class VehicleLocationPingCreateSerializer(serializers.ModelSerializer):
    """Serializer for drivers to create manual location updates."""
    class Meta:
        model = VehicleLocationPing
        fields = ['vehicle', 'lat', 'lng', 'address', 'speed_kmh', 'heading_deg', 
                  'odometer_km', 'trip_id', 'status_update', 'notes']


class GeofenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Geofence
        fields = ['id', 'organization', 'name', 'description', 'geofence_type', 'status',
                  'boundary_type', 'coordinates', 'radius_m', 'center_lat', 'center_lng',
                  'address', 'vehicles', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class GPSAlertSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    driver_name = serializers.CharField(source='driver.user.get_full_name', read_only=True)
    shipment_code = serializers.CharField(source='shipment.tracking_code', read_only=True)
    acknowledged_by_name = serializers.CharField(source='acknowledged_by.get_full_name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    
    class Meta:
        model = GPSAlert
        fields = ['id', 'organization', 'vehicle', 'vehicle_plate', 'alert_type', 'severity', 
                  'status', 'title', 'description', 'lat', 'lng', 'address',
                  'driver', 'driver_name', 'trip_id', 'shipment', 'shipment_code',
                  'acknowledged_at', 'acknowledged_by', 'acknowledged_by_name', 'resolved_at', 
                  'resolved_by', 'resolved_by_name', 'resolution_notes', 'photos', 'created_at']
        read_only_fields = ['id', 'created_at', 'acknowledged_at', 'resolved_at']


class GPSAlertSerializerV2(serializers.ModelSerializer):
    """Updated serializer with correct related names."""
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    driver_name = serializers.CharField(source='driver.user.get_full_name', read_only=True)
    shipment_code = serializers.CharField(source='shipment.tracking_code', read_only=True)
    acknowledged_by_name = serializers.CharField(source='acknowledged_by.get_full_name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    
    class Meta:
        model = GPSAlert
        fields = ['id', 'organization', 'vehicle', 'vehicle_plate', 'alert_type', 'severity', 
                  'status', 'title', 'description', 'lat', 'lng', 'address',
                  'driver', 'driver_name', 'trip_id', 'shipment', 'shipment_code',
                  'acknowledged_at', 'acknowledged_by', 'acknowledged_by_name', 'resolved_at', 
                  'resolved_by', 'resolved_by_name', 'resolution_notes', 'photos', 'created_at']
        read_only_fields = ['id', 'created_at', 'acknowledged_at', 'resolved_at']


class GPSAlertUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GPSAlert
        fields = ['status', 'resolution_notes']


class LiveMapDataSerializer(serializers.Serializer):
    """Serializer for live map data."""
    vehicle_id = serializers.UUIDField()
    plate_number = serializers.CharField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    speed_kmh = serializers.DecimalField(max_digits=6, decimal_places=2, allow_null=True)
    heading_deg = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    status = serializers.CharField()
    driver_name = serializers.CharField(allow_null=True)
    last_update = serializers.DateTimeField()
    vehicle_type = serializers.CharField()
    address = serializers.CharField(allow_null=True)
    status_update = serializers.CharField(allow_null=True)