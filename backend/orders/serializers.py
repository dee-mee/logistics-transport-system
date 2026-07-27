from rest_framework import serializers
from .models import Customer, Shipment


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"


class ShipmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.contact_name", read_only=True)

    class Meta:
        model = Shipment
        fields = "__all__"
        read_only_fields = ["tracking_code"]
