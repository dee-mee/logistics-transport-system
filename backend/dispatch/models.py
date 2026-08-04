import uuid
from django.db import models
from fleet.models import Vehicle, Driver
from orders.models import Shipment
from organizations.models import Organization


class Trip(models.Model):
    """A trip groups one or more shipments assigned to a vehicle + driver for a run."""

    class Status(models.TextChoices):
        PLANNED = "planned", "Planned"
        DISPATCHED = "dispatched", "Dispatched"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=20, unique=True, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="trips", null=True, blank=True)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name="trips")
    driver = models.ForeignKey(Driver, on_delete=models.PROTECT, related_name="trips")
    shipments = models.ManyToManyField(Shipment, related_name="trips", through="TripStop")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNED)
    scheduled_start = models.DateTimeField(null=True, blank=True)
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization']),
            models.Index(fields=['status']),
            models.Index(fields=['scheduled_start']),
        ]

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"TRIP-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.reference


class TripStop(models.Model):
    """An ordered stop within a trip — pickup or dropoff for a specific shipment."""

    class StopType(models.TextChoices):
        PICKUP = "pickup", "Pickup"
        DROPOFF = "dropoff", "Dropoff"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="stops")
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name="trip_stops")
    stop_type = models.CharField(max_length=10, choices=StopType.choices)
    sequence = models.PositiveIntegerField(help_text="Order of this stop within the trip")
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["trip", "sequence"]
        unique_together = ("trip", "shipment", "stop_type")

    def __str__(self):
        return f"{self.trip.reference} stop {self.sequence} ({self.stop_type})"
