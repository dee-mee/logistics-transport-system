from rest_framework import serializers
from .models import Vehicle, Driver, MaintenanceRecord, VehicleDocument, VehicleInspection


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ['id', 'organization', 'plate_number', 'vehicle_type', 'make', 'model', 'year', 'vin',
                  'capacity_kg', 'capacity_volume_m3', 'length_cm', 'width_cm', 'height_cm',
                  'status', 'ownership', 'purchase_date', 'purchase_price', 'current_value', 'lease_end_date',
                  'current_odometer', 'last_service_date', 'next_service_due',
                  'insurance_company', 'insurance_policy_number', 'insurance_expiry',
                  'color', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class VehicleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    class Meta:
        model = Vehicle
        fields = ['id', 'plate_number', 'vehicle_type', 'make', 'model', 'year', 'capacity_kg', 'status', 'ownership', 'current_odometer']


class DriverSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_first_name = serializers.CharField(source="user.first_name", read_only=True)
    user_last_name = serializers.CharField(source="user.last_name", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)
    user_phone = serializers.CharField(source="user.phone_number", read_only=True)
    assigned_vehicle_plate = serializers.CharField(source="assigned_vehicle.plate_number", read_only=True)
    
    class Meta:
        model = Driver
        fields = ['id', 'organization', 'user', 'user_name', 'user_email', 'user_first_name', 'user_last_name', 'user_username', 'user_phone',
                  'license_number', 'license_type', 'license_expiry', 'license_issuing_authority',
                  'employment_type', 'hire_date', 'termination_date', 'hourly_rate', 'salary',
                  'emergency_contact_name', 'emergency_contact_phone',
                  'assigned_vehicle', 'assigned_vehicle_plate', 'status',
                  'total_trips', 'total_distance_km', 'safety_score', 'on_time_performance',
                  'certifications', 'medical_exam_expiry', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def validate(self, attrs):
        # Set default license expiry if not provided for new instances only
        if self.instance is None and ('license_expiry' not in attrs or attrs['license_expiry'] is None or attrs['license_expiry'] == ''):
            from datetime import datetime, timedelta
            attrs['license_expiry'] = datetime.now().date() + timedelta(days=365)

        assigned_vehicle = attrs.get('assigned_vehicle')
        if assigned_vehicle:
            conflicting_driver = Driver.objects.filter(assigned_vehicle=assigned_vehicle)
            if self.instance is not None:
                conflicting_driver = conflicting_driver.exclude(pk=self.instance.pk)

            if conflicting_driver.exists():
                raise serializers.ValidationError({
                    'assigned_vehicle': 'This vehicle is already assigned to another driver.'
                })
        return attrs


class DriverListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    user = serializers.UUIDField(source="user.id", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_first_name = serializers.CharField(source="user.first_name", read_only=True)
    user_last_name = serializers.CharField(source="user.last_name", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)
    user_phone = serializers.CharField(source="user.phone_number", read_only=True)
    assigned_vehicle_plate = serializers.CharField(source="assigned_vehicle.plate_number", read_only=True)
    assigned_vehicle_id = serializers.UUIDField(source="assigned_vehicle.id", read_only=True)
    
    class Meta:
        model = Driver
        fields = [
            'id', 'user', 'user_name', 'user_first_name', 'user_last_name', 'user_username', 'user_phone',
            'license_number', 'license_type', 'license_expiry', 'status', 'employment_type',
            'emergency_contact_name', 'emergency_contact_phone',
            'assigned_vehicle', 'assigned_vehicle_plate', 'assigned_vehicle_id'
        ]


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source="vehicle.plate_number", read_only=True)
    
    class Meta:
        model = MaintenanceRecord
        fields = ['id', 'vehicle', 'vehicle_plate', 'maintenance_type', 'priority', 'status',
                  'description', 'work_performed', 'estimated_cost', 'actual_cost',
                  'scheduled_date', 'completed_date', 'next_due_date',
                  'service_provider', 'service_location', 'performed_by',
                  'odometer_at_service', 'parts_used', 'labor_hours',
                  'invoice_number', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class VehicleDocumentSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source="vehicle.plate_number", read_only=True)
    
    class Meta:
        model = VehicleDocument
        fields = ['id', 'vehicle', 'vehicle_plate', 'document_type', 'status', 'title', 'description',
                  'document_number', 'issuing_authority', 'issue_date', 'expiry_date',
                  'file_url', 'file_name', 'file_size',
                  'reminder_days_before', 'last_reminder_sent', 'notes',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class VehicleInspectionSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source="vehicle.plate_number", read_only=True)
    driver_name = serializers.CharField(source="driver.user.get_full_name", read_only=True)
    inspector_name = serializers.CharField(source="inspected_by.get_full_name", read_only=True)
    
    class Meta:
        model = VehicleInspection
        fields = ['id', 'vehicle', 'vehicle_plate', 'driver', 'driver_name',
                  'inspection_type', 'status', 'inspection_date', 'odometer_reading',
                  'check_results', 'issues_found', 'issues_resolved',
                  'immediate_actions', 'follow_up_required', 'follow_up_notes',
                  'photos', 'inspected_by', 'inspector_name', 'inspector_signature',
                  'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
