import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.files.storage import default_storage
import os
from organizations.models import Organization


def report_upload_path(instance, filename):
    """Generate upload path for report files."""
    # reports/{report_type}/{entity_id}/{filename}
    return f'reports/{instance.report_type}/{instance.entity_id or "global"}/{filename}'


class Report(models.Model):
    """Model for storing generated reports."""
    
    class ReportType(models.TextChoices):
        # Operational Reports
        TRIPS_SUMMARY = "trips_summary", "Trips Summary"
        FLEET_UTILIZATION = "fleet_utilization", "Fleet Utilization"
        DRIVER_PERFORMANCE = "driver_performance", "Driver Performance"
        DELIVERY_ANALYSIS = "delivery_analysis", "Delivery Analysis"
        
        # Financial Reports
        REVENUE_SUMMARY = "revenue_summary", "Revenue Summary"
        COST_ANALYSIS = "cost_analysis", "Cost Analysis"
        FUEL_CONSUMPTION = "fuel_consumption", "Fuel Consumption"
        MAINTENANCE_COSTS = "maintenance_costs", "Maintenance Costs"
        
        # Performance Reports
        ON_TIME_DELIVERY = "on_time_delivery", "On-Time Delivery"
        SAFETY_INCIDENTS = "safety_incidents", "Safety Incidents"
        CUSTOMER_SATISFACTION = "customer_satisfaction", "Customer Satisfaction"
        EFFICIENCY_METRICS = "efficiency_metrics", "Efficiency Metrics"
        
        # Document Reports
        DOCUMENT_COMPLIANCE = "document_compliance", "Document Compliance"
        EXPIRY_TRACKING = "expiry_tracking", "Expiry Tracking"
        VERIFICATION_STATUS = "verification_status", "Verification Status"
    
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        GENERATING = "generating", "Generating"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Organization
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='reports',
        null=True,
        blank=True
    )
    
    # Report details
    report_type = models.CharField(max_length=50, choices=ReportType.choices)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Entity relationship (optional - for entity-specific reports)
    entity_type = models.CharField(max_length=20, blank=True, help_text="user, vehicle, organization, etc.")
    entity_id = models.UUIDField(null=True, blank=True)
    
    # Date range
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    # Report file
    file = models.FileField(upload_to=report_upload_path, null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    file_format = models.CharField(max_length=10, default='pdf', help_text="pdf, csv, xlsx")
    
    # Generation tracking
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_reports'
    )
    generated_at = models.DateTimeField(null=True, blank=True)
    last_generated = models.DateTimeField(auto_now=True)
    
    # Report metadata
    parameters = models.JSONField(default=dict, blank=True, help_text="Report generation parameters")
    row_count = models.PositiveIntegerField(null=True, blank=True, help_text="Number of data rows")
    
    # Download tracking
    download_count = models.PositiveIntegerField(default=0)
    last_downloaded = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['report_type', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['generated_by', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_report_type_display()})"
    
    def save(self, *args, **kwargs):
        # Update file size and name if file is provided
        if self.file:
            self.file_name = self.file.name
            self.file_size = self.file.size
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        # Delete file from storage when report is deleted
        if self.file:
            if self.file.storage.exists(self.file.name):
                self.file.delete()
        super().delete(*args, **kwargs)


class ReportSchedule(models.Model):
    """Scheduled reports for automatic generation."""
    
    class Frequency(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        QUARTERLY = "quarterly", "Quarterly"
        YEARLY = "yearly", "Yearly"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Organization
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='report_schedules',
        null=True,
        blank=True
    )
    
    report_type = models.CharField(max_length=50, choices=Report.ReportType.choices)
    name = models.CharField(max_length=200)
    
    # Schedule details
    frequency = models.CharField(max_length=20, choices=Frequency.choices)
    next_run = models.DateTimeField()
    last_run = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Recipients
    recipients = models.JSONField(default=list, help_text="List of user IDs to email report to")
    
    # Report parameters
    parameters = models.JSONField(default=dict, blank=True)
    
    # Owner
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='scheduled_reports'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['next_run']
        indexes = [
            models.Index(fields=['next_run', 'is_active']),
            models.Index(fields=['frequency']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_frequency_display()})"