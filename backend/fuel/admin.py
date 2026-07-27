from django.contrib import admin
from .models import FuelTransaction, FuelCard, FuelConsumption, FuelAlert


@admin.register(FuelTransaction)
class FuelTransactionAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'date', 'fuel_type', 'quantity_liters', 'total_cost', 'transaction_type']
    list_filter = ['transaction_type', 'fuel_type', 'date', 'organization']
    search_fields = ['vehicle__plate_number', 'receipt_number', 'station_name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(FuelCard)
class FuelCardAdmin(admin.ModelAdmin):
    list_display = ['card_number', 'card_type', 'provider', 'status', 'expiry_date']
    list_filter = ['card_type', 'status', 'expiry_date', 'organization']
    search_fields = ['card_number', 'provider', 'cardholder_name']
    filter_horizontal = ['vehicles']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(FuelConsumption)
class FuelConsumptionAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'period_start', 'period_end', 'avg_consumption_l_per_100km', 'avg_cost_per_km']
    list_filter = ['period_start', 'period_end', 'organization']
    search_fields = ['vehicle__plate_number']
    readonly_fields = ['id', 'calculated_at']


@admin.register(FuelAlert)
class FuelAlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'alert_type', 'severity', 'vehicle', 'is_resolved', 'created_at']
    list_filter = ['alert_type', 'severity', 'is_resolved', 'created_at', 'organization']
    search_fields = ['title', 'description', 'vehicle__plate_number']
    readonly_fields = ['id', 'created_at', 'resolved_at']