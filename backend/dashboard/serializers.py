from rest_framework import serializers
from .models import DashboardWidget, SavedReport, MetricSnapshot, DashboardAlert


class DashboardWidgetSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = DashboardWidget
        fields = ['id', 'organization', 'widget_type', 'title', 'description', 
                  'chart_type', 'data_source', 'data_query', 'position_x', 'position_y',
                  'width', 'height', 'refresh_interval', 'is_visible', 'created_by',
                  'created_by_name', 'config', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SavedReportSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = SavedReport
        fields = ['id', 'organization', 'name', 'description', 'report_type',
                  'data_sources', 'filters', 'group_by', 'schedule_type', 'schedule_config',
                  'last_run_at', 'next_run_at', 'status', 'result_data', 'result_summary',
                  'is_public', 'shared_with', 'created_by', 'created_by_name',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_run_at', 'next_run_at']


class MetricSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetricSnapshot
        fields = ['id', 'organization', 'metric_name', 'metric_value', 'metric_unit',
                  'period_start', 'period_end', 'dimensions', 'recorded_at']
        read_only_fields = ['id', 'recorded_at']


class DashboardAlertSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='related_vehicle.plate_number', read_only=True)
    driver_name = serializers.CharField(source='related_driver.user.get_full_name', read_only=True)
    shipment_code = serializers.CharField(source='related_shipment.tracking_code', read_only=True)
    trip_reference = serializers.CharField(source='related_trip.reference', read_only=True)
    acknowledged_by_name = serializers.CharField(source='acknowledged_by.get_full_name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    
    class Meta:
        model = DashboardAlert
        fields = ['id', 'organization', 'alert_type', 'severity', 'status', 'title', 'message',
                  'related_vehicle', 'vehicle_plate', 'related_driver', 'driver_name',
                  'related_shipment', 'shipment_code', 'related_trip', 'trip_reference',
                  'threshold_value', 'actual_value', 'acknowledged_at', 'acknowledged_by',
                  'acknowledged_by_name', 'resolved_at', 'resolved_by', 'resolved_by_name',
                  'resolution_notes', 'created_at']
        read_only_fields = ['id', 'created_at', 'acknowledged_at', 'resolved_at']


class DashboardAlertUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardAlert
        fields = ['status', 'resolution_notes']


class DashboardMetricsSerializer(serializers.Serializer):
    """Serializer for dashboard metrics endpoint."""
    total_vehicles = serializers.IntegerField()
    active_vehicles = serializers.IntegerField()
    total_drivers = serializers.IntegerField()
    active_drivers = serializers.IntegerField()
    total_shipments = serializers.IntegerField()
    in_transit_shipments = serializers.IntegerField()
    pending_shipments = serializers.IntegerField()
    completed_shipments = serializers.IntegerField()
    total_trips = serializers.IntegerField()
    active_trips = serializers.IntegerField()
    total_fuel_cost = serializers.DecimalField(max_digits=15, decimal_places=2)
    avg_fuel_consumption = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    on_time_delivery_rate = serializers.DecimalField(max_digits=5, decimal_places=2)


class VehicleStatusSummarySerializer(serializers.Serializer):
    """Serializer for vehicle status summary."""
    status = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.DecimalField(max_digits=5, decimal_places=2)


class ShipmentStatusSummarySerializer(serializers.Serializer):
    """Serializer for shipment status summary."""
    status = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.DecimalField(max_digits=5, decimal_places=2)


class ActivityFeedSerializer(serializers.Serializer):
    """Serializer for activity feed."""
    timestamp = serializers.DateTimeField()
    activity_type = serializers.CharField()
    description = serializers.CharField()
    entity_type = serializers.CharField()
    entity_id = serializers.UUIDField()
    user_name = serializers.CharField()
    details = serializers.DictField()