import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class Vehicle(models.Model):
    class VehicleType(models.TextChoices):
        VAN = "van", "Van"
        TRUCK = "truck", "Truck"
        MOTORBIKE = "motorbike", "Motorbike"
        TRAILER = "trailer", "Trailer"

    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        ON_TRIP = "on_trip", "On Trip"
        MAINTENANCE = "maintenance", "Under Maintenance"
        OUT_OF_SERVICE = "out_of_service", "Out of Service"
        RETIRED = "retired", "Retired"

    class Ownership(models.TextChoices):
        OWNED = "owned", "Owned"
        LEASED = "leased", "Leased"
        RENTED = "rented", "Rented"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='vehicles', null=True, blank=True)
    plate_number = models.CharField(max_length=20, unique=True)
    vehicle_type = models.CharField(max_length=20, choices=VehicleType.choices)
    make = models.CharField(max_length=50, blank=True)
    model = models.CharField(max_length=50, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    vin = models.CharField(max_length=17, blank=True, help_text="Vehicle Identification Number")
    
    # Capacity and specifications
    capacity_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    capacity_volume_m3 = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    length_cm = models.PositiveIntegerField(null=True, blank=True)
    width_cm = models.PositiveIntegerField(null=True, blank=True)
    height_cm = models.PositiveIntegerField(null=True, blank=True)
    
    # Status and ownership
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    ownership = models.CharField(max_length=20, choices=Ownership.choices, default=Ownership.OWNED, null=True, blank=True)
    
    # Financial information
    purchase_date = models.DateField(null=True, blank=True)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    current_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    lease_end_date = models.DateField(null=True, blank=True)
    
    # Odometer and maintenance
    current_odometer = models.PositiveIntegerField(default=0, help_text="Current odometer reading in km")
    last_service_date = models.DateField(null=True, blank=True)
    next_service_due = models.DateField(null=True, blank=True)
    
    # Insurance
    insurance_company = models.CharField(max_length=100, blank=True)
    insurance_policy_number = models.CharField(max_length=50, blank=True)
    insurance_expiry = models.DateField(null=True, blank=True)
    
    # Additional information
    color = models.CharField(max_length=30, blank=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['organization', 'plate_number']),
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['organization', 'vehicle_type']),
        ]

    def __str__(self):
        return f"{self.plate_number} ({self.get_vehicle_type_display()})"


class Driver(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        ON_TRIP = "on_trip", "On Trip"
        OFF_DUTY = "off_duty", "Off Duty"
        ON_LEAVE = "on_leave", "On Leave"
        SUSPENDED = "suspended", "Suspended"

    class EmploymentType(models.TextChoices):
        FULL_TIME = "full_time", "Full Time"
        PART_TIME = "part_time", "Part Time"
        CONTRACTOR = "contractor", "Contractor"
        TEMPORARY = "temporary", "Temporary"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='drivers', null=True, blank=True)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="driver_profile")
    
    # License information
    license_number = models.CharField(max_length=50, unique=True)
    license_type = models.CharField(max_length=50, blank=True)
    license_expiry = models.DateField()
    license_issuing_authority = models.CharField(max_length=100, blank=True)
    
    # Employment details
    employment_type = models.CharField(max_length=20, choices=EmploymentType.choices, default=EmploymentType.FULL_TIME)
    hire_date = models.DateField(null=True, blank=True)
    termination_date = models.DateField(null=True, blank=True)
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Contact information
    phone_number = models.CharField(max_length=20, blank=True)
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    
    # Assignment
    assigned_vehicle = models.ForeignKey(
        Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name="drivers"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    
    # Performance tracking
    total_trips = models.PositiveIntegerField(default=0)
    total_distance_km = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    safety_score = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True, help_text="Safety score out of 10")
    on_time_performance = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="On-time delivery percentage")
    
    # Certifications
    certifications = models.JSONField(default=list, blank=True, help_text="List of driver certifications")
    medical_exam_expiry = models.DateField(null=True, blank=True)
    
    # Additional information
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['organization', 'license_number']),
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['organization', 'employment_type']),
        ]

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.license_number}"


class MaintenanceRecord(models.Model):
    class MaintenanceType(models.TextChoices):
        ROUTINE = "routine", "Routine Service"
        REPAIR = "repair", "Repair"
        INSPECTION = "inspection", "Inspection"
        EMERGENCY = "emergency", "Emergency Repair"
        UPGRADE = "upgrade", "Upgrade"
        
    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"
        
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="maintenance_records")
    
    maintenance_type = models.CharField(max_length=20, choices=MaintenanceType.choices, default=MaintenanceType.ROUTINE)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    
    description = models.TextField()
    work_performed = models.TextField(blank=True)
    
    # Cost information
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    actual_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Scheduling
    scheduled_date = models.DateField(null=True, blank=True)
    completed_date = models.DateField(null=True, blank=True)
    next_due_date = models.DateField(null=True, blank=True)
    
    # Service provider
    service_provider = models.CharField(max_length=200, blank=True)
    service_location = models.CharField(max_length=255, blank=True)
    performed_by = models.CharField(max_length=200, blank=True)
    
    # Odometer
    odometer_at_service = models.PositiveIntegerField(null=True, blank=True)
    
    # Parts and labor
    parts_used = models.JSONField(default=list, blank=True)
    labor_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Documentation
    invoice_number = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vehicle', '-created_at']),
            models.Index(fields=['vehicle', 'status']),
        ]

    def __str__(self):
        return f"{self.get_maintenance_type_display()} for {self.vehicle.plate_number}"


class VehicleDocument(models.Model):
    """Documents related to vehicles (registration, insurance, etc.)"""
    
    class DocumentType(models.TextChoices):
        REGISTRATION = "registration", "Registration"
        INSURANCE = "insurance", "Insurance"
        INSPECTION = "inspection", "Inspection"
        PERMIT = "permit", "Permit"
        MAINTENANCE = "maintenance", "Maintenance Record"
        OTHER = "other", "Other"
        
    class Status(models.TextChoices):
        VALID = "valid", "Valid"
        EXPIRED = "expired", "Expired"
        EXPIRING_SOON = "expiring_soon", "Expiring Soon"
        PENDING = "pending", "Pending"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="documents")
    
    document_type = models.CharField(max_length=20, choices=DocumentType.choices, default=DocumentType.OTHER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.VALID)
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Document details
    document_number = models.CharField(max_length=50, blank=True)
    issuing_authority = models.CharField(max_length=200, blank=True)
    
    # Dates
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    
    # File storage
    file_url = models.URLField(blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    
    # Notifications
    reminder_days_before = models.PositiveIntegerField(default=30)
    last_reminder_sent = models.DateTimeField(null=True, blank=True)
    
    # Additional information
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-expiry_date']
        indexes = [
            models.Index(fields=['vehicle', 'document_type']),
            models.Index(fields=['vehicle', 'expiry_date']),
            models.Index(fields=['expiry_date']),  # For finding all expiring documents
        ]

    def __str__(self):
        return f"{self.title} for {self.vehicle.plate_number}"


class VehicleInspection(models.Model):
    """Regular vehicle inspections (pre-trip, post-trip, periodic)"""
    
    class InspectionType(models.TextChoices):
        PRE_TRIP = "pre_trip", "Pre-Trip"
        POST_TRIP = "post_trip", "Post-Trip"
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        ANNUAL = "annual", "Annual"
        
    class Status(models.TextChoices):
        PASSED = "passed", "Passed"
        FAILED = "failed", "Failed"
        CONDITIONAL = "conditional", "Conditional"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="inspections")
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name="inspections")
    
    inspection_type = models.CharField(max_length=20, choices=InspectionType.choices, default=InspectionType.DAILY)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PASSED)
    
    # Inspection details
    inspection_date = models.DateTimeField(auto_now_add=True)
    odometer_reading = models.PositiveIntegerField(null=True, blank=True)
    
    # Check results
    check_results = models.JSONField(default=dict, help_text="Detailed inspection checklist results")
    
    # Issues found
    issues_found = models.TextField(blank=True)
    issues_resolved = models.TextField(blank=True)
    
    # Actions taken
    immediate_actions = models.TextField(blank=True)
    follow_up_required = models.BooleanField(default=False)
    follow_up_notes = models.TextField(blank=True)
    
    # Photos
    photos = models.JSONField(default=list, blank=True)
    
    # Inspector
    inspected_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    inspector_signature = models.TextField(blank=True)
    
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-inspection_date']
        indexes = [
            models.Index(fields=['vehicle', '-inspection_date']),
            models.Index(fields=['driver', '-inspection_date']),
            models.Index(fields=['inspection_type', '-inspection_date']),
        ]

    def __str__(self):
        return f"{self.get_inspection_type_display()} for {self.vehicle.plate_number} - {self.status}"
