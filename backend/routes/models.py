import uuid
from django.db import models
from django.utils import timezone
from organizations.models import Organization
from fleet.models import Vehicle, Driver
from orders.models import Shipment


class Route(models.Model):
    """Route plan for vehicle trips with multiple stops."""
    
    class RouteType(models.TextChoices):
        DELIVERY = "delivery", "Delivery Route"
        PICKUP = "pickup", "Pickup Route"
        MIXED = "mixed", "Mixed Pickup/Delivery"
        TRANSFER = "transfer", "Transfer/Relocation"
        
    class Status(models.TextChoices):
        PLANNED = "planned", "Planned"
        ASSIGNED = "assigned", "Assigned"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        
    class OptimizationLevel(models.TextChoices):
        NONE = "none", "None (Manual Order)"
        BASIC = "basic", "Basic Optimization"
        ADVANCED = "advanced", "Advanced Optimization"
        REAL_TIME = "real_time", "Real-time Optimization"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='routes')
    
    # Basic information
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    route_type = models.CharField(max_length=20, choices=RouteType.choices, default=RouteType.DELIVERY)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNED)
    optimization_level = models.CharField(max_length=20, choices=OptimizationLevel.choices, default=OptimizationLevel.NONE)
    
    # Scheduling
    planned_start_time = models.DateTimeField(null=True, blank=True)
    planned_end_time = models.DateTimeField(null=True, blank=True)
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    
    # Assignment
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='routes')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='routes')
    
    # Route details
    total_distance_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    estimated_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    actual_distance_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    actual_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    
    # Cost estimates
    estimated_fuel_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    estimated_labor_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Notes
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-planned_start_time']
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['organization', 'planned_start_time']),
            models.Index(fields=['vehicle', 'planned_start_time']),
            models.Index(fields=['driver', 'planned_start_time']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


class RouteStop(models.Model):
    """Individual stops within a route."""
    
    class StopType(models.TextChoices):
        PICKUP = "pickup", "Pickup"
        DELIVERY = "delivery", "Delivery"
        FUEL = "fuel", "Fuel Stop"
        REST = "rest", "Rest Break"
        WAREHOUSE = "warehouse", "Warehouse"
        CUSTOM = "custom", "Custom"
        
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROACHING = "approaching", "Approaching"
        ARRIVED = "arrived", "Arrived"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"
        FAILED = "failed", "Failed"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='stops')
    
    # Stop information
    stop_type = models.CharField(max_length=20, choices=StopType.choices, default=StopType.DELIVERY)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Location
    sequence_number = models.PositiveIntegerField()  # Order in route
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=255)
    lat = models.DecimalField(max_digits=9, decimal_places=6)
    lng = models.DecimalField(max_digits=9, decimal_places=6)
    
    # Time estimates
    planned_arrival_time = models.DateTimeField(null=True, blank=True)
    planned_departure_time = models.DateTimeField(null=True, blank=True)
    estimated_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    actual_arrival_time = models.DateTimeField(null=True, blank=True)
    actual_departure_time = models.DateTimeField(null=True, blank=True)
    
    # Distance from previous stop
    distance_from_previous_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    estimated_travel_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    
    # Related entities
    shipment = models.ForeignKey(Shipment, on_delete=models.SET_NULL, null=True, blank=True, related_name='route_stops')
    contact_person = models.CharField(max_length=200, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    
    # Notes
    notes = models.TextField(blank=True)
    delivery_notes = models.TextField(blank=True)
    
    # Requirements
    requires_signature = models.BooleanField(default=False)
    requires_photo = models.BooleanField(default=False)
    special_instructions = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['route', 'sequence_number']
        indexes = [
            models.Index(fields=['route', 'sequence_number']),
            models.Index(fields=['shipment']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.sequence_number}. {self.name} ({self.get_status_display()})"


class RouteOptimization(models.Model):
    """Route optimization results and parameters."""
    
    class OptimizationMethod(models.TextChoices):
        NEAREST_NEIGHBOR = "nearest_neighbor", "Nearest Neighbor"
        GENETIC = "genetic", "Genetic Algorithm"
        TABU_SEARCH = "tabu_search", "Tabu Search"
        SIMULATED_ANNEALING = "simulated_annealing", "Simulated Annealing"
        GOOGLE_OR = "google_or", "Google OR-Tools"
        
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='route_optimizations')
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='optimizations')
    
    # Optimization parameters
    method = models.CharField(max_length=30, choices=OptimizationMethod.choices, default=OptimizationMethod.NEAREST_NEIGHBOR)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Parameters
    max_stops_per_route = models.PositiveIntegerField(default=10)
    max_distance_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    vehicle_capacity_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    time_window_start = models.TimeField(null=True, blank=True)
    time_window_end = models.TimeField(null=True, blank=True)
    
    # Results
    original_distance_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    optimized_distance_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    distance_savings_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    distance_savings_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    original_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    optimized_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    duration_savings_minutes = models.PositiveIntegerField(null=True, blank=True)
    duration_savings_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Processing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Result data
    optimized_stop_order = models.JSONField(default=list, blank=True)
    optimization_metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['route', '-created_at']),
        ]

    def __str__(self):
        return f"{self.route.name} - {self.get_method_display()}"


class RouteTemplate(models.Model):
    """Reusable route templates for common delivery patterns."""
    
    class TemplateType(models.TextChoices):
        DAILY = "daily", "Daily Route"
        WEEKLY = "weekly", "Weekly Route"
        ZONE = "zone", "Zone-based Route"
        CUSTOMER = "customer", "Customer-specific"
        CUSTOM = "custom", "Custom"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='route_templates')
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    template_type = models.CharField(max_length=20, choices=TemplateType.choices, default=TemplateType.CUSTOM)
    
    # Template configuration
    default_vehicle_type = models.CharField(max_length=50, blank=True)
    max_stops = models.PositiveIntegerField(default=10)
    typical_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    typical_distance_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Zone definition (for zone-based templates)
    zone_coordinates = models.JSONField(default=list, blank=True, help_text="Polygon coordinates for zone")
    zone_center_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    zone_center_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    zone_radius_km = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    
    # Default stop types and patterns
    default_stop_types = models.JSONField(default=list, blank=True)
    time_window_start = models.TimeField(null=True, blank=True)
    time_window_end = models.TimeField(null=True, blank=True)
    
    # Metadata
    is_active = models.BooleanField(default=True)
    usage_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['organization', 'is_active']),
            models.Index(fields=['template_type']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_template_type_display()})"