from django.contrib.auth.models import AbstractUser
from django.db import models
from organizations.models import Organization
import uuid


class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('dispatcher', 'Dispatcher'),
        ('driver', 'Driver'),
        ('customer', 'Customer'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone_number = models.CharField(max_length=20, blank=True)
    current_organization = models.ForeignKey(
        Organization, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='current_users'
    )
    email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['email'], name='user_email_idx'),
            models.Index(fields=['role'], name='user_role_idx'),
            models.Index(fields=['current_organization'], name='user_org_idx'),
        ]

    def __str__(self):
        return f"{self.username} ({self.role})"


class AuditLog(models.Model):
    """Audit log for tracking security events and important actions."""
    
    class ActionType(models.TextChoices):
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        FAILED_LOGIN = "failed_login", "Failed Login"
        PASSWORD_CHANGE = "password_change", "Password Change"
        PASSWORD_RESET = "password_reset", "Password Reset"
        ROLE_CHANGE = "role_change", "Role Change"
        PERMISSION_CHANGE = "permission_change", "Permission Change"
        USER_CREATE = "user_create", "User Create"
        USER_DELETE = "user_delete", "User Delete"
        ORGANIZATION_CREATE = "organization_create", "Organization Create"
        ORGANIZATION_UPDATE = "organization_update", "Organization Update"
        SHIPMENT_CREATE = "shipment_create", "Shipment Create"
        SHIPMENT_UPDATE = "shipment_update", "Shipment Update"
        TRIP_CREATE = "trip_create", "Trip Create"
        TRIP_UPDATE = "trip_update", "Trip Update"
        NOTIFICATION_SEND = "notification_send", "Notification Send"
        API_ACCESS = "api_access", "API Access"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action_type = models.CharField(max_length=30, choices=ActionType.choices)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    related_object_type = models.CharField(max_length=50, null=True, blank=True)
    related_object_id = models.UUIDField(null=True, blank=True)
    changes = models.JSONField(default=dict, blank=True, null=True)  # Store old/new values for changes
    status = models.CharField(max_length=20, default='success')  # success, failed
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='audit_user_created_idx'),
            models.Index(fields=['organization', '-created_at'], name='audit_org_created_idx'),
            models.Index(fields=['action_type'], name='audit_action_type_idx'),
            models.Index(fields=['status'], name='audit_status_idx'),
            models.Index(fields=['created_at'], name='audit_created_idx'),
        ]

    def __str__(self):
        return f"{self.action_type} - {self.user.username if self.user else 'System'} - {self.created_at}"