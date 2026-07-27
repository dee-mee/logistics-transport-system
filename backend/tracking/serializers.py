from rest_framework import serializers
from .models import ShipmentStatusEvent, VehicleLocationPing
from orders.models import Shipment


class ShipmentStatusEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentStatusEvent
        fields = "__all__"

    def create(self, validated_data):
        event = super().create(validated_data)
        # Keep the shipment's own status in sync with its latest event
        Shipment.objects.filter(pk=event.shipment_id).update(status=event.status)
        return event


class VehicleLocationPingSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleLocationPing
        fields = "__all__"


class PublicTrackingSerializer(serializers.ModelSerializer):
    """Minimal, no-auth-required view of a shipment's journey for a tracking code lookup."""

    status_events = ShipmentStatusEventSerializer(source="status_events.all", many=True, read_only=True)

    class Meta:
        model = Shipment
        fields = [
            "tracking_code", "status", "pickup_address", "dropoff_address",
            "priority", "created_at", "updated_at", "status_events",
        ]
