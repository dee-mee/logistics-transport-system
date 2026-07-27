import uuid
from django.db import models
from organizations.models import Organization
from fleet.models import Vehicle, Driver


class FuelTransaction(models.Model):
    """Records fuel purchases and consumption."""
    
    class TransactionType(models.TextChoices):
        PURCHASE = "purchase", "Purchase"
        REFUND = "refund", "Refund"
        ADJUSTMENT = "adjustment", "Adjustment"
        
    class FuelType(models.TextChoices):
        DIESEL = "diesel", "Diesel"
        PETROL = "petrol", "Petrol"
        ELECTRIC = "electric", "Electric"
        HYBRID = "hybrid", "Hybrid"
        GAS = "gas", "Gas"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='fuel_transactions')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='fuel_transactions')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='fuel_transactions')
    
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    fuel_type = models.CharField(max_length=20, choices=FuelType.choices)
    
    date = models.DateTimeField()
    location = models.CharField(max_length=255, blank=True)
    station_name = models.CharField(max_length=200, blank=True)
    
    quantity_liters = models.DecimalField(max_digits=10, decimal_places=2)
    price_per_liter = models.DecimalField(max_digits=6, decimal_places=3)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    
    odometer_reading = models.PositiveIntegerField(help_text="Vehicle odometer at time of fueling")
    full_tank = models.BooleanField(default=False, help_text="Was the tank filled completely?")
    
    receipt_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date']
        indexes = [
            models.Index(fields=['organization', 'vehicle', '-date']),
            models.Index(fields=['organization', '-date']),
        ]
    
    def __str__(self):
        return f"{self.vehicle.plate_number} - {self.quantity_liters}L @ {self.date}"


class FuelCard(models.Model):
    """Fuel cards for fleet vehicles."""
    
    class CardType(models.TextChoices):
        FLEET = "fleet", "Fleet Card"
        CREDIT = "credit", "Credit Card"
        DEBIT = "debit", "Debit Card"
        PREPAID = "prepaid", "Prepaid Card"
        
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        LOST = "lost", "Lost"
        EXPIRED = "expired", "Expired"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='fuel_cards')
    card_number = models.CharField(max_length=50, unique=True)
    card_type = models.CharField(max_length=20, choices=CardType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    
    provider = models.CharField(max_length=100, blank=True)
    cardholder_name = models.CharField(max_length=200, blank=True)
    
    vehicles = models.ManyToManyField(Vehicle, related_name='fuel_cards', blank=True)
    
    daily_limit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    weekly_limit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    monthly_limit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    expiry_date = models.DateField(null=True, blank=True)
    pin = models.CharField(max_length=10, blank=True, help_text="Encrypted PIN")
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['card_number']
        indexes = [models.Index(fields=['organization', 'card_number'])]
    
    def __str__(self):
        return f"{self.card_number} ({self.provider})"


class FuelConsumption(models.Model):
    """Tracks fuel consumption metrics for vehicles."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='fuel_consumption')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='fuel_consumption_records')
    
    period_start = models.DateField()
    period_end = models.DateField()
    
    total_distance_km = models.DecimalField(max_digits=10, decimal_places=2)
    total_fuel_liters = models.DecimalField(max_digits=10, decimal_places=2)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    
    avg_consumption_l_per_100km = models.DecimalField(max_digits=6, decimal_places=2)
    avg_cost_per_km = models.DecimalField(max_digits=6, decimal_places=3)
    
    calculated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('vehicle', 'period_start', 'period_end')
        ordering = ['-period_start']
        indexes = [
            models.Index(fields=['organization', 'vehicle', '-period_start']),
        ]
    
    def __str__(self):
        return f"{self.vehicle.plate_number} - {self.period_start} to {self.period_end}"


class FuelAlert(models.Model):
    """Alerts for fuel-related issues."""
    
    class AlertType(models.TextChoices):
        HIGH_CONSUMPTION = "high_consumption", "High Consumption"
        LOW_FUEL = "low_fuel", "Low Fuel"
        CARD_EXPIRY = "card_expiry", "Card Expiry"
        PRICE_SPIKE = "price_spike", "Price Spike"
        FRAUD_SUSPECTED = "fraud_suspected", "Fraud Suspected"
        
    class Severity(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='fuel_alerts')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='fuel_alerts', null=True, blank=True)
    fuel_card = models.ForeignKey(FuelCard, on_delete=models.CASCADE, related_name='alerts', null=True, blank=True)
    
    alert_type = models.CharField(max_length=30, choices=AlertType.choices)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MEDIUM)
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    threshold_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    actual_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'is_resolved', '-created_at']),
            models.Index(fields=['organization', 'vehicle', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.vehicle.plate_number if self.vehicle else 'General'}"