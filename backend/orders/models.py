import uuid
from django.conf import settings
from django.db import models


class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='customers', null=True, blank=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customer_profile", null=True, blank=True
    )
    company_name = models.CharField(max_length=150, blank=True)
    contact_name = models.CharField(max_length=150)
    contact_phone = models.CharField(max_length=20)
    contact_email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['organization', 'contact_name'])]

    def __str__(self):
        return self.company_name or self.contact_name


class Shipment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        ASSIGNED = "assigned", "Assigned"
        IN_TRANSIT = "in_transit", "In Transit"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"
        FAILED = "failed", "Failed"

    class Priority(models.TextChoices):
        STANDARD = "standard", "Standard"
        EXPRESS = "express", "Express"
        URGENT = "urgent", "Urgent"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='shipments', null=True, blank=True)
    tracking_code = models.CharField(max_length=20, unique=True, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="shipments")

    pickup_address = models.CharField(max_length=255)
    pickup_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    pickup_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    pickup_contact_phone = models.CharField(max_length=20, blank=True)
    pickup_window_start = models.DateTimeField(null=True, blank=True)
    pickup_window_end = models.DateTimeField(null=True, blank=True)

    dropoff_address = models.CharField(max_length=255)
    dropoff_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    dropoff_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    dropoff_contact_phone = models.CharField(max_length=20, blank=True)

    cargo_description = models.CharField(max_length=255, blank=True)
    weight_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.STANDARD)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.tracking_code:
            self.tracking_code = f"SHP-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.tracking_code
