import uuid
from django.db import models
from django.conf import settings


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        ALERT = "alert", "Alert"
        SUCCESS = "success", "Success"
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        SHIPMENT_STATUS = "shipment_status", "Shipment Status"
        DISPATCH_ASSIGNMENT = "dispatch_assignment", "Dispatch Assignment"
        GPS_ALERT = "gps_alert", "GPS Alert"
        MAINTENANCE_DUE = "maintenance_due", "Maintenance Due"
        FUEL_ANOMALY = "fuel_anomaly", "Fuel Anomaly"
        PASSWORD_RESET = "password_reset", "Password Reset"
        ACCOUNT_VERIFICATION = "account_verification", "Account Verification"
        DOCUMENT_EXPIRY = "document_expiry", "Document Expiry"

    class Channel(models.TextChoices):
        IN_APP = "in_app", "In-App"
        EMAIL = "email", "Email"
        SMS = "sms", "SMS"

    class DeliveryStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        DELIVERED = "delivered", "Delivered"
        FAILED = "failed", "Failed"
        RETRYING = "retrying", "Retrying"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=30, choices=NotificationType.choices, default=NotificationType.INFO)
    title = models.CharField(max_length=200)
    message = models.TextField()
    read = models.BooleanField(default=False)
    
    # Delivery tracking
    channel = models.CharField(max_length=10, choices=Channel.choices, default=Channel.IN_APP)
    delivery_status = models.CharField(max_length=10, choices=DeliveryStatus.choices, default=DeliveryStatus.PENDING)
    external_message_id = models.CharField(max_length=100, blank=True, null=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, null=True)
    retry_count = models.IntegerField(default=0)
    
    # Optional link to related object
    related_object_type = models.CharField(max_length=50, blank=True, null=True)
    related_object_id = models.UUIDField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='notif_user_created_idx'),
            models.Index(fields=['user', 'read'], name='notif_user_read_idx'),
            models.Index(fields=['delivery_status'], name='notif_delivery_status_idx'),
            models.Index(fields=['channel'], name='notif_channel_idx'),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.username}"


class NotificationPreference(models.Model):
    """User preferences for notification channels by type."""
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preferences")
    
    # Email preferences
    email_shipment_status = models.BooleanField(default=True)
    email_dispatch_assignment = models.BooleanField(default=True)
    email_gps_alert = models.BooleanField(default=True)
    email_maintenance_due = models.BooleanField(default=True)
    email_fuel_anomaly = models.BooleanField(default=True)
    email_password_reset = models.BooleanField(default=True)
    email_account_verification = models.BooleanField(default=True)
    
    # SMS preferences
    sms_shipment_status = models.BooleanField(default=False)
    sms_dispatch_assignment = models.BooleanField(default=True)
    sms_gps_alert = models.BooleanField(default=True)
    sms_maintenance_due = models.BooleanField(default=False)
    sms_fuel_anomaly = models.BooleanField(default=False)
    sms_password_reset = models.BooleanField(default=False)
    sms_account_verification = models.BooleanField(default=False)
    
    # In-app preferences (always enabled by default)
    in_app_shipment_status = models.BooleanField(default=True)
    in_app_dispatch_assignment = models.BooleanField(default=True)
    in_app_gps_alert = models.BooleanField(default=True)
    in_app_maintenance_due = models.BooleanField(default=True)
    in_app_fuel_anomaly = models.BooleanField(default=True)
    in_app_password_reset = models.BooleanField(default=True)
    in_app_account_verification = models.BooleanField(default=True)
    
    # Daily digest settings
    daily_digest_enabled = models.BooleanField(default=True)
    daily_digest_time = models.TimeField(default="08:00")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Notification Preference"
        verbose_name_plural = "Notification Preferences"

    def __str__(self):
        return f"Notification preferences for {self.user.username}"