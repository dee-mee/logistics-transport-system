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
from permissions.permissions import HasModuleAccess
from permissions.models import PermissionGroup


class DashboardWidgetViewSet(viewsets.ModelViewSet):
    """ViewSet for managing dashboard widgets."""
    module = PermissionGroup.Module.DASHBOARD
    permission_classes = [HasModuleAccess]
    serializer_class = DashboardWidgetSerializer
    queryset = DashboardWidget.objects.all()
    
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
    module = PermissionGroup.Module.DASHBOARD
    permission_classes = [HasModuleAccess]
    serializer_class = SavedReportSerializer
    queryset = SavedReport.objects.all()
    
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
    module = PermissionGroup.Module.DASHBOARD
    permission_classes = [HasModuleAccess]
    serializer_class = MetricSnapshotSerializer
    queryset = MetricSnapshot.objects.all()
    
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
    module = PermissionGroup.Module.DASHBOARD
    permission_classes = [HasModuleAccess]
    queryset = DashboardAlert.objects.all()
    
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
    module = PermissionGroup.Module.DASHBOARD
    permission_classes = [HasModuleAccess]
    queryset = None  # This is a read-only ViewSet without models
    
    def list(self, request):
        """Get comprehensive dashboard metrics."""
        organization = request.user.current_organization
        metrics = self._get_dashboard_metrics(organization)
        serializer = DashboardMetricsSerializer(metrics)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get stats for the new dashboard design."""
        organization = request.user.current_organization
        from fleet.models import Vehicle, Driver
        from orders.models import Shipment
        from dispatch.models import Trip
        from fuel.models import FuelTransaction
        
        # Calculate stats with deltas
        total_orders = Shipment.objects.filter(organization=organization).count()
        total_shipments = Shipment.objects.filter(organization=organization).count()
        
        # Calculate revenue from actual shipment costs
        total_revenue = Shipment.objects.filter(organization=organization).aggregate(
            total=Sum('price')
        )['total'] or 0
        
        # Calculate expenses (fuel costs)
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        fuel_transactions = FuelTransaction.objects.filter(
            organization=organization,
            date__gte=today_start
        )
        total_expense = fuel_transactions.aggregate(
            total=Sum('total_cost')
        )['total'] or 0
        
        # Calculate weekly deltas
        week_ago = timezone.now() - timedelta(days=7)
        week_ago_orders = Shipment.objects.filter(
            organization=organization,
            created_at__gte=week_ago
        ).count()
        two_weeks_ago = timezone.now() - timedelta(days=14)
        two_weeks_ago_orders = Shipment.objects.filter(
            organization=organization,
            created_at__gte=two_weeks_ago,
            created_at__lt=week_ago
        ).count()
        
        orders_delta = 0
        if two_weeks_ago_orders > 0:
            orders_delta = ((week_ago_orders - two_weeks_ago_orders) / two_weeks_ago_orders) * 100
        
        # Calculate revenue delta
        week_ago_revenue = Shipment.objects.filter(
            organization=organization,
            created_at__gte=week_ago
        ).aggregate(total=Sum('price'))['total'] or 0
        two_weeks_ago_revenue = Shipment.objects.filter(
            organization=organization,
            created_at__gte=two_weeks_ago,
            created_at__lt=week_ago
        ).aggregate(total=Sum('price'))['total'] or 0
        revenue_delta = 0
        if two_weeks_ago_revenue > 0:
            revenue_delta = ((week_ago_revenue - two_weeks_ago_revenue) / two_weeks_ago_revenue) * 100
        
        # Calculate expense delta
        week_ago_expense = FuelTransaction.objects.filter(
            organization=organization,
            date__gte=week_ago
        ).aggregate(total=Sum('total_cost'))['total'] or 0
        two_weeks_ago_expense = FuelTransaction.objects.filter(
            organization=organization,
            date__gte=two_weeks_ago,
            date__lt=week_ago
        ).aggregate(total=Sum('total_cost'))['total'] or 0
        expense_delta = 0
        if two_weeks_ago_expense > 0:
            expense_delta = ((week_ago_expense - two_weeks_ago_expense) / two_weeks_ago_expense) * 100
        
        return Response({
            'totalOrders': {
                'value': str(total_orders),
                'delta': round(orders_delta, 1),
                'deltaDirection': 'up' if orders_delta >= 0 else 'down'
            },
            'totalShipments': {
                'value': str(total_shipments),
                'delta': round(orders_delta, 1),
                'deltaDirection': 'up' if orders_delta >= 0 else 'down'
            },
            'revenue': {
                'value': f'${total_revenue:,.0f}',
                'delta': round(revenue_delta, 1),
                'deltaDirection': 'up' if revenue_delta >= 0 else 'down'
            },
            'totalExpense': {
                'value': f'${total_expense:,.0f}',
                'delta': round(expense_delta, 1),
                'deltaDirection': 'up' if expense_delta >= 0 else 'down'
            }
        })
    
    @action(detail=False, methods=['get'])
    def active_orders(self, request):
        """Get active orders for the dashboard."""
        organization = request.user.current_organization
        from orders.models import Shipment
        
        # Get recent shipments with various statuses
        active_shipments = Shipment.objects.filter(
            organization=organization
        ).exclude(
            status__in=[Shipment.Status.DELIVERED, Shipment.Status.CANCELLED]
        ).order_by('-created_at')[:3]
        
        orders = []
        for shipment in active_shipments:
            # Map status to new dashboard format
            status_map = {
                Shipment.Status.PENDING: 'no_connection',
                Shipment.Status.IN_TRANSIT: 'in_transit',
                Shipment.Status.DELIVERED: 'delivered',
                Shipment.Status.CANCELLED: 'idle_timeout',
            }
            status = status_map.get(shipment.status, 'unknown')
            
            orders.append({
                'id': str(shipment.id),
                'status': status,
                'category': shipment.cargo_description or 'General',
                'pickupDate': shipment.pickup_window_start.strftime('%Y-%m-%d %H:%M') if shipment.pickup_window_start else 'TBD',
                'pickupAddress': shipment.pickup_address or 'Unknown',
                'dropoffDate': shipment.pickup_window_end.strftime('%Y-%m-%d %H:%M') if shipment.pickup_window_end else 'TBD',
                'dropoffAddress': shipment.dropoff_address or 'Unknown',
            })
        
        return Response(orders)
    
    @action(detail=False, methods=['get'])
    def transactions(self, request):
        """Get transactions for the dashboard."""
        organization = request.user.current_organization
        from orders.models import Shipment
        from fuel.models import FuelTransaction
        
        transactions = []
        
        # Get recent shipments as transactions
        recent_shipments = Shipment.objects.filter(
            organization=organization
        ).select_related('customer').order_by('-created_at')[:3]
        
        for shipment in recent_shipments:
            status_map = {
                Shipment.Status.IN_TRANSIT: 'ongoing',
                Shipment.Status.PENDING: 'on_hold',
                Shipment.Status.DELIVERED: 'completed',
                Shipment.Status.CANCELLED: 'cancelled',
            }
            
            transactions.append({
                'id': shipment.id,
                'customer': shipment.customer.company_name if shipment.customer and shipment.customer.company_name else (shipment.customer.contact_name if shipment.customer else 'Unknown'),
                'dateTime': shipment.created_at.strftime('%Y-%m-%d %H:%M'),
                'type': 'Shipping',
                'total': f'${shipment.price:,.2f}' if shipment.price else '$0.00',
                'status': status_map.get(shipment.status, 'unknown')
            })
        
        return Response(transactions)
    
    @action(detail=False, methods=['get'])
    def order_waypoints(self, request):
        """Get waypoints for a specific order."""
        order_id = request.query_params.get('order_id')
        if not order_id:
            return Response({'error': 'order_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        organization = request.user.current_organization
        from orders.models import Shipment
        from tracking.models import VehicleLocationPing
        import uuid
        
        try:
            # Try to convert to UUID if it's a valid UUID string
            try:
                uuid_id = uuid.UUID(order_id)
                shipment = Shipment.objects.get(id=uuid_id, organization=organization)
            except (ValueError, AttributeError):
                # If not a valid UUID, try to find by tracking_code
                shipment = Shipment.objects.get(tracking_code=order_id, organization=organization)
        except Shipment.DoesNotExist:
            return Response({'error': 'Shipment not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get GPS entries for this shipment's vehicle
        try:
            from dispatch.models import Trip
            trip = Trip.objects.get(shipment=shipment)
            gps_entries = VehicleLocationPing.objects.filter(
                vehicle=trip.vehicle
            ).order_by('recorded_at')[:10]
            
            waypoints = []
            for entry in gps_entries:
                waypoints.append({
                    'lat': float(entry.lat),
                    'lng': float(entry.lng),
                    'address': entry.address or f"GPS Point {entry.id}"
                })
        except Trip.DoesNotExist:
            waypoints = []
        
        return Response(waypoints)
    
    @action(detail=False, methods=['get'])
    def order_trip_details(self, request):
        """Get trip details for a specific order."""
        order_id = request.query_params.get('order_id')
        if not order_id:
            return Response({'error': 'order_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        organization = request.user.current_organization
        from orders.models import Shipment
        from dispatch.models import Trip
        import uuid
        
        try:
            # Try to convert to UUID if it's a valid UUID string
            try:
                uuid_id = uuid.UUID(order_id)
                shipment = Shipment.objects.get(id=uuid_id, organization=organization)
            except (ValueError, AttributeError):
                # If not a valid UUID, try to find by tracking_code
                shipment = Shipment.objects.get(tracking_code=order_id, organization=organization)
        except Shipment.DoesNotExist:
            return Response({'error': 'Shipment not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Try to get associated trip
        try:
            trip = Trip.objects.get(shipment=shipment)
            driver_name = trip.driver.user.get_full_name() if trip.driver else 'Unassigned'
            distance = 'Unknown'  # Would need distance calculation
            estimation = 'Unknown'  # Would need duration calculation
            experience = 'Unknown'  # Driver experience field not available
            license = 'Unknown'  # Driver license field not available
        except Trip.DoesNotExist:
            driver_name = 'Unassigned'
            distance = 'Unknown'
            estimation = 'Unknown'
            experience = 'Unknown'
            license = 'Unknown'
        
        return Response({
            'driverName': driver_name,
            'distance': distance,
            'experience': experience,
            'license': license,
            'idNumber': str(shipment.id),
            'estimation': estimation,
            'weight': f'{shipment.weight_kg} kg' if shipment.weight_kg else 'Unknown',
            'charge': f'${shipment.price:,.2f}' if shipment.price else '$0.00'
        })
    
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
        
        # Format the response
        formatted_data = []
        for item in daily_fuel:
            formatted_data.append({
                'day': item['day'].isoformat() if item['day'] else None,
                'total_liters': float(item['total_liters']) if item['total_liters'] else 0,
                'total_cost': float(item['total_cost']) if item['total_cost'] else 0
            })
        
        return Response(formatted_data)
    
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
        
        # Calculate average consumption (not available without distance fields)
        avg_consumption = 0
        
        # Revenue from completed shipments
        total_revenue = Shipment.objects.filter(
            organization=organization,
            status=Shipment.Status.DELIVERED
        ).aggregate(total=Sum('price'))['total'] or 0
        
        # On-time delivery rate (not available without delivery time fields)
        on_time_rate = 0
        
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