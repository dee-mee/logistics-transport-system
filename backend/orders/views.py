from rest_framework import viewsets, permissions as rest_permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Customer, Shipment
from .serializers import CustomerSerializer, ShipmentSerializer
from permissions.permissions import HasModuleAccess
from permissions.models import PermissionGroup


class CustomerViewSet(viewsets.ModelViewSet):
    module = PermissionGroup.Module.ORDERS
    permission_classes = [HasModuleAccess]
    serializer_class = CustomerSerializer
    queryset = Customer.objects.all()
    
    def get_queryset(self):
        # Show customers from current organization OR customers without an organization (legacy data)
        return Customer.objects.filter(
            Q(organization__isnull=True) | Q(organization=self.request.user.current_organization)
        ).order_by("-created_at")
    
    def perform_create(self, serializer):
        customer = serializer.save(organization=self.request.user.current_organization)
        
        # If this customer has a user and that user's role is not 'customer', update it
        if customer.user and customer.user.role != 'customer':
            customer.user.role = 'customer'
            customer.user.save()
    
    filter_backends = [filters.SearchFilter]
    search_fields = ["company_name", "contact_name", "contact_phone"]


class ShipmentViewSet(viewsets.ModelViewSet):
    module = PermissionGroup.Module.ORDERS
    permission_classes = [HasModuleAccess]
    serializer_class = ShipmentSerializer
    queryset = Shipment.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["status", "priority", "customer"]
    search_fields = ["tracking_code", "pickup_address", "dropoff_address"]
    
    def get_queryset(self):
        # Show shipments from current organization OR shipments without an organization (legacy data)
        queryset = (
            Shipment.objects.filter(
                Q(organization__isnull=True) | Q(organization=self.request.user.current_organization)
            )
            .select_related("customer", "driver", "driver__user", "vehicle")
            .order_by("-created_at")
        )

        user = self.request.user

        # Drivers only ever see shipments assigned to their own Driver record.
        # Everyone else (dispatchers, admins, etc.) sees the full org list —
        # tighten this further with organization-scoping when that's implemented.
        driver_profile = getattr(user, "driver_profile", None)
        if driver_profile is not None:
            queryset = queryset.filter(driver=driver_profile)
        
        # Drivers should see all their shipments including delivered ones
        # Admins/Dispatchers should see all shipments including delivered for reporting
        # Filter logic:
        # - exclude_delivered=true: hide delivered shipments
        # - include_delivered=true: show delivered shipments
        # - Neither: default to hiding delivered shipments (active view)
        if self.request.query_params.get('exclude_delivered'):
            queryset = queryset.exclude(status=Shipment.Status.DELIVERED)
        elif not self.request.query_params.get('include_delivered'):
            # Default: hide delivered shipments
            queryset = queryset.exclude(status=Shipment.Status.DELIVERED)

        return queryset
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
    def perform_update(self, serializer):
        shipment = serializer.save()
        
        # If shipment is marked as delivered, free the driver and vehicle
        if shipment.status == Shipment.Status.DELIVERED and shipment.driver:
            from fleet.models import Driver, Vehicle
            driver = shipment.driver
            
            # Check if driver has any other active shipments
            active_shipments = Shipment.objects.filter(
                driver=driver,
                organization=self.request.user.current_organization,
                status__in=[Shipment.Status.ASSIGNED, Shipment.Status.IN_TRANSIT]
            ).exclude(id=shipment.id)
            
            # If no other active shipments, set driver status to available
            if not active_shipments.exists():
                driver.status = 'available'
                driver.save()
                print(f"Driver {driver.user.get_full_name()} freed and set to available")
            else:
                print(f"Driver {driver.user.get_full_name()} still has active shipments, keeping current status")
            
            # Free the vehicle if assigned
            if shipment.vehicle:
                vehicle = shipment.vehicle
                # Check if vehicle has any other active shipments
                active_vehicle_shipments = Shipment.objects.filter(
                    vehicle=vehicle,
                    organization=self.request.user.current_organization,
                    status__in=[Shipment.Status.ASSIGNED, Shipment.Status.IN_TRANSIT]
                ).exclude(id=shipment.id)
                
                # If no other active shipments, set vehicle status to available
                if not active_vehicle_shipments.exists():
                    vehicle.status = 'available'
                    vehicle.save()
                    print(f"Vehicle {vehicle.plate_number} freed and set to available")
                else:
                    print(f"Vehicle {vehicle.plate_number} still has active shipments, keeping current status")
    
    @action(detail=True, methods=['post'])
    def assign_driver(self, request, pk=None):
        """Assign a driver and vehicle to a shipment."""
        shipment = self.get_object()
        driver_id = request.data.get('driver_id')
        vehicle_id = request.data.get('vehicle_id')
        
        print(f"Assign driver request - Shipment ID: {shipment.id}, Current status: {shipment.status}, Current driver: {shipment.driver}")
        print(f"Driver ID: {driver_id}, Vehicle ID: {vehicle_id}")
        
        if not driver_id:
            return Response({'error': 'Driver ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from fleet.models import Driver, Vehicle
            driver = Driver.objects.get(id=driver_id)
            
            # Ensure driver belongs to the same organization
            if driver.organization != request.user.current_organization:
                return Response({'error': 'Driver does not belong to your organization'}, status=status.HTTP_403_FORBIDDEN)
            
            print(f"Found driver: {driver.id} - {driver.user.get_full_name()}")
            
            # Check if driver already has active shipments (assigned or in_transit)
            active_shipments = Shipment.objects.filter(
                driver=driver,
                organization=request.user.current_organization,
                status__in=[Shipment.Status.ASSIGNED, Shipment.Status.IN_TRANSIT]
            ).exclude(id=shipment.id)
            
            if active_shipments.exists():
                print(f"Driver is busy with active shipments: {list(active_shipments.values_list('tracking_code', flat=True))}")
                return Response({
                    'error': f'Driver {driver.user.get_full_name() or driver.user.username} is already assigned to an active shipment',
                    'driver_status': 'busy',
                    'active_shipments': list(active_shipments.values_list('tracking_code', flat=True))
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if vehicle_id:
                vehicle = Vehicle.objects.get(id=vehicle_id)
                # Ensure vehicle belongs to the same organization
                if vehicle.organization != request.user.current_organization:
                    return Response({'error': 'Vehicle does not belong to your organization'}, status=status.HTTP_403_FORBIDDEN)
            else:
                vehicle = None
            
            shipment.driver = driver
            shipment.vehicle = vehicle
            shipment.status = Shipment.Status.ASSIGNED
            shipment.save()
            
            print(f"Assignment successful - New status: {shipment.status}, New driver: {shipment.driver}")
            
            # Create status event for assignment
            from tracking.models import ShipmentStatusEvent
            try:
                ShipmentStatusEvent.objects.create(
                    shipment=shipment,
                    status=Shipment.Status.ASSIGNED,
                    location_description="Driver assigned",
                    lat=shipment.pickup_lat,
                    lng=shipment.pickup_lng
                )
                print("Status event created for assignment")
            except Exception as e:
                print(f"Error creating status event: {e}")
            
            return Response(ShipmentSerializer(shipment).data)
        except Driver.DoesNotExist:
            return Response({'error': 'Driver not found'}, status=status.HTTP_404_NOT_FOUND)
        except Vehicle.DoesNotExist:
            return Response({'error': 'Vehicle not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': f'Error assigning driver: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def start_tracking(self, request, pk=None):
        """Start tracking for a shipment (mark as in transit)."""
        shipment = self.get_object()
        
        print(f"Start tracking request - Shipment ID: {shipment.id}, Current status: {shipment.status}, Driver: {shipment.driver}")
        print(f"Driver object: {shipment.driver}")
        print(f"Driver ID type: {type(shipment.driver.id) if shipment.driver else 'None'}")
        
        if not shipment.driver:
            print("Error: No driver assigned")
            return Response({'error': 'No driver assigned to this shipment'}, status=status.HTTP_400_BAD_REQUEST)
        
        if shipment.status != Shipment.Status.ASSIGNED:
            print(f"Error: Shipment status is {shipment.status}, expected ASSIGNED")
            return Response({'error': f'Shipment must be assigned before starting tracking (current status: {shipment.status})'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shipment.status = Shipment.Status.IN_TRANSIT
            shipment.save()
            
            print(f"Status updated to IN_TRANSIT successfully")
            
            # Create a Trip record for this shipment
            from dispatch.models import Trip, TripStop
            try:
                trip = Trip.objects.create(
                    organization=request.user.current_organization,
                    driver=shipment.driver,
                    vehicle=shipment.vehicle,  # Can be null now
                    status=Trip.Status.IN_PROGRESS,  # Already in progress since tracking started
                    notes=f'Trip for shipment {shipment.tracking_code}'
                )
                print(f"Trip created: {trip.id}")
                
                # Mark driver as busy
                if shipment.driver:
                    shipment.driver.status = 'busy'
                    shipment.driver.save()
                    print(f"Driver {shipment.driver.user.get_full_name()} marked as busy")
                
                # Mark vehicle as busy if assigned
                if shipment.vehicle:
                    shipment.vehicle.status = 'in_use'
                    shipment.vehicle.save()
                    print(f"Vehicle {shipment.vehicle.plate_number} marked as in_use")
                
                # Create pickup stop
                TripStop.objects.create(
                    trip=trip,
                    shipment=shipment,
                    stop_type='pickup',
                    sequence=1
                )
                print(f"Pickup stop created for trip {trip.id}")
                
                # Create dropoff stop
                TripStop.objects.create(
                    trip=trip,
                    shipment=shipment,
                    stop_type='dropoff',
                    sequence=2
                )
                print(f"Dropoff stop created for trip {trip.id}")
                    
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"Error creating trip: {e}")
                # Continue even if trip creation fails
                # The shipment tracking is more important
            
            # Create status event with coordinates for tracking
            from tracking.models import ShipmentStatusEvent
            try:
                event = ShipmentStatusEvent.objects.create(
                    shipment=shipment,
                    status=Shipment.Status.IN_TRANSIT,
                    location_description="Tracking started",
                    lat=shipment.pickup_lat,
                    lng=shipment.pickup_lng
                )
                print(f"Status event created for tracking start: {event.id}")
            except Exception as e:
                import traceback
                traceback.print_exc()
                # Continue even if status event creation fails
                print(f"Error creating status event: {e}")
            
            return Response(ShipmentSerializer(shipment).data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error updating shipment: {e}")
            return Response({'error': f'Error starting tracking: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
