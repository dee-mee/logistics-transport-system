from rest_framework import viewsets, permissions as rest_permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Trip, TripStop
from .serializers import TripSerializer, TripStopSerializer
from permissions.permissions import HasModuleAccess
from permissions.models import PermissionGroup


class TripViewSet(viewsets.ModelViewSet):
    module = PermissionGroup.Module.DISPATCH
    permission_classes = [HasModuleAccess]
    serializer_class = TripSerializer
    queryset = Trip.objects.all()
    
    def get_queryset(self):
        queryset = Trip.objects.filter(
            Q(organization__isnull=True) | Q(organization=self.request.user.current_organization)
        ).select_related("vehicle", "driver__user").prefetch_related("stops").order_by("-created_at")
        
        # Drivers can only see their own trips
        try:
            from organizations.models import OrganizationUser
            org_user = OrganizationUser.objects.get(
                organization=self.request.user.current_organization,
                user=self.request.user
            )
            if org_user.role == OrganizationUser.Role.DRIVER:
                queryset = queryset.filter(driver=self.request.user.driver_profile)
        except (OrganizationUser.DoesNotExist, AttributeError):
            pass
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "vehicle", "driver"]
    
    @action(detail=True, methods=['post'], url_path='start')
    def start_trip(self, request, pk=None):
        """Start a trip (driver action)."""
        trip = self.get_object()
        
        # Only the assigned driver can start the trip
        if trip.driver.user != request.user:
            return Response(
                {'error': 'Only the assigned driver can start this trip'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if trip.status != Trip.Status.PLANNED:
            return Response(
                {'error': f'Trip status is {trip.status}, expected PLANNED'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.utils import timezone
            trip.status = Trip.Status.IN_PROGRESS
            trip.actual_start = timezone.now()
            trip.save()
            
            # Mark driver as busy
            if trip.driver:
                trip.driver.status = 'busy'
                trip.driver.save()
            
            # Mark vehicle as in_use if assigned
            if trip.vehicle:
                trip.vehicle.status = 'in_use'
                trip.vehicle.save()
            
            # Update associated shipment status to in_transit
            from orders.models import Shipment
            shipments = trip.shipments.filter(status=Shipment.Status.ASSIGNED)
            for shipment in shipments:
                shipment.status = Shipment.Status.IN_TRANSIT
                shipment.save()
                
                # Create tracking event
                from tracking.models import ShipmentStatusEvent
                try:
                    ShipmentStatusEvent.objects.create(
                        shipment=shipment,
                        status=Shipment.Status.IN_TRANSIT,
                        location_description="Trip started",
                        lat=shipment.pickup_lat,
                        lng=shipment.pickup_lng
                    )
                except Exception as e:
                    print(f"Error creating status event: {e}")
            
            return Response(TripSerializer(trip).data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Error starting trip: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='finish')
    def finish_trip(self, request, pk=None):
        """Finish a trip (driver action)."""
        trip = self.get_object()
        
        # Only the assigned driver can finish the trip
        if trip.driver.user != request.user:
            return Response(
                {'error': 'Only the assigned driver can finish this trip'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if trip.status != Trip.Status.IN_PROGRESS:
            return Response(
                {'error': f'Trip status is {trip.status}, expected IN_PROGRESS'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.utils import timezone
            trip.status = Trip.Status.COMPLETED
            trip.actual_end = timezone.now()
            trip.save()
            
            # Free the driver
            if trip.driver:
                # Check if driver has other active trips
                other_active_trips = Trip.objects.filter(
                    driver=trip.driver,
                    status=Trip.Status.IN_PROGRESS
                ).exclude(id=trip.id)
                
                if not other_active_trips.exists():
                    trip.driver.status = 'available'
                    trip.driver.save()
            
            # Free the vehicle
            if trip.vehicle:
                # Check if vehicle has other active trips
                other_vehicle_trips = Trip.objects.filter(
                    vehicle=trip.vehicle,
                    status=Trip.Status.IN_PROGRESS
                ).exclude(id=trip.id)
                
                if not other_vehicle_trips.exists():
                    trip.vehicle.status = 'available'
                    trip.vehicle.save()
            
            # Update associated shipment status to delivered
            from orders.models import Shipment
            shipments = trip.shipments.filter(status=Shipment.Status.IN_TRANSIT)
            for shipment in shipments:
                shipment.status = Shipment.Status.DELIVERED
                shipment.save()
                
                # Create tracking event
                from tracking.models import ShipmentStatusEvent
                try:
                    ShipmentStatusEvent.objects.create(
                        shipment=shipment,
                        status=Shipment.Status.DELIVERED,
                        location_description="Trip completed",
                        lat=shipment.dropoff_lat,
                        lng=shipment.dropoff_lng
                    )
                except Exception as e:
                    print(f"Error creating status event: {e}")
            
            return Response(TripSerializer(trip).data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Error finishing trip: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TripStopViewSet(viewsets.ModelViewSet):
    module = PermissionGroup.Module.DISPATCH
    permission_classes = [HasModuleAccess]
    serializer_class = TripStopSerializer
    queryset = TripStop.objects.all()
    
    def get_queryset(self):
        return TripStop.objects.filter(
            Q(trip__organization__isnull=True) | Q(trip__organization=self.request.user.current_organization)
        ).select_related("trip", "shipment").all()
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["trip", "stop_type"]
