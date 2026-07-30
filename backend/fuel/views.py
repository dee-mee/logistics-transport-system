from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Avg, F, Count
from django.db.models.functions import TruncMonth, TruncWeek
from django.utils import timezone
from .models import FuelTransaction, FuelCard, FuelConsumption, FuelAlert
from .serializers import (
    FuelTransactionSerializer, FuelCardSerializer, FuelCardDetailSerializer,
    FuelConsumptionSerializer, FuelAlertSerializer, FuelAlertUpdateSerializer
)
from permissions.permissions import HasModuleAccess
from permissions.models import PermissionGroup, RolePermission


class FuelTransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing fuel transactions."""
    module = PermissionGroup.Module.FUEL
    permission_classes = [HasModuleAccess]
    serializer_class = FuelTransactionSerializer
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Override to ensure VIEW access is sufficient for read operations
        self.required_access_level = RolePermission.AccessLevel.VIEW
    
    def get_queryset(self):
        return FuelTransaction.objects.filter(
            organization=self.request.user.current_organization
        ).select_related('vehicle', 'driver').order_by('-date')
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get fuel consumption summary for organization."""
        queryset = self.get_queryset()
        
        # Calculate totals
        totals = queryset.aggregate(
            total_cost=Sum('total_cost'),
            total_fuel=Sum('quantity_liters'),
            avg_price=Avg('price_per_liter')
        )
        
        # Group by vehicle
        by_vehicle = queryset.values('vehicle__plate_number', 'vehicle__vehicle_type').annotate(
            total_cost=Sum('total_cost'),
            total_fuel=Sum('quantity_liters'),
            transaction_count=Count('id')
        ).order_by('-total_cost')
        
        # Group by month
        by_month = queryset.annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            total_cost=Sum('total_cost'),
            total_fuel=Sum('quantity_liters')
        ).order_by('-month')
        
        return Response({
            'totals': totals,
            'by_vehicle': list(by_vehicle),
            'by_month': list(by_month)
        })


class FuelCardViewSet(viewsets.ModelViewSet):
    """ViewSet for managing fuel cards."""
    module = PermissionGroup.Module.FUEL
    permission_classes = [HasModuleAccess]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Override to ensure VIEW access is sufficient for read operations
        self.required_access_level = RolePermission.AccessLevel.VIEW
    
    def get_queryset(self):
        return FuelCard.objects.filter(
            organization=self.request.user.current_organization
        ).prefetch_related('vehicles')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return FuelCardDetailSerializer
        return FuelCardSerializer
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
    @action(detail=True, methods=['post'])
    def assign_vehicle(self, request, pk=None):
        """Assign a vehicle to this fuel card."""
        fuel_card = self.get_object()
        vehicle_id = request.data.get('vehicle_id')
        
        if not vehicle_id:
            return Response(
                {'error': 'vehicle_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from fleet.models import Vehicle
            vehicle = Vehicle.objects.get(
                id=vehicle_id,
                organization=self.request.user.current_organization
            )
            fuel_card.vehicles.add(vehicle)
            return Response({'message': 'Vehicle assigned successfully'})
        except Vehicle.DoesNotExist:
            return Response(
                {'error': 'Vehicle not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def remove_vehicle(self, request, pk=None):
        """Remove a vehicle from this fuel card."""
        fuel_card = self.get_object()
        vehicle_id = request.data.get('vehicle_id')
        
        if not vehicle_id:
            return Response(
                {'error': 'vehicle_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from fleet.models import Vehicle
            vehicle = Vehicle.objects.get(
                id=vehicle_id,
                organization=self.request.user.current_organization
            )
            fuel_card.vehicles.remove(vehicle)
            return Response({'message': 'Vehicle removed successfully'})
        except Vehicle.DoesNotExist:
            return Response(
                {'error': 'Vehicle not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class FuelConsumptionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing fuel consumption metrics."""
    module = PermissionGroup.Module.FUEL
    permission_classes = [HasModuleAccess]
    serializer_class = FuelConsumptionSerializer
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Override to ensure VIEW access is sufficient for read operations
        self.required_access_level = RolePermission.AccessLevel.VIEW
    
    def get_queryset(self):
        return FuelConsumption.objects.filter(
            organization=self.request.user.current_organization
        ).select_related('vehicle')
    
    @action(detail=False, methods=['get'])
    def vehicle_summary(self, request):
        """Get consumption summary for all vehicles."""
        queryset = self.get_queryset()
        
        summary = queryset.values('vehicle__plate_number').annotate(
            avg_consumption=Avg('avg_consumption_l_per_100km'),
            avg_cost=Avg('avg_cost_per_km'),
            total_distance=Sum('total_distance_km'),
            total_fuel=Sum('total_fuel_liters'),
            total_cost=Sum('total_cost')
        ).order_by('-total_cost')
        
        return Response(list(summary))


class FuelAlertViewSet(viewsets.ModelViewSet):
    """ViewSet for managing fuel alerts."""
    module = PermissionGroup.Module.FUEL
    permission_classes = [HasModuleAccess]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Override to ensure VIEW access is sufficient for read operations
        self.required_access_level = RolePermission.AccessLevel.VIEW
    
    def get_queryset(self):
        return FuelAlert.objects.filter(
            organization=self.request.user.current_organization
        ).select_related('vehicle', 'fuel_card', 'resolved_by')
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return FuelAlertUpdateSerializer
        return FuelAlertSerializer
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a fuel alert."""
        alert = self.get_object()
        serializer = FuelAlertUpdateSerializer(alert, data=request.data, partial=True)
        
        if serializer.is_valid():
            alert.is_resolved = True
            alert.resolved_at = timezone.now()
            alert.resolved_by = request.user
            alert.resolution_notes = serializer.validated_data.get('resolution_notes', '')
            alert.save()
            return Response(FuelAlertSerializer(alert).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)