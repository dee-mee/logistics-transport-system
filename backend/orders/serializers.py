from rest_framework import serializers
from .models import Customer, Shipment


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"


class ShipmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    driver_name = serializers.SerializerMethodField()
    vehicle_plate = serializers.CharField(source="vehicle.plate_number", read_only=True)

    class Meta:
        model = Shipment
        fields = "__all__"
        read_only_fields = ["tracking_code"]

    def get_customer_name(self, obj):
        try:
            if hasattr(obj.customer, 'contact_name'):
                return obj.customer.contact_name
            elif hasattr(obj.customer, 'company_name'):
                return obj.customer.company_name
            return str(obj.customer)
        except Exception:
            return str(obj.customer)

    def get_driver_name(self, obj):
        try:
            if obj.driver and hasattr(obj.driver, 'user') and obj.driver.user:
                return obj.driver.user.get_full_name()
            elif obj.driver:
                return str(obj.driver)
            return None
        except Exception:
            return None
