from rest_framework import serializers
from .models import FuelTransaction, FuelCard, FuelConsumption, FuelAlert


class FuelTransactionSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    driver_name = serializers.CharField(source='driver.user.get_full_name', read_only=True)
    
    class Meta:
        model = FuelTransaction
        fields = ['id', 'organization', 'vehicle', 'vehicle_plate', 'driver', 'driver_name',
                  'transaction_type', 'fuel_type', 'date', 'location', 'station_name',
                  'quantity_liters', 'price_per_liter', 'total_cost', 'currency',
                  'odometer_reading', 'full_tank', 'receipt_number', 'notes',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class FuelCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelCard
        fields = ['id', 'organization', 'card_number', 'card_type', 'status', 'provider',
                  'cardholder_name', 'vehicles', 'daily_limit', 'weekly_limit', 'monthly_limit',
                  'expiry_date', 'pin', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class FuelCardDetailSerializer(FuelCardSerializer):
    vehicles_details = serializers.SerializerMethodField()
    
    class Meta(FuelCardSerializer.Meta):
        fields = FuelCardSerializer.Meta.fields + ['vehicles_details']
    
    def get_vehicles_details(self, obj):
        return [{'id': v.id, 'plate_number': v.plate_number, 'vehicle_type': v.vehicle_type} 
                for v in obj.vehicles.all()]


class FuelConsumptionSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    
    class Meta:
        model = FuelConsumption
        fields = ['id', 'organization', 'vehicle', 'vehicle_plate', 'period_start', 'period_end',
                  'total_distance_km', 'total_fuel_liters', 'total_cost',
                  'avg_consumption_l_per_100km', 'avg_cost_per_km', 'calculated_at']
        read_only_fields = ['id', 'calculated_at']


class FuelAlertSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    fuel_card_number = serializers.CharField(source='fuel_card.card_number', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    
    class Meta:
        model = FuelAlert
        fields = ['id', 'organization', 'vehicle', 'vehicle_plate', 'fuel_card', 'fuel_card_number',
                  'alert_type', 'severity', 'title', 'description', 'threshold_value', 'actual_value',
                  'is_resolved', 'resolved_at', 'resolved_by', 'resolved_by_name', 'resolution_notes',
                  'created_at']
        read_only_fields = ['id', 'created_at', 'resolved_at']


class FuelAlertUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelAlert
        fields = ['is_resolved', 'resolution_notes']