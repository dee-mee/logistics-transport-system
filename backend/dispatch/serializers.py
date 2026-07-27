from rest_framework import serializers
from .models import Trip, TripStop


class TripStopSerializer(serializers.ModelSerializer):
    shipment_tracking_code = serializers.CharField(source="shipment.tracking_code", read_only=True)

    class Meta:
        model = TripStop
        fields = "__all__"


class TripSerializer(serializers.ModelSerializer):
    stops = TripStopSerializer(many=True, read_only=True)
    vehicle_plate = serializers.CharField(source="vehicle.plate_number", read_only=True)
    driver_name = serializers.CharField(source="driver.user.get_full_name", read_only=True)

    class Meta:
        model = Trip
        fields = "__all__"
        read_only_fields = ["reference"]
