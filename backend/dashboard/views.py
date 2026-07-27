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
        """Get default dashboard layout for new organizations."""
        default_widgets = [
            {
                'widget_type': 'metric_card',
                'title': 'Total Vehicles',
                'data_source': '/api/dashboard/metrics/',
                'data_query': {'metric': 'total_vehicles'},
                'position_x': 0,
                'position_y': 0,
                'width': 3,
                'height': 2
            },
            {
                'widget_type': 'metric_card',
                'title': 'Active Trips',
                'data_source': '/api/dashboard/metrics/',
                'data_query': {'metric': 'active_trips'},
                'position_x': 3,
                'position_y': 0,
                'width': 3,
                'height': 2
            },
            {
                'widget_type': 'metric_card',
                'title': 'Pending Shipments',
                'data_source': '/api/dashboard/metrics/',
                'data_query': {'metric': 'pending_shipments'},
                'position_x': 6,
                'position_y': 0,
                'width': 3,
                'height': 2
            },
            {
                'widget_type': 'metric_card',
                'title': 'Fuel Cost Today',
                'data_source': '/api/dashboard/metrics/',
                'data_query': {'metric': 'daily_fuel_cost'},
                'position_x': 9,
                'position_y': 0,
                'width': 3,
                'height': 2
            },
            {
                'widget_type': 'chart',
                'chart_type': 'line',
                'title': 'Shipments Trend',
                'data_source': '/api/dashboard/shipment_trend/',
                'position_x': 0,
                'position_y': 2,
                'width': 6,
                'height': 4
            },
            {
                'widget_type': 'chart',
                'chart_type': 'pie',
                'title': 'Vehicle Status',
                'data_source': '/api/dashboard/vehicle_status/',
                'position_x': 6,
                'position_y': 2,
                'width': 6,
                'height': 4
            },
            {
                'widget_type': 'activity_feed',
                'title': 'Recent Activity',
                'data_source': '/api/dashboard/activity_feed/',
                'position_x': 0,
                'position_y': 6,
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