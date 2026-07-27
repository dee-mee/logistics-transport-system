import uuid
from django.db import models
from django.conf import settings


class Organization(models.Model):
    """Multi-tenant organization for fleet management companies."""
    
    class Plan(models.TextChoices):
        BASIC = "basic", "Basic"
        PROFESSIONAL = "professional", "Professional"
        ENTERPRISE = "enterprise", "Enterprise"
        
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        TRIAL = "trial", "Trial"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=100, unique=True)
    plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.BASIC)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL)
    
    # Contact information
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    website = models.URLField(blank=True)
    
    # Settings
    timezone = models.CharField(max_length=50, default='UTC')
    currency = models.CharField(max_length=3, default='USD')
    locale = models.CharField(max_length=10, default='en_US')
    
    # Limits
    max_vehicles = models.PositiveIntegerField(default=10)
    max_drivers = models.PositiveIntegerField(default=20)
    max_users = models.PositiveIntegerField(default=50)
    
    # Timestamps
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        indexes = [models.Index(fields=['slug'])]
    
    def __str__(self):
        return self.name


class OrganizationUser(models.Model):
    """Membership of a user in an organization with specific role."""
    
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MANAGER = "manager", "Manager"
        DISPATCHER = "dispatcher", "Dispatcher"
        DRIVER = "driver", "Driver"
        CUSTOMER = "customer", "Customer"
        VIEWER = "viewer", "Viewer"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='organization_memberships')
    role = models.CharField(max_length=20, choices=Role.choices)
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('organization', 'user')
        indexes = [
            models.Index(fields=['organization', 'user']),
            models.Index(fields=['organization', 'role']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.role} @ {self.organization.name}"


class OrganizationSettings(models.Model):
    """Organization-specific settings and preferences."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.OneToOneField(Organization, on_delete=models.CASCADE, related_name='settings')
    
    # Feature flags
    enable_gps_tracking = models.BooleanField(default=True)
    enable_fuel_management = models.BooleanField(default=False)
    enable_maintenance = models.BooleanField(default=True)
    enable_route_optimization = models.BooleanField(default=False)
    enable_notifications = models.BooleanField(default=True)
    
    # Business rules
    default_dispatch_radius_km = models.PositiveIntegerField(default=50)
    max_working_hours_per_day = models.PositiveIntegerField(default=10)
    require_mileage_logs = models.BooleanField(default=True)
    require_pre_trip_inspection = models.BooleanField(default=True)
    
    # Branding
    logo_url = models.URLField(blank=True)
    primary_color = models.CharField(max_length=7, default='#007bff')
    secondary_color = models.CharField(max_length=7, default='#6c757d')
    
    # Notification settings
    notification_email = models.EmailField(blank=True)
    notification_sms = models.CharField(max_length=20, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Settings for {self.organization.name}"


class Invitation(models.Model):
    """Invitations for users to join an organization."""
    
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        EXPIRED = "expired", "Expired"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=OrganizationUser.Role.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    message = models.TextField(blank=True)
    
    token = models.UUIDField(default=uuid.uuid4, editable=False)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [models.Index(fields=['token', 'expires_at'])]
    
    def __str__(self):
        return f"Invitation for {self.email} to {self.organization.name}"