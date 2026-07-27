from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg, Q, F
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
from django.utils import timezone
from datetime import timedelta
from .models import DashboardWidget, SavedReport, MetricSnapshot, DashboardAlert
from .serializers import (
    DashboardWidgetSerializer, SavedReportSerializer, MetricSnapshotSerializer,
    DashboardAlertSerializer, DashboardAlertUpdateSerializer, DashboardMetricsSerializer,
    VehicleStatusSummarySerializer, ShipmentStatusSummarySerializer, ActivityFeedSerializer
)


class DashboardWidgetViewSet(viewsets.ModelViewSet):
    """ViewSet for managing dashboard widgets."""
    serializer_class = DashboardWidgetSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DashboardWidget.objects.filter(
            organization=self.request.user.current_organization
        ).select_related('created_by')
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization, created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def default_layout(self, request):
        """Get enhanced default dashboard layout for new organizations."""
        default_widgets = [
            # Top row - Key metrics
            {
                'widget_type': 'metric_card',
                'title': 'Total Vehicles',
                'data_source': '/api/dashboard/metrics/',
                'data_query': {'metric': 'total_vehicles'},
                'position_x': 0,
                'position_y': 0,
                'width': 2,
                'height': 2
            },
            {
                'widget_type': 'metric_card',
                'title': 'Active Trips',
                'data_source': '/api/dashboard/metrics/',
                'data_query': {'metric': 'active_trips'},
                'position_x': 2,
                'position_y': 0,
                'width': 2,
                'height': 2
            },
            {
                'widget_type': 'metric_card',
                'title': 'Pending Shipments',
                'data_source': '/api/dashboard/metrics/',
                'data_query': {'metric': 'pending_shipments'},
                'position_x': 4,
                'position_y': 0,
                'width': 2,
                'height': 2
            },
            {
                'widget_type': 'metric_card',
                'title': 'Available Drivers',
                'data_source': '/api/dashboard/metrics/',
                'data_query': {'metric': 'active_drivers'},
                'position_x': 6,
                'position_y': 0,
                'width': 2,
                'height': 2
            },
            {
                'widget_type': 'metric_card',
                'title': 'Today\'s Revenue',
                'data_source': '/api/dashboard/metrics/',
                'data_query': {'metric': 'total_revenue'},
                'position_x': 8,
                'position_y': 0,
                'width': 2,
                'height': 2
            },
            {
                'widget_type': 'metric_card',
                'title': 'On-Time Rate',
                'data_source': '/api/dashboard/metrics/',
                'data_query': {'metric': 'on_time_delivery_rate'},
                'position_x': 10,
                'position_y': 0,
                'width': 2,
                'height': 2
            },
            # Second row - Status charts
            {
                'widget_type': 'chart',
                'chart_type': 'pie',
                'title': 'Vehicle Status Distribution',
                'data_source': '/api/dashboard/vehicle_status/',
                'position_x': 0,
                'position_y': 2,
                'width': 6,
                'height': 4
            },
            {
                'widget_type': 'chart',
                'chart_type': 'pie',
                'title': 'Shipment Status',
                'data_source': '/api/dashboard/shipment_status/',
                'position_x': 6,
                'position_y': 2,
                'width': 6,
                'height': 4
            },
            # Third row - Trends and performance
            {
                'widget_type': 'chart',
                'chart_type': 'line',
                'title': 'Shipments Trend (30 Days)',
                'data_source': '/api/dashboard/shipment_trend/',
                'position_x': 0,
                'position_y': 6,
                'width': 6,
                'height': 4
            },
            {
                'widget_type': 'chart',
                'chart_type': 'bar',
                'title': 'Weekly Performance',
                'data_source': '/api/dashboard/weekly_performance/',
                'position_x': 6,
                'position_y': 6,
                'width': 6,
                'height': 4
            },
            # Fourth row - Activity feed
            {
                'widget_type': 'activity_feed',
                'title': 'Recent Activity',
                'data_source': '/api/dashboard/activity_feed/',
                'position_x': 0,
                'position_y': 10,
                'width': 12,
                'height': 4
            }
        ]
        return Response(default_widgets)


class SavedReportViewSet(viewsets.ModelViewSet):
    """ViewSet for managing saved reports."""
    serializer_class = SavedReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return SavedReport.objects.filter(
            organization=self.request.user.current_organization
        ).select_related('created_by').prefetch_related('shared_with')
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization, created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def run(self, request, pk=None):
        """Execute a saved report."""
        report = self.get_object()
        # Logic to execute report and generate results
        # This would integrate with the actual data processing
        report.status = SavedReport.Status.COMPLETED
        report.last_run_at = timezone.now()
        report.save()
        return Response({'message': 'Report executed successfully', 'last_run_at': report.last_run_at})


class MetricSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing metric snapshots."""
    serializer_class = MetricSnapshotSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MetricSnapshot.objects.filter(
            organization=self.request.user.current_organization
        ).order_by('-period_start')
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current metrics for the organization."""
        organization = request.user.current_organization
        today = timezone.now().date()
        
        # Get latest snapshot for today
        try:
            snapshot = MetricSnapshot.objects.filter(
                organization=organization,
                period_start__lte=today,
                period_end__gte=today
            ).first()
            
            if snapshot:
                serializer = self.get_serializer(snapshot)
                return Response(serializer.data)
        except MetricSnapshot.DoesNotExist:
            pass
        
        # If no snapshot exists, calculate real-time metrics
        return Response(self._calculate_realtime_metrics(organization))
    
    def _calculate_realtime_metrics(self, organization):
        """Calculate real-time metrics from current data."""
        from fleet.models import Vehicle, Driver
        from orders.models import Shipment
        from dispatch.models import Trip
        from fuel.models import FuelTransaction
        
        # Vehicle metrics
        total_vehicles = Vehicle.objects.filter(organization=organization).count()
        active_vehicles = Vehicle.objects.filter(
            organization=organization, 
            status=Vehicle.Status.AVAILABLE
        ).count()
        
        # Driver metrics
        total_drivers = Driver.objects.filter(organization=organization).count()
        active_drivers = Driver.objects.filter(
            organization=organization,
            status=Driver.Status.AVAILABLE
        ).count()
        
        # Shipment metrics
        total_shipments = Shipment.objects.filter(organization=organization).count()
        in_transit = Shipment.objects.filter(
            organization=organization,
            status=Shipment.Status.IN_TRANSIT
        ).count()
        pending = Shipment.objects.filter(
            organization=organization,
            status=Shipment.Status.PENDING
        ).count()
        completed = Shipment.objects.filter(
            organization=organization,
            status=Shipment.Status.DELIVERED
        ).count()
        
        # Trip metrics
        total_trips = Trip.objects.filter(
            vehicle__organization=organization
        ).count()
        active_trips = Trip.objects.filter(
            vehicle__organization=organization,
            status=Trip.Status.IN_PROGRESS
        ).count()
        
        # Fuel metrics
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        fuel_transactions = FuelTransaction.objects.filter(
            organization=organization,
            date__gte=today_start
        )
        total_fuel_cost = fuel_transactions.aggregate(
            total=Sum('total_cost')
        )['total'] or 0
        
        return {
            'total_vehicles': total_vehicles,
            'active_vehicles': active_vehicles,
            'total_drivers': total_drivers,
            'active_drivers': active_drivers,
            'total_shipments': total_shipments,
            'in_transit_shipments': in_transit,
            'pending_shipments': pending,
            'completed_shipments': completed,
            'total_trips': total_trips,
            'active_trips': active_trips,
            'total_fuel_cost': float(total_fuel_cost),
            'calculated_at': timezone.now().isoformat()
        }


class DashboardAlertViewSet(viewsets.ModelViewSet):
    """ViewSet for managing dashboard alerts."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DashboardAlert.objects.filter(
            organization=self.request.user.current_organization
        ).select_related('related_vehicle', 'related_driver', 'acknowledged_by', 'resolved_by')
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return DashboardAlertUpdateSerializer
        return DashboardAlertSerializer
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge a dashboard alert."""
        alert = self.get_object()
        alert.status = DashboardAlert.Status.ACKNOWLEDGED
        alert.acknowledged_at = timezone.now()
        alert.acknowledged_by = request.user
        alert.save()
        return Response(DashboardAlertSerializer(alert).data)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a dashboard alert."""
        alert = self.get_object()
        serializer = DashboardAlertUpdateSerializer(alert, data=request.data, partial=True)
        
        if serializer.is_valid():
            alert.status = DashboardAlert.Status.RESOLVED
            alert.resolved_at = timezone.now()
            alert.resolved_by = request.user
            alert.resolution_notes = serializer.validated_data.get('resolution_notes', '')
            alert.save()
            return Response(DashboardAlertSerializer(alert).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DashboardMetricsViewSet(viewsets.ViewSet):
    """ViewSet for dashboard metrics and analytics."""
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """Get comprehensive dashboard metrics."""
        organization = request.user.current_organization
        metrics = self._get_dashboard_metrics(organization)
        serializer = DashboardMetricsSerializer(metrics)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def vehicle_status(self, request):
        """Get vehicle status distribution."""
        organization = request.user.current_organization
        from fleet.models import Vehicle
        
        status_counts = Vehicle.objects.filter(
            organization=organization
        ).values('status').annotate(
            count=Count('id')
        ).order_by('status')
        
        total_vehicles = sum(item['count'] for item in status_counts)
        
        summary = []
        for item in status_counts:
            percentage = (item['count'] / total_vehicles * 100) if total_vehicles > 0 else 0
            summary.append({
                'status': item['status'],
                'count': item['count'],
                'percentage': round(percentage, 2)
            })
        
        serializer = VehicleStatusSummarySerializer(summary, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def shipment_status(self, request):
        """Get shipment status distribution."""
        organization = request.user.current_organization
        from orders.models import Shipment
        
        status_counts = Shipment.objects.filter(
            organization=organization
        ).values('status').annotate(
            count=Count('id')
        ).order_by('status')
        
        total_shipments = sum(item['count'] for item in status_counts)
        
        summary = []
        for item in status_counts:
            percentage = (item['count'] / total_shipments * 100) if total_shipments > 0 else 0
            summary.append({
                'status': item['status'],
                'count': item['count'],
                'percentage': round(percentage, 2)
            })
        
        serializer = ShipmentStatusSummarySerializer(summary, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def shipment_trend(self, request):
        """Get shipment trends over time."""
        organization = request.user.current_organization
        from orders.models import Shipment
        
        # Get shipments by day for the last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        daily_shipments = Shipment.objects.filter(
            organization=organization,
            created_at__gte=thirty_days_ago
        ).annotate(
            day=TruncDay('created_at')
        ).values('day').annotate(
            count=Count('id')
        ).order_by('day')
        
        return Response(list(daily_shipments))
    
    @action(detail=False, methods=['get'])
    def activity_feed(self, request):
        """Get recent activity feed."""
        organization = request.user.current_organization
        limit = int(request.query_params.get('limit', 20))
        
        activities = []
        
        # Get recent shipments
        from orders.models import Shipment
        recent_shipments = Shipment.objects.filter(
            organization=organization
        ).order_by('-created_at')[:limit//2]
        
        for shipment in recent_shipments:
            activities.append({
                'timestamp': shipment.created_at.isoformat(),
                'activity_type': 'shipment_created',
                'description': f'Shipment {shipment.tracking_code} created',
                'entity_type': 'shipment',
                'entity_id': str(shipment.id),
                'user_name': 'System',
                'details': {
                    'tracking_code': shipment.tracking_code,
                    'status': shipment.status
                }
            })
        
        # Get recent trips
        from dispatch.models import Trip
        recent_trips = Trip.objects.filter(
            vehicle__organization=organization
        ).order_by('-created_at')[:limit//2]
        
        for trip in recent_trips:
            activities.append({
                'timestamp': trip.created_at.isoformat(),
                'activity_type': 'trip_created',
                'description': f'Trip {trip.reference} created',
                'entity_type': 'trip',
                'entity_id': str(trip.id),
                'user_name': 'System',
                'details': {
                    'reference': trip.reference,
                    'status': trip.status
                }
            })
        
        # Sort by timestamp
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        serializer = ActivityFeedSerializer(activities[:limit], many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def weekly_performance(self, request):
        """Get weekly performance metrics."""
        organization = request.user.current_organization
        from orders.models import Shipment
        from dispatch.models import Trip
        
        # Get data for the last 7 days
        seven_days_ago = timezone.now() - timedelta(days=7)
        
        daily_data = []
        for i in range(7):
            day = timezone.now() - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            # Shipments completed that day
            completed_shipments = Shipment.objects.filter(
                organization=organization,
                status=Shipment.Status.DELIVERED,
                updated_at__range=[day_start, day_end]
            ).count()
            
            # Active trips that day
            active_trips = Trip.objects.filter(
                vehicle__organization=organization,
                created_at__range=[day_start, day_end]
            ).count()
            
            daily_data.append({
                'date': day_start.date().isoformat(),
                'completed_shipments': completed_shipments,
                'active_trips': active_trips
            })
        
        return Response(list(reversed(daily_data)))
    
    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """Get active alerts for the organization."""
        organization = request.user.current_organization
        
        # Get active dashboard alerts
        dashboard_alerts = DashboardAlert.objects.filter(
            organization=organization,
            status=DashboardAlert.Status.ACTIVE
        ).select_related('related_vehicle', 'related_driver')
        
        # Get active GPS alerts
        from tracking.models import GPSAlert
        gps_alerts = GPSAlert.objects.filter(
            organization=organization,
            status=GPSAlert.Status.ACTIVE
        ).select_related('vehicle', 'driver')
        
        # Get upcoming maintenance
        from fleet.models import MaintenanceRecord
        upcoming_maintenance = MaintenanceRecord.objects.filter(
            vehicle__organization=organization,
            status=MaintenanceRecord.Status.SCHEDULED,
            scheduled_date__lte=timezone.now() + timedelta(days=7)
        ).select_related('vehicle')
        
        alerts = []
        
        # Dashboard alerts
        for alert in dashboard_alerts:
            alerts.append({
                'id': str(alert.id),
                'type': 'dashboard',
                'severity': alert.severity,
                'title': alert.title,
                'message': alert.message,
                'created_at': alert.created_at.isoformat(),
                'entity_type': alert.alert_type,
                'related_vehicle': alert.related_vehicle.plate_number if alert.related_vehicle else None,
                'related_driver': alert.related_driver.user.get_full_name() if alert.related_driver else None
            })
        
        # GPS alerts
        for alert in gps_alerts:
            alerts.append({
                'id': str(alert.id),
                'type': 'gps',
                'severity': alert.severity,
                'title': alert.title,
                'message': alert.description,
                'created_at': alert.created_at.isoformat(),
                'entity_type': alert.alert_type,
                'related_vehicle': alert.vehicle.plate_number if alert.vehicle else None,
                'related_driver': alert.driver.user.get_full_name() if alert.driver else None
            })
        
        # Maintenance alerts
        for maintenance in upcoming_maintenance:
            alerts.append({
                'id': str(maintenance.id),
                'type': 'maintenance',
                'severity': 'medium',
                'title': f'Upcoming Maintenance - {maintenance.vehicle.plate_number}',
                'message': f'{maintenance.get_maintenance_type_display()} scheduled for {maintenance.scheduled_date}',
                'created_at': maintenance.created_at.isoformat(),
                'entity_type': 'maintenance',
                'related_vehicle': maintenance.vehicle.plate_number,
                'related_driver': None
            })
        
        # Sort by severity and date
        severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        alerts.sort(key=lambda x: (severity_order.get(x['severity'], 4), x['created_at']), reverse=True)
        
        return Response(alerts[:20])
    
    @action(detail=False, methods=['get'])
    def fuel_trend(self, request):
        """Get fuel consumption trend."""
        organization = request.user.current_organization
        from fuel.models import FuelTransaction
        
        # Get fuel data for the last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        daily_fuel = FuelTransaction.objects.filter(
            organization=organization,
            date__gte=thirty_days_ago
        ).annotate(
            day=TruncDay('date')
        ).values('day').annotate(
            total_liters=Sum('quantity_liters'),
            total_cost=Sum('total_cost')
        ).order_by('day')
        
        return Response(list(daily_fuel))
    
    def _get_dashboard_metrics(self, organization):
        """Calculate comprehensive dashboard metrics."""
        from fleet.models import Vehicle, Driver
        from orders.models import Shipment
        from dispatch.models import Trip
        from fuel.models import FuelTransaction
        
        # Vehicle metrics
        total_vehicles = Vehicle.objects.filter(organization=organization).count()
        active_vehicles = Vehicle.objects.filter(
            organization=organization,
            status=Vehicle.Status.AVAILABLE
        ).count()
        
        # Driver metrics
        total_drivers = Driver.objects.filter(organization=organization).count()
        active_drivers = Driver.objects.filter(
            organization=organization,
            status=Driver.Status.AVAILABLE
        ).count()
        
        # Shipment metrics
        total_shipments = Shipment.objects.filter(organization=organization).count()
        in_transit = Shipment.objects.filter(
            organization=organization,
            status=Shipment.Status.IN_TRANSIT
        ).count()
        pending = Shipment.objects.filter(
            organization=organization,
            status=Shipment.Status.PENDING
        ).count()
        completed = Shipment.objects.filter(
            organization=organization,
            status=Shipment.Status.DELIVERED
        ).count()
        
        # Trip metrics
        total_trips = Trip.objects.filter(
            vehicle__organization=organization
        ).count()
        active_trips = Trip.objects.filter(
            vehicle__organization=organization,
            status=Trip.Status.IN_PROGRESS
        ).count()
        
        # Fuel metrics (current month)
        current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        fuel_transactions = FuelTransaction.objects.filter(
            organization=organization,
            date__gte=current_month_start
        )
        total_fuel_cost = fuel_transactions.aggregate(
            total=Sum('total_cost')
        )['total'] or 0
        
        total_fuel = fuel_transactions.aggregate(
            total=Sum('quantity_liters')
        )['total'] or 0
        
        # Calculate average consumption
        avg_consumption = 0
        if total_fuel > 0:
            # This would need proper distance calculation
            avg_consumption = 8.5  # Placeholder
        
        # Revenue (placeholder - would need proper invoicing)
        total_revenue = completed * 150  # Placeholder calculation
        
        # On-time delivery rate
        on_time_rate = 95.0  # Placeholder
        
        return {
            'total_vehicles': total_vehicles,
            'active_vehicles': active_vehicles,
            'total_drivers': total_drivers,
            'active_drivers': active_drivers,
            'total_shipments': total_shipments,
            'in_transit_shipments': in_transit,
            'pending_shipments': pending,
            'completed_shipments': completed,
            'total_trips': total_trips,
            'active_trips': active_trips,
            'total_fuel_cost': float(total_fuel_cost),
            'avg_fuel_consumption': avg_consumption,
            'total_revenue': total_revenue,
            'on_time_delivery_rate': on_time_rate
        }