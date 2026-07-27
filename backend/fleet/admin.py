from django.contrib import admin
from .models import Vehicle, Driver, MaintenanceRecord, VehicleDocument, VehicleInspection


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['plate_number', 'vehicle_type', 'make', 'model', 'year', 'status', 'ownership']
    list_filter = ['vehicle_type', 'status', 'ownership', 'organization']
    search_fields = ['plate_number', 'make', 'model', 'vin']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('plate_number', 'vehicle_type', 'make', 'model', 'year', 'vin', 'color')
        }),
        ('Capacity & Specifications', {
            'fields': ('capacity_kg', 'capacity_volume_m3', 'length_cm', 'width_cm', 'height_cm')
        }),
        ('Status & Ownership', {
            'fields': ('status', 'ownership')
        }),
        ('Financial Information', {
            'fields': ('purchase_date', 'purchase_price', 'current_value', 'lease_end_date')
        }),
        ('Maintenance & Odometer', {
            'fields': ('current_odometer', 'last_service_date', 'next_service_due')
        }),
        ('Insurance', {
            'fields': ('insurance_company', 'insurance_policy_number', 'insurance_expiry')
        }),
        ('Additional', {
            'fields': ('notes', 'organization')
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at')
        }),
    )


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ['user', 'license_number', 'status', 'employment_type', 'assigned_vehicle']
    list_filter = ['status', 'employment_type', 'organization']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'license_number']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'organization')
        }),
        ('License Information', {
            'fields': ('license_number', 'license_type', 'license_expiry', 'license_issuing_authority')
        }),
        ('Employment Details', {
            'fields': ('employment_type', 'hire_date', 'termination_date', 'hourly_rate', 'salary')
        }),
        ('Contact Information', {
            'fields': ('phone_number', 'emergency_contact_name', 'emergency_contact_phone')
        }),
        ('Assignment', {
            'fields': ('assigned_vehicle', 'status')
        }),
        ('Performance', {
            'fields': ('total_trips', 'total_distance_km', 'safety_score', 'on_time_performance')
        }),
        ('Certifications', {
            'fields': ('certifications', 'medical_exam_expiry')
        }),
        ('Additional', {
            'fields': ('notes',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at')
        }),
    )


@admin.register(MaintenanceRecord)
class MaintenanceRecordAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'maintenance_type', 'created_at', 'status', 'priority', 'actual_cost']
    list_filter = ['maintenance_type', 'status', 'priority', 'created_at']
    search_fields = ['vehicle__plate_number', 'description', 'service_provider']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('vehicle', 'maintenance_type', 'priority', 'status')
        }),
        ('Description', {
            'fields': ('description', 'work_performed')
        }),
        ('Cost Information', {
            'fields': ('estimated_cost', 'actual_cost')
        }),
        ('Scheduling', {
            'fields': ('scheduled_date', 'completed_date', 'next_due_date')
        }),
        ('Service Provider', {
            'fields': ('service_provider', 'service_location', 'performed_by')
        }),
        ('Odometer & Parts', {
            'fields': ('odometer_at_service', 'parts_used', 'labor_hours')
        }),
        ('Documentation', {
            'fields': ('invoice_number', 'notes')
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at')
        }),
    )


@admin.register(VehicleDocument)
class VehicleDocumentAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'document_type', 'title', 'status', 'expiry_date']
    list_filter = ['document_type', 'status', 'expiry_date']
    search_fields = ['vehicle__plate_number', 'title', 'document_number']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(VehicleInspection)
class VehicleInspectionAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'inspection_type', 'inspection_date', 'status', 'driver']
    list_filter = ['inspection_type', 'status', 'inspection_date']
    search_fields = ['vehicle__plate_number', 'driver__user__username']
    readonly_fields = ['id', 'created_at', 'updated_at']