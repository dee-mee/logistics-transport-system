import uuid
from django.db import models
from organizations.models import Organization
from fleet.models import Vehicle, Driver
from orders.models import Shipment
from dispatch.models import Trip


class DashboardWidget(models.Model):
    """Customizable dashboard widgets for organizations."""
    
    class WidgetType(models.TextChoices):
        METRIC_CARD = "metric_card", "Metric Card"
        CHART = "chart", "Chart"
        TABLE = "table", "Table"
        MAP = "map", "Map"
        ALERT = "alert", "Alert"
        ACTIVITY_FEED = "activity_feed", "Activity Feed"
        
    class ChartType(models.TextChoices):
        LINE = "line", "Line Chart"
        BAR = "bar", "Bar Chart"
        PIE = "pie", "Pie Chart"
        AREA = "area", "Area Chart"
        DONUT = "donut", "Donut Chart"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='dashboard_widgets')
    
    widget_type = models.CharField(max_length=20, choices=WidgetType.choices)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Chart-specific settings
    chart_type = models.CharField(max_length=20, choices=ChartType.choices, blank=True)
    data_source = models.CharField(max_length=100, help_text="API endpoint or data source")
    data_query = models.JSONField(default=dict, blank=True, help_text="Query parameters for data source")
    
    # Layout settings
    position_x = models.PositiveIntegerField(default=0)
    position_y = models.PositiveIntegerField(default=0)
    width = models.PositiveIntegerField(default=4)  # Grid width (1-12)
    height = models.PositiveIntegerField(default=3)  # Grid height units
    
    # Display settings
    refresh_interval = models.PositiveIntegerField(default=300, help_text="Refresh interval in seconds")
    is_visible = models.BooleanField(default=True)
    
    # User customization
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    config = models.JSONField(default=dict, blank=True, help_text="Widget-specific configuration")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['position_y', 'position_x']
        indexes = [models.Index(fields=['organization', 'position_x', 'position_y'])]
    
    def __str__(self):
        return f"{self.title} ({self.widget_type})"


class SavedReport(models.Model):
    """Saved dashboard reports and analytics."""
    
    class ReportType(models.TextChoices):
        SUMMARY = "summary", "Summary Report"
        DETAILED = "detailed", "Detailed Report"
        FINANCIAL = "financial", "Financial Report"
        OPERATIONAL = "operational", "Operational Report"
        CUSTOM = "custom", "Custom Report"
        
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SCHEDULED = "scheduled", "Scheduled"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='saved_reports')
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    report_type = models.CharField(max_length=20, choices=ReportType.choices)
    
    # Report configuration
    data_sources = models.JSONField(default=list, help_text="List of data sources and queries")
    filters = models.JSONField(default=dict, help_text="Report filters and parameters")
    group_by = models.JSONField(default=list, help_text="Grouping and aggregation rules")
    
    # Scheduling
    schedule_type = models.CharField(max_length=20, blank=True, help_text="daily, weekly, monthly, etc.")
    schedule_config = models.JSONField(default=dict, blank=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    next_run_at = models.DateTimeField(null=True, blank=True)
    
    # Results
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    result_data = models.JSONField(default=dict, blank=True)
    result_summary = models.TextField(blank=True)
    
    # Sharing
    is_public = models.BooleanField(default=False, help_text="Visible to all organization members")
    shared_with = models.ManyToManyField('accounts.User', blank=True, related_name='shared_reports')
    
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['organization', 'report_type']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.report_type})"


class MetricSnapshot(models.Model):
    """Historical snapshots of key metrics for trend analysis."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='metric_snapshots')
    
    metric_name = models.CharField(max_length=100)
    metric_value = models.DecimalField(max_digits=15, decimal_places=2)
    metric_unit = models.CharField(max_length=20, blank=True)
    
    # Context
    period_start = models.DateField()
    period_end = models.DateField()
    dimensions = models.JSONField(default=dict, help_text="Additional dimensions (vehicle, driver, etc.)")
    
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('organization', 'metric_name', 'period_start', 'period_end')
        ordering = ['-period_start']
        indexes = [
            models.Index(fields=['organization', 'metric_name', '-period_start']),
            models.Index(fields=['organization', '-recorded_at']),
        ]
    
    def __str__(self):
        return f"{self.metric_name}: {self.metric_value} {self.metric_unit} ({self.period_start} to {self.period_end})"


class DashboardAlert(models.Model):
    """Alerts and notifications for dashboard events."""
    
    class AlertType(models.TextChoices):
        THRESHOLD = "threshold", "Threshold Breach"
        ANOMALY = "anomaly", "Anomaly Detected"
        SYSTEM = "system", "System Event"
        BUSINESS = "business", "Business Event"
        
    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        ERROR = "error", "Error"
        CRITICAL = "critical", "Critical"
        
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ACKNOWLEDGED = "acknowledged", "Acknowledged"
        RESOLVED = "resolved", "Resolved"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='dashboard_alerts')
    
    alert_type = models.CharField(max_length=20, choices=AlertType.choices)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.INFO)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Related entities
    related_vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='dashboard_alerts')
    related_driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='dashboard_alerts')
    related_shipment = models.ForeignKey(Shipment, on_delete=models.SET_NULL, null=True, blank=True, related_name='dashboard_alerts')
    related_trip = models.ForeignKey(Trip, on_delete=models.SET_NULL, null=True, blank=True, related_name='dashboard_alerts')
    
    # Threshold information
    threshold_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    actual_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Resolution
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_alerts')
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_alerts')
    resolution_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status', '-created_at']),
            models.Index(fields=['organization', 'severity', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.severity}"