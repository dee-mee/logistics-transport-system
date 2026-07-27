from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Sum, Avg
from django.utils import timezone
from datetime import timedelta
from .models import Vehicle, Driver, MaintenanceRecord, VehicleDocument, VehicleInspection
from .serializers import (
    VehicleSerializer, VehicleListSerializer, DriverSerializer, DriverListSerializer,
    MaintenanceRecordSerializer, VehicleDocumentSerializer, VehicleInspectionSerializer
)


class VehicleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing vehicles."""
    permission_classes = [permissions.IsAuthenticated]
    
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


class DriverViewSet(viewsets.ModelViewSet):
    """ViewSet for managing drivers."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Driver.objects.filter(
            organization=self.request.user.current_organization
        ).select_related("user", "assigned_vehicle").order_by("-created_at")
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DriverListSerializer
        return DriverSerializer
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
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


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    """ViewSet for managing maintenance records."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MaintenanceRecord.objects.filter(
            vehicle__organization=self.request.user.current_organization
        ).select_related("vehicle").order_by("-scheduled_date")
    
    def perform_create(self, serializer):
        # Automatically set organization from vehicle
        vehicle = serializer.validated_data['vehicle']
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
        
        serializer = self.get_serializer(upcoming, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue maintenance schedules."""
        overdue = self.get_queryset().filter(
            status=MaintenanceRecord.Status.SCHEDULED,
            scheduled_date__isnull=False,
            scheduled_date__lt=timezone.now().date()
        ).order_by('scheduled_date')
        
        serializer = self.get_serializer(overdue, many=True)
        return Response(serializer.data)


class VehicleDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing vehicle documents."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VehicleDocumentSerializer
    
    def get_queryset(self):
        return VehicleDocument.objects.filter(
            vehicle__organization=self.request.user.current_organization
        ).select_related("vehicle").order_by("-expiry_date")
    
    def perform_create(self, serializer):
        # Automatically set organization from vehicle
        vehicle = serializer.validated_data['vehicle']
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


class VehicleInspectionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing vehicle inspections."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VehicleInspectionSerializer
    
    def get_queryset(self):
        return VehicleInspection.objects.filter(
            vehicle__organization=self.request.user.current_organization
        ).select_related("vehicle", "driver", "inspected_by").order_by("-inspection_date")
    
    def perform_create(self, serializer):
        # Automatically set organization from vehicle
        vehicle = serializer.validated_data['vehicle']
        serializer.save(inspected_by=self.request.user)
    
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