from django.contrib import admin
from .models import DashboardWidget, SavedReport, MetricSnapshot, DashboardAlert


@admin.register(DashboardWidget)
class DashboardWidgetAdmin(admin.ModelAdmin):
    list_display = ['title', 'widget_type', 'organization', 'position_x', 'position_y', 'is_visible']
    list_filter = ['widget_type', 'chart_type', 'is_visible', 'organization']
    search_fields = ['title', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(SavedReport)
class SavedReportAdmin(admin.ModelAdmin):
    list_display = ['name', 'report_type', 'status', 'organization', 'created_at']
    list_filter = ['report_type', 'status', 'created_at', 'organization']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at', 'last_run_at', 'next_run_at']
    filter_horizontal = ['shared_with']


@admin.register(MetricSnapshot)
class MetricSnapshotAdmin(admin.ModelAdmin):
    list_display = ['metric_name', 'metric_value', 'metric_unit', 'period_start', 'period_end', 'organization']
    list_filter = ['metric_name', 'period_start', 'period_end', 'organization']
    search_fields = ['metric_name']
    readonly_fields = ['id', 'recorded_at']


@admin.register(DashboardAlert)
class DashboardAlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'alert_type', 'severity', 'status', 'organization', 'created_at']
    list_filter = ['alert_type', 'severity', 'status', 'created_at', 'organization']
    search_fields = ['title', 'message']
    readonly_fields = ['id', 'created_at', 'acknowledged_at', 'resolved_at']