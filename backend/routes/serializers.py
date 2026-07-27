from rest_framework import serializers
from .models import Route, RouteStop, RouteOptimization, RouteTemplate


class RouteStopSerializer(serializers.ModelSerializer):
    shipment_code = serializers.CharField(source='shipment.tracking_code', read_only=True)
    
    class Meta:
        model = RouteStop
        fields = ['id', 'route', 'sequence_number', 'name', 'stop_type', 'status',
                  'address', 'lat', 'lng', 'planned_arrival_time', 'planned_departure_time',
                  'estimated_duration_minutes', 'actual_arrival_time', 'actual_departure_time',
                  'distance_from_previous_km', 'estimated_travel_time_minutes',
                  'shipment', 'shipment_code', 'contact_person', 'contact_phone',
                  'notes', 'delivery_notes', 'requires_signature', 'requires_photo',
                  'special_instructions', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class RouteStopCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating route stops."""
    class Meta:
        model = RouteStop
        fields = ['sequence_number', 'name', 'stop_type', 'address', 'lat', 'lng',
                  'planned_arrival_time', 'planned_departure_time', 'estimated_duration_minutes',
                  'shipment', 'contact_person', 'contact_phone', 'notes', 'delivery_notes',
                  'requires_signature', 'requires_photo', 'special_instructions']


class RouteSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    driver_name = serializers.CharField(source='driver.user.get_full_name', read_only=True)
    stops = RouteStopSerializer(many=True, read_only=True)
    
    class Meta:
        model = Route
        fields = ['id', 'organization', 'name', 'description', 'route_type', 'status', 'optimization_level',
                  'planned_start_time', 'planned_end_time', 'actual_start_time', 'actual_end_time',
                  'vehicle', 'vehicle_plate', 'driver', 'driver_name',
                  'total_distance_km', 'estimated_duration_minutes', 'actual_distance_km', 'actual_duration_minutes',
                  'estimated_fuel_cost', 'estimated_labor_cost', 'total_estimated_cost',
                  'notes', 'stops', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class RouteListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    driver_name = serializers.CharField(source='driver.user.get_full_name', read_only=True)
    stop_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Route
        fields = ['id', 'name', 'route_type', 'status', 'vehicle_plate', 'driver_name',
                  'planned_start_time', 'total_distance_km', 'stop_count']
    
    def get_stop_count(self, obj):
        return obj.stops.count()


class RouteOptimizationSerializer(serializers.ModelSerializer):
    route_name = serializers.CharField(source='route.name', read_only=True)
    
    class Meta:
        model = RouteOptimization
        fields = ['id', 'organization', 'route', 'route_name', 'method', 'status',
                  'max_stops_per_route', 'max_distance_km', 'max_duration_minutes',
                  'vehicle_capacity_kg', 'time_window_start', 'time_window_end',
                  'original_distance_km', 'optimized_distance_km', 'distance_savings_km',
                  'distance_savings_percent', 'original_duration_minutes', 'optimized_duration_minutes',
                  'duration_savings_minutes', 'duration_savings_percent',
                  'started_at', 'completed_at', 'error_message',
                  'optimized_stop_order', 'optimization_metadata', 'created_at']
        read_only_fields = ['id', 'created_at', 'started_at', 'completed_at']


class RouteOptimizationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating route optimization requests."""
    class Meta:
        model = RouteOptimization
        fields = ['route', 'method', 'max_stops_per_route', 'max_distance_km', 
                  'max_duration_minutes', 'vehicle_capacity_kg', 'time_window_start', 'time_window_end']


class RouteTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RouteTemplate
        fields = ['id', 'organization', 'name', 'description', 'template_type',
                  'default_vehicle_type', 'max_stops', 'typical_duration_minutes',
                  'typical_distance_km', 'zone_coordinates', 'zone_center_lat', 'zone_center_lng',
                  'zone_radius_km', 'default_stop_types', 'time_window_start', 'time_window_end',
                  'is_active', 'usage_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'usage_count']


class RouteFromTemplateSerializer(serializers.Serializer):
    """Serializer for creating routes from templates."""
    template_id = serializers.UUIDField()
    route_name = serializers.CharField(max_length=200)
    planned_start_time = serializers.DateTimeField()
    vehicle_id = serializers.UUIDField(required=False)
    driver_id = serializers.UUIDField(required=False)
    stops = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        help_text="List of stop objects to override template defaults"
    )