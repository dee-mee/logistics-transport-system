from rest_framework import viewsets, permissions as rest_permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Sum, Avg, Q, F
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
from django.utils import timezone
from datetime import timedelta
from .models import Vehicle, Driver, MaintenanceRecord, VehicleDocument, VehicleInspection
from .serializers import (
    VehicleSerializer, VehicleListSerializer, DriverSerializer, DriverListSerializer,
    MaintenanceRecordSerializer, VehicleDocumentSerializer, VehicleInspectionSerializer
)
from permissions.permissions import HasModuleAccess
from permissions.models import PermissionGroup


class VehicleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing vehicles."""
    module = PermissionGroup.Module.VEHICLES
    permission_classes = [HasModuleAccess]
    
    def get_queryset(self):
        return Vehicle.objects.filter(
            organization=self.request.user.current_organization
        ).select_related('organization').order_by("-created_at")
    
    def get_serializer_class(self):
        if self.action == 'list':
            return VehicleListSerializer
        return VehicleSerializer
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
    def perform_update(self, serializer):
        serializer.save()
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["status", "vehicle_type", "ownership"]
    search_fields = ["plate_number", "make", "model", "vin"]
    
    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """Get documents for this vehicle."""
        vehicle = self.get_object()
        documents = vehicle.documents.all()
        serializer = VehicleDocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def inspections(self, request, pk=None):
        """Get inspections for this vehicle."""
        vehicle = self.get_object()
        inspections = vehicle.inspections.select_related('driver', 'inspected_by').all()
        serializer = VehicleInspectionSerializer(inspections, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def maintenance_history(self, request, pk=None):
        """Get maintenance history for this vehicle."""
        vehicle = self.get_object()
        maintenance = vehicle.maintenance_records.all().order_by('-scheduled_date')
        serializer = MaintenanceRecordSerializer(maintenance, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_odometer(self, request, pk=None):
        """Update vehicle odometer reading."""
        vehicle = self.get_object()
        new_odometer = request.data.get('odometer')
        
        if not new_odometer:
            return Response(
                {'error': 'odometer value is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        vehicle.current_odometer = new_odometer
        vehicle.save()
        
        return Response({'message': 'Odometer updated successfully', 'current_odometer': vehicle.current_odometer})
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update vehicle status."""
        vehicle = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': 'status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_status not in dict(Vehicle.Status.choices):
            return Response(
                {'error': 'Invalid status value'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        vehicle.status = new_status
        vehicle.save()
        
        return Response({'message': 'Status updated successfully', 'status': vehicle.status})
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get fleet analytics and statistics."""
        vehicles = Vehicle.objects.filter(organization=self.request.user.current_organization)
        
        # Vehicle status distribution
        status_counts = vehicles.values('status').annotate(
            count=Count('id')
        ).order_by('status')
        
        # Vehicle type distribution
        type_counts = vehicles.values('vehicle_type').annotate(
            count=Count('id')
        ).order_by('vehicle_type')
        
        # Ownership distribution
        ownership_counts = vehicles.values('ownership').annotate(
            count=Count('id')
        ).order_by('ownership')
        
        # Vehicles due for maintenance
        vehicles_due_maintenance = vehicles.filter(
            next_service_due__lte=timezone.now().date() + timedelta(days=7)
        ).count()
        
        # Total fleet value
        total_value = vehicles.aggregate(
            total=Sum('current_value')
        )['total'] or 0
        
        # Average vehicle age
        from django.db.models.functions import ExtractYear
        current_year = timezone.now().year
        avg_age = vehicles.aggregate(
            avg_age=Avg(current_year - F('year'))
        )['avg_age'] or 0
        
        # Calculate utilization rate
        total_vehicles = vehicles.count()
        on_trip_vehicles = vehicles.filter(status=Vehicle.Status.ON_TRIP).count()
        utilization_rate = (on_trip_vehicles / total_vehicles * 100) if total_vehicles > 0 else 0
        
        return Response({
            'total_vehicles': total_vehicles,
            'status_distribution': list(status_counts),
            'type_distribution': list(type_counts),
            'ownership_distribution': list(ownership_counts),
            'vehicles_due_maintenance': vehicles_due_maintenance,
            'total_fleet_value': float(total_value),
            'average_vehicle_age': round(avg_age, 1),
            'utilization_rate': round(utilization_rate, 1),
        })
    
    @action(detail=False, methods=['get'])
    def utilization(self, request):
        """Get vehicle utilization metrics."""
        organization = request.user.current_organization
        vehicles = Vehicle.objects.filter(organization=organization)
        
        # Calculate utilization rates
        total_vehicles = vehicles.count()
        available_vehicles = vehicles.filter(status=Vehicle.Status.AVAILABLE).count()
        on_trip_vehicles = vehicles.filter(status=Vehicle.Status.ON_TRIP).count()
        maintenance_vehicles = vehicles.filter(status=Vehicle.Status.MAINTENANCE).count()
        
        utilization_rate = (on_trip_vehicles / total_vehicles * 100) if total_vehicles > 0 else 0
        availability_rate = (available_vehicles / total_vehicles * 100) if total_vehicles > 0 else 0
        
        return Response({
            'total_vehicles': total_vehicles,
            'available_vehicles': available_vehicles,
            'on_trip_vehicles': on_trip_vehicles,
            'maintenance_vehicles': maintenance_vehicles,
            'utilization_rate': round(utilization_rate, 2),
            'availability_rate': round(availability_rate, 2),
        })


class DriverViewSet(viewsets.ModelViewSet):
    """ViewSet for managing drivers."""
    module = PermissionGroup.Module.VEHICLES
    permission_classes = [HasModuleAccess]
    
    def get_queryset(self):
        queryset = Driver.objects.filter(
            organization=self.request.user.current_organization
        ).select_related("user", "assigned_vehicle").order_by("-created_at")
        
        # Drivers can only see their own record
        try:
            from organizations.models import OrganizationUser
            org_user = OrganizationUser.objects.get(
                organization=self.request.user.current_organization,
                user=self.request.user
            )
            if org_user.role == OrganizationUser.Role.DRIVER:
                queryset = queryset.filter(user=self.request.user)
        except (OrganizationUser.DoesNotExist, AttributeError):
            pass
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DriverListSerializer
        return DriverSerializer
    
    def perform_create(self, serializer):
        driver = serializer.save(organization=self.request.user.current_organization)
        
        # Sync phone number from user if not provided
        if driver.user and driver.user.phone_number and not driver.phone_number:
            driver.phone_number = driver.user.phone_number
            driver.save()
        
        # If the driver has a user and that user's role is not 'driver', update it
        if driver.user and driver.user.role != 'driver':
            driver.user.role = 'driver'
            driver.user.save()
    
    def perform_update(self, serializer):
        driver = serializer.save()
        
        # Sync phone number from user profile
        if driver.user and driver.user.phone_number:
            driver.phone_number = driver.user.phone_number
            driver.save()
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["status", "employment_type"]
    search_fields = ["license_number", "user__username", "user__first_name", "user__last_name"]
    
    @action(detail=True, methods=['post'])
    def assign_vehicle(self, request, pk=None):
        """Assign a vehicle to this driver."""
        driver = self.get_object()
        vehicle_id = request.data.get('vehicle_id')
        
        if not vehicle_id:
            return Response(
                {'error': 'vehicle_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            vehicle = Vehicle.objects.get(
                id=vehicle_id,
                organization=self.request.user.current_organization
            )
            driver.assigned_vehicle = vehicle
            driver.save()
            return Response({'message': 'Vehicle assigned successfully'})
        except Vehicle.DoesNotExist:
            return Response(
                {'error': 'Vehicle not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def unassign_vehicle(self, request, pk=None):
        """Unassign vehicle from this driver."""
        driver = self.get_object()
        driver.assigned_vehicle = None
        driver.save()
        return Response({'message': 'Vehicle unassigned successfully'})
    
    @action(detail=True, methods=['get'])
    def performance(self, request, pk=None):
        """Get driver performance metrics."""
        driver = self.get_object()
        
        # Calculate performance metrics
        performance = {
            'total_trips': driver.total_trips,
            'total_distance_km': float(driver.total_distance_km),
            'safety_score': driver.safety_score,
            'on_time_performance': driver.on_time_performance,
            'avg_cost_per_km': 0,  # Would need cost tracking
            'fuel_efficiency': 0,  # Would need fuel tracking
        }
        
        return Response(performance)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update driver status."""
        driver = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': 'status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_status not in dict(Driver.Status.choices):
            return Response(
                {'error': 'Invalid status value'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        driver.status = new_status
        driver.save()
        
        return Response({'message': 'Status updated successfully', 'status': driver.status})
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get driver analytics and statistics."""
        drivers = Driver.objects.filter(organization=self.request.user.current_organization)
        
        # Driver status distribution
        status_counts = drivers.values('status').annotate(
            count=Count('id')
        ).order_by('status')
        
        # Employment type distribution
        employment_counts = drivers.values('employment_type').annotate(
            count=Count('id')
        ).order_by('employment_type')
        
        # Performance metrics
        avg_safety_score = drivers.aggregate(
            avg_safety=Avg('safety_score')
        )['avg_safety'] or 0
        
        avg_on_time = drivers.aggregate(
            avg_on_time=Avg('on_time_performance')
        )['avg_on_time'] or 0
        
        total_distance = drivers.aggregate(
            total_distance=Sum('total_distance_km')
        )['total_distance'] or 0
        
        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Driver analytics: total_drivers={drivers.count()}, status_counts={list(status_counts)}")
        
        return Response({
            'total_drivers': drivers.count(),
            'status_distribution': list(status_counts),
            'employment_distribution': list(employment_counts),
            'average_safety_score': round(avg_safety_score, 1),
            'average_on_time_performance': round(avg_on_time, 1),
            'total_distance_driven': float(total_distance),
        })


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    """ViewSet for managing maintenance records."""
    module = PermissionGroup.Module.VEHICLES
    permission_classes = [HasModuleAccess]
    serializer_class = MaintenanceRecordSerializer
    
    def get_queryset(self):
        return MaintenanceRecord.objects.filter(
            vehicle__organization=self.request.user.current_organization
        ).select_related("vehicle").order_by("-created_at")
    
    def perform_create(self, serializer):
        vehicle = serializer.validated_data['vehicle']
        if vehicle.organization != self.request.user.current_organization:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vehicle does not belong to your organization")
        serializer.save()
    
    def perform_update(self, serializer):
        serializer.save()
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["vehicle", "maintenance_type", "priority", "status"]
    search_fields = ["vehicle__plate_number", "description", "service_provider"]
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark maintenance as completed."""
        record = self.get_object()
        record.status = MaintenanceRecord.Status.COMPLETED
        record.completed_date = timezone.now().date()
        record.work_performed = request.data.get('work_performed', record.work_performed)
        record.actual_cost = request.data.get('actual_cost', record.actual_cost)
        record.odometer_at_service = request.data.get('odometer_at_service', record.odometer_at_service)
        record.scheduled_date = request.data.get('scheduled_date', record.scheduled_date)
        record.save()
        
        # Update vehicle's odometer and service dates
        vehicle = record.vehicle
        if record.odometer_at_service:
            vehicle.current_odometer = record.odometer_at_service
        vehicle.last_service_date = record.completed_date
        if record.next_due_date:
            vehicle.next_service_due = record.next_due_date
        vehicle.save()
        
        return Response(MaintenanceRecordSerializer(record).data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming maintenance schedules."""
        upcoming = self.get_queryset().filter(
            status=MaintenanceRecord.Status.SCHEDULED,
            scheduled_date__isnull=False,
            scheduled_date__gte=timezone.now().date()
        ).order_by('scheduled_date')[:10]
        
        serializer = MaintenanceRecordSerializer(upcoming, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue maintenance schedules."""
        overdue = self.get_queryset().filter(
            status=MaintenanceRecord.Status.SCHEDULED,
            scheduled_date__isnull=False,
            scheduled_date__lt=timezone.now().date()
        ).order_by('scheduled_date')
        
        serializer = MaintenanceRecordSerializer(overdue, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get maintenance analytics and statistics."""
        organization = request.user.current_organization
        records = MaintenanceRecord.objects.filter(
            vehicle__organization=organization
        )
        
        # Maintenance type distribution
        type_counts = records.values('maintenance_type').annotate(
            count=Count('id')
        ).order_by('maintenance_type')
        
        # Priority distribution
        priority_counts = records.values('priority').annotate(
            count=Count('id')
        ).order_by('priority')
        
        # Status distribution
        status_counts = records.values('status').annotate(
            count=Count('id')
        ).order_by('status')
        
        # Cost analysis
        total_estimated_cost = records.aggregate(
            total=Sum('estimated_cost')
        )['total'] or 0
        
        total_actual_cost = records.filter(
            actual_cost__isnull=False
        ).aggregate(
            total=Sum('actual_cost')
        )['total'] or 0
        
        # Monthly maintenance trend (last 6 months)
        six_months_ago = timezone.now() - timedelta(days=180)
        monthly_trend = records.filter(
            completed_date__gte=six_months_ago
        ).annotate(
            month=TruncMonth('completed_date')
        ).values('month').annotate(
            count=Count('id'),
            total_cost=Sum('actual_cost')
        ).order_by('month')
        
        return Response({
            'total_records': records.count(),
            'type_distribution': list(type_counts),
            'priority_distribution': list(priority_counts),
            'status_distribution': list(status_counts),
            'total_estimated_cost': float(total_estimated_cost),
            'total_actual_cost': float(total_actual_cost),
            'monthly_trend': list(monthly_trend),
        })


class VehicleDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing vehicle documents."""
    module = PermissionGroup.Module.VEHICLES
    permission_classes = [HasModuleAccess]
    serializer_class = VehicleDocumentSerializer
    
    def get_queryset(self):
        return VehicleDocument.objects.filter(
            vehicle__organization=self.request.user.current_organization
        ).select_related("vehicle").order_by("-expiry_date")
    
    def perform_create(self, serializer):
        vehicle = serializer.validated_data['vehicle']
        if vehicle.organization != self.request.user.current_organization:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vehicle does not belong to your organization")
        serializer.save()
    
    def perform_update(self, serializer):
        serializer.save()
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["vehicle", "document_type", "status"]
    search_fields = ["vehicle__plate_number", "title", "document_number"]
    
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get documents expiring within 30 days."""
        thirty_days_from_now = timezone.now().date() + timedelta(days=30)
        expiring = self.get_queryset().filter(
            expiry_date__lte=thirty_days_from_now,
            expiry_date__gte=timezone.now().date(),
            status=VehicleDocument.Status.VALID
        ).order_by('expiry_date')
        
        serializer = self.get_serializer(expiring, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Get expired documents."""
        expired = self.get_queryset().filter(
            expiry_date__lt=timezone.now().date(),
            status=VehicleDocument.Status.VALID
        ).order_by('-expiry_date')
        
        # Update status to expired
        expired.update(status=VehicleDocument.Status.EXPIRED)
        
        serializer = self.get_serializer(expired, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get document analytics and statistics."""
        organization = request.user.current_organization
        documents = VehicleDocument.objects.filter(
            vehicle__organization=organization
        )
        
        # Document type distribution
        type_counts = documents.values('document_type').annotate(
            count=Count('id')
        ).order_by('document_type')
        
        # Status distribution
        status_counts = documents.values('status').annotate(
            count=Count('id')
        ).order_by('status')
        
        # Expiring soon count
        thirty_days_from_now = timezone.now().date() + timedelta(days=30)
        expiring_soon = documents.filter(
            expiry_date__lte=thirty_days_from_now,
            expiry_date__gte=timezone.now().date(),
            status=VehicleDocument.Status.VALID
        ).count()
        
        # Already expired
        expired_count = documents.filter(
            expiry_date__lt=timezone.now().date()
        ).count()
        
        return Response({
            'total_documents': documents.count(),
            'type_distribution': list(type_counts),
            'status_distribution': list(status_counts),
            'expiring_soon_count': expiring_soon,
            'expired_count': expired_count,
        })


class VehicleInspectionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing vehicle inspections."""
    module = PermissionGroup.Module.VEHICLES
    permission_classes = [HasModuleAccess]
    serializer_class = VehicleInspectionSerializer
    
    def get_queryset(self):
        return VehicleInspection.objects.filter(
            vehicle__organization=self.request.user.current_organization
        ).select_related("vehicle", "driver", "inspected_by").order_by("-inspection_date")
    
    def perform_create(self, serializer):
        vehicle = serializer.validated_data['vehicle']
        if vehicle.organization != self.request.user.current_organization:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vehicle does not belong to your organization")
        serializer.save(inspected_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save()
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["vehicle", "driver", "inspection_type", "status"]
    search_fields = ["vehicle__plate_number", "driver__user__username"]
    
    @action(detail=True, methods=['post'])
    def fail(self, request, pk=None):
        """Mark inspection as failed with issues."""
        inspection = self.get_object()
        inspection.status = VehicleInspection.Status.FAILED
        inspection.issues_found = request.data.get('issues_found', '')
        inspection.immediate_actions = request.data.get('immediate_actions', '')
        inspection.follow_up_required = request.data.get('follow_up_required', True)
        inspection.follow_up_notes = request.data.get('follow_up_notes', '')
        inspection.save()
        
        return Response(VehicleInspectionSerializer(inspection).data)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get inspection analytics and statistics."""
        organization = request.user.current_organization
        inspections = VehicleInspection.objects.filter(
            vehicle__organization=organization
        )
        
        # Inspection type distribution
        type_counts = inspections.values('inspection_type').annotate(
            count=Count('id')
        ).order_by('inspection_type')
        
        # Status distribution
        status_counts = inspections.values('status').annotate(
            count=Count('id')
        ).order_by('status')
        
        # Pass/fail rate
        passed_count = inspections.filter(status=VehicleInspection.Status.PASSED).count()
        failed_count = inspections.filter(status=VehicleInspection.Status.FAILED).count()
        total_count = inspections.count()
        
        pass_rate = (passed_count / total_count * 100) if total_count > 0 else 0
        
        # Recent inspections (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_inspections = inspections.filter(
            inspection_date__gte=thirty_days_ago
        ).count()
        
        return Response({
            'total_inspections': total_count,
            'type_distribution': list(type_counts),
            'status_distribution': list(status_counts),
            'passed_count': passed_count,
            'failed_count': failed_count,
            'pass_rate': round(pass_rate, 2),
            'recent_inspections_count': recent_inspections,
        })