import uuid
from django.db import models
from organizations.models import Organization
from orders.models import Shipment
from fleet.models import Vehicle


class ShipmentStatusEvent(models.Model):
    """Audit trail of every status change a shipment goes through."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name="status_events")
    status = models.CharField(max_length=20, choices=Shipment.Status.choices)
    location_description = models.CharField(max_length=255, blank=True)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.shipment.tracking_code}: {self.status} @ {self.created_at}"


class VehicleLocationPing(models.Model):
    """Manual location updates from drivers for live tracking."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='location_pings', null=True, blank=True)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="location_pings")
    driver = models.ForeignKey('fleet.Driver', on_delete=models.SET_NULL, null=True, blank=True, related_name="location_updates")
    
    # Location data
    lat = models.DecimalField(max_digits=9, decimal_places=6)
    lng = models.DecimalField(max_digits=9, decimal_places=6)
    address = models.CharField(max_length=255, blank=True)
    
    # Movement data (reported by driver)
    speed_kmh = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    heading_deg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    odometer_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Context
    trip_id = models.UUIDField(null=True, blank=True)
    status_update = models.CharField(max_length=50, blank=True, help_text="on_trip, break, available, etc.")
    notes = models.TextField(blank=True)
    
    # Verification
    is_verified = models.BooleanField(default=False, help_text="Verified by dispatcher")
    verified_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_locations')
    verified_at = models.DateTimeField(null=True, blank=True)
    
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(fields=["vehicle", "-recorded_at"]),
            models.Index(fields=["driver", "-recorded_at"]),
            models.Index(fields=["organization", "-recorded_at"]),
            models.Index(fields=["recorded_at"]),  # For time-based queries
        ]

    def __str__(self):
        return f"{self.vehicle.plate_number} - {self.driver.user.get_full_name() if self.driver else 'Unknown'} @ {self.recorded_at}"


class Geofence(models.Model):
    """Geographic boundaries for route monitoring and delivery zones."""
    
    class GeofenceType(models.TextChoices):
        DELIVERY_ZONE = "delivery_zone", "Delivery Zone"
        RESTRICTED_AREA = "restricted_area", "Restricted Area"
        ROUTE_CORRIDOR = "route_corridor", "Route Corridor"
        WAREHOUSE = "warehouse", "Warehouse"
        
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='geofences', null=True, blank=True)
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    geofence_type = models.CharField(max_length=20, choices=GeofenceType.choices, default=GeofenceType.DELIVERY_ZONE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    
    # Boundary definition (polygon or circle)
    boundary_type = models.CharField(max_length=20, default='polygon', help_text="polygon, circle")
    coordinates = models.JSONField(default=list, help_text="Array of [lat, lng] pairs")
    radius_m = models.PositiveIntegerField(null=True, blank=True, help_text="For circle geofences")
    center_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    center_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Address for reference
    address = models.CharField(max_length=255, blank=True)
    
    # Assigned vehicles/routes
    vehicles = models.ManyToManyField(Vehicle, related_name='geofences', blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['organization', 'geofence_type']),
        ]

    def __str__(self):
        return f"{self.name} ({self.geofence_type})"


class GPSAlert(models.Model):
    """Manual alerts and notifications from drivers/dispatchers."""
    
    class AlertType(models.TextChoices):
        DELAY = "delay", "Delivery Delay"
        BREAKDOWN = "breakdown", "Vehicle Breakdown"
        ACCIDENT = "accident", "Accident"
        TRAFFIC = "traffic", "Traffic Issue"
        WEATHER = "weather", "Weather Issue"
        CUSTOMER_ISSUE = "customer_issue", "Customer Issue"
        OTHER = "other", "Other"
        
    class Severity(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"
        
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ACKNOWLEDGED = "acknowledged", "Acknowledged"
        RESOLVED = "resolved", "Resolved"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='gps_alerts', null=True, blank=True)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='gps_alerts')
    
    alert_type = models.CharField(max_length=20, choices=AlertType.choices)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    
    # Alert details
    title = models.CharField(max_length=200, default='')
    description = models.TextField(default='')
    
    # Location
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    address = models.CharField(max_length=255, blank=True)
    
    # Related entities
    driver = models.ForeignKey('fleet.Driver', on_delete=models.SET_NULL, null=True, blank=True, related_name='gps_alerts')
    trip_id = models.UUIDField(null=True, blank=True)
    shipment = models.ForeignKey('orders.Shipment', on_delete=models.SET_NULL, null=True, blank=True, related_name='gps_tracking_alerts')
    
    # Resolution
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_gps_alerts')
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_gps_alerts')
    resolution_notes = models.TextField(blank=True)
    
    # Photos
    photos = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status', '-created_at']),
            models.Index(fields=['vehicle', '-created_at']),
            models.Index(fields=['alert_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.vehicle.plate_number}"
