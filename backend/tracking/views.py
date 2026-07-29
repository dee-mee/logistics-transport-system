from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from .models import ShipmentStatusEvent, VehicleLocationPing, Geofence, GPSAlert
from .serializers import (
    ShipmentStatusEventSerializer, VehicleLocationPingSerializer, VehicleLocationPingCreateSerializer,
    GeofenceSerializer, GPSAlertSerializerV2, GPSAlertUpdateSerializer, LiveMapDataSerializer
)
from orders.models import Shipment
from orders.serializers import ShipmentSerializer
from permissions.permissions import HasModuleAccess
from permissions.models import PermissionGroup


class ShipmentStatusEventViewSet(viewsets.ModelViewSet):
    """ViewSet for managing shipment status events."""
    module = PermissionGroup.Module.TRACKING
    permission_classes = [HasModuleAccess]
    
    def get_queryset(self):
        return ShipmentStatusEvent.objects.filter(
            shipment__organization=self.request.user.current_organization
        ).select_related("shipment")
    
    serializer_class = ShipmentStatusEventSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["shipment", "status"]


class VehicleLocationPingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing manual vehicle location updates from drivers."""
    module = PermissionGroup.Module.TRACKING
    permission_classes = [HasModuleAccess]
    
    def get_queryset(self):
        return VehicleLocationPing.objects.filter(
            organization=self.request.user.current_organization
        ).select_related("vehicle", "driver").order_by("-recorded_at")
    
    def get_serializer_class(self):
        if self.action == 'create':
            return VehicleLocationPingCreateSerializer
        return VehicleLocationPingSerializer
    
    def perform_create(self, serializer):
        # Auto-set organization from vehicle
        vehicle = serializer.validated_data['vehicle']
        organization = vehicle.organization
        serializer.save(organization=organization)
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vehicle", "driver", "status_update"]
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify a location update (dispatcher action)."""
        location = self.get_object()
        location.is_verified = True
        location.verified_by = request.user
        location.verified_at = timezone.now()
        location.save()
        return Response(VehicleLocationPingSerializer(location).data)
    
    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Get latest location for all vehicles."""
        latest_locations = {}
        
        # Get latest ping for each vehicle
        queryset = self.get_queryset()
        for location in queryset:
            if location.vehicle_id not in latest_locations:
                latest_locations[location.vehicle_id] = location
        
        serializer = VehicleLocationPingSerializer(latest_locations.values(), many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def live_map(self, request):
        """Get data for live map display."""
        queryset = self.get_queryset()
        
        # Get the most recent ping for each vehicle
        vehicle_locations = {}
        for location in queryset:
            if location.vehicle_id not in vehicle_locations:
                vehicle_locations[location.vehicle_id] = location
        
        # Format for live map
        map_data = []
        for location in vehicle_locations.values():
            map_data.append({
                'vehicle_id': location.vehicle_id,
                'plate_number': location.vehicle.plate_number,
                'lat': float(location.lat),
                'lng': float(location.lng),
                'speed_kmh': float(location.speed_kmh) if location.speed_kmh else None,
                'heading_deg': float(location.heading_deg) if location.heading_deg else None,
                'status': location.vehicle.status,
                'driver_name': location.driver.user.get_full_name() if location.driver else None,
                'last_update': location.recorded_at.isoformat(),
                'vehicle_type': location.vehicle.vehicle_type,
                'address': location.address,
                'status_update': location.status_update
            })
        
        serializer = LiveMapDataSerializer(map_data, many=True)
        return Response(serializer.data)


class GeofenceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing geofences (delivery zones, restricted areas)."""
    module = PermissionGroup.Module.TRACKING
    permission_classes = [HasModuleAccess]
    serializer_class = GeofenceSerializer
    
    def get_queryset(self):
        return Geofence.objects.filter(
            organization=self.request.user.current_organization
        ).prefetch_related('vehicles')
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["geofence_type", "status", "boundary_type"]
    search_fields = ["name", "description", "address"]


class GPSAlertViewSet(viewsets.ModelViewSet):
    """ViewSet for managing manual GPS alerts from drivers/dispatchers."""
    module = PermissionGroup.Module.TRACKING
    permission_classes = [HasModuleAccess]
    
    def get_queryset(self):
        return GPSAlert.objects.filter(
            organization=self.request.user.current_organization
        ).select_related("vehicle", "driver", "shipment").order_by("-created_at")
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return GPSAlertUpdateSerializer
        return GPSAlertSerializerV2
    
    def perform_create(self, serializer):
        # Auto-set organization from vehicle
        vehicle = serializer.validated_data['vehicle']
        organization = vehicle.organization
        serializer.save(organization=organization)
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vehicle", "alert_type", "severity", "status"]
    search_fields = ["title", "description", "vehicle__plate_number"]
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge a GPS alert."""
        alert = self.get_object()
        alert.status = GPSAlert.Status.ACKNOWLEDGED
        alert.acknowledged_at = timezone.now()
        alert.acknowledged_by = request.user
        alert.save()
        return Response(GPSAlertSerializerV2(alert).data)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a GPS alert."""
        alert = self.get_object()
        serializer = GPSAlertUpdateSerializer(alert, data=request.data, partial=True)
        
        if serializer.is_valid():
            alert.status = GPSAlert.Status.RESOLVED
            alert.resolved_at = timezone.now()
            alert.resolved_by = request.user
            alert.resolution_notes = serializer.validated_data.get('resolution_notes', '')
            alert.save()
            return Response(GPSAlertSerializerV2(alert).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active alerts."""
        active_alerts = self.get_queryset().filter(status=GPSAlert.Status.ACTIVE)
        serializer = self.get_serializer(active_alerts, many=True)
        return Response(serializer.data)


class PublicShipmentTrackingView(generics.RetrieveAPIView):
    """Public endpoint: GET /api/tracking/track/<tracking_code>/ — no auth required."""

    queryset = Shipment.objects.prefetch_related("status_events")
    serializer_class = ShipmentSerializer
    lookup_field = "tracking_code"
    permission_classes = [permissions.AllowAny]