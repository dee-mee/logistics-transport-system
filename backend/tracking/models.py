import uuid
from django.db import models
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
    """Periodic GPS ping from a vehicle/driver device, used to render live position."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="location_pings")
    lat = models.DecimalField(max_digits=9, decimal_places=6)
    lng = models.DecimalField(max_digits=9, decimal_places=6)
    speed_kmh = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    heading_deg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["vehicle", "-recorded_at"])]

    def __str__(self):
        return f"{self.vehicle.plate_number} @ {self.recorded_at}"
