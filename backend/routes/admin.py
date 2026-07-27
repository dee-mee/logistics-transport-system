from django.contrib import admin
from .models import Route, RouteStop, RouteOptimization, RouteTemplate


class RouteStopInline(admin.TabularInline):
    model = RouteStop
    extra = 0
    fields = ['sequence_number', 'name', 'stop_type', 'status', 'address', 'planned_arrival_time', 'planned_departure_time']


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ['name', 'route_type', 'status', 'vehicle', 'driver', 'planned_start_time', 'total_distance_km']
    list_filter = ['route_type', 'status', 'optimization_level', 'planned_start_time']
    search_fields = ['name', 'description', 'vehicle__plate_number', 'driver__user__username']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [RouteStopInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'route_type', 'status', 'optimization_level')
        }),
        ('Scheduling', {
            'fields': ('planned_start_time', 'planned_end_time', 'actual_start_time', 'actual_end_time')
        }),
        ('Assignment', {
            'fields': ('vehicle', 'driver')
        }),
        ('Route Details', {
            'fields': ('total_distance_km', 'estimated_duration_minutes', 'actual_distance_km', 'actual_duration_minutes')
        }),
        ('Cost Estimates', {
            'fields': ('estimated_fuel_cost', 'estimated_labor_cost', 'total_estimated_cost')
        }),
        ('Additional', {
            'fields': ('notes',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at')
        }),
    )


@admin.register(RouteStop)
class RouteStopAdmin(admin.ModelAdmin):
    list_display = ['route', 'sequence_number', 'name', 'stop_type', 'status', 'planned_arrival_time']
    list_filter = ['stop_type', 'status', 'planned_arrival_time']
    search_fields = ['name', 'address', 'route__name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(RouteOptimization)
class RouteOptimizationAdmin(admin.ModelAdmin):
    list_display = ['route', 'method', 'status', 'distance_savings_percent', 'duration_savings_percent', 'created_at']
    list_filter = ['method', 'status', 'created_at']
    search_fields = ['route__name']
    readonly_fields = ['id', 'created_at', 'started_at', 'completed_at']


@admin.register(RouteTemplate)
class RouteTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'template_type', 'is_active', 'usage_count', 'max_stops']
    list_filter = ['template_type', 'is_active']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']