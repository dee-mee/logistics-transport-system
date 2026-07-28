from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DashboardWidgetViewSet, SavedReportViewSet, MetricSnapshotViewSet,
    DashboardAlertViewSet, DashboardMetricsViewSet
)

router = DefaultRouter()
router.register(r'widgets', DashboardWidgetViewSet, basename='dashboard-widget')
router.register(r'reports', SavedReportViewSet, basename='saved-report')
router.register(r'metrics-snapshots', MetricSnapshotViewSet, basename='metric-snapshot')
router.register(r'alerts', DashboardAlertViewSet, basename='dashboard-alert')

urlpatterns = [
    path('', include(router.urls)),
    path('metrics/', DashboardMetricsViewSet.as_view({'get': 'list'}), name='dashboard-metrics'),
    path('metrics/vehicle-status/', DashboardMetricsViewSet.as_view({'get': 'vehicle_status'}), name='vehicle-status'),
    path('metrics/shipment-status/', DashboardMetricsViewSet.as_view({'get': 'shipment_status'}), name='shipment-status'),
    path('metrics/shipment-trend/', DashboardMetricsViewSet.as_view({'get': 'shipment_trend'}), name='shipment-trend'),
    path('metrics/weekly-performance/', DashboardMetricsViewSet.as_view({'get': 'weekly_performance'}), name='weekly-performance'),
    path('metrics/activity-feed/', DashboardMetricsViewSet.as_view({'get': 'activity_feed'}), name='activity-feed'),
    path('metrics/alerts/', DashboardMetricsViewSet.as_view({'get': 'alerts'}), name='alerts'),
    path('metrics/fuel-trend/', DashboardMetricsViewSet.as_view({'get': 'fuel_trend'}), name='fuel-trend'),
    # New dashboard endpoints
    path('stats/', DashboardMetricsViewSet.as_view({'get': 'stats'}), name='dashboard-stats'),
    path('active-orders/', DashboardMetricsViewSet.as_view({'get': 'active_orders'}), name='active-orders'),
    path('transactions/', DashboardMetricsViewSet.as_view({'get': 'transactions'}), name='transactions'),
    path('order-waypoints/', DashboardMetricsViewSet.as_view({'get': 'order_waypoints'}), name='order-waypoints'),
    path('order-trip-details/', DashboardMetricsViewSet.as_view({'get': 'order_trip_details'}), name='order-trip-details'),
]