from rest_framework import viewsets, permissions as rest_permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Customer, Shipment
from .serializers import CustomerSerializer, ShipmentSerializer
from permissions.permissions import HasModuleAccess
from permissions.models import PermissionGroup


class CustomerViewSet(viewsets.ModelViewSet):
    # module = PermissionGroup.Module.ORDERS
    permission_classes = [rest_permissions.AllowAny]  # Changed for testing
    serializer_class = CustomerSerializer
    queryset = Customer.objects.all()
    
    def get_queryset(self):
        # For now, return all customers without organization filtering
        # TODO: Implement proper organization filtering
        return Customer.objects.all().order_by("-created_at")
    
    def perform_create(self, serializer):
        # TODO: Implement organization assignment
        serializer.save()
    
    filter_backends = [filters.SearchFilter]
    search_fields = ["company_name", "contact_name", "contact_phone"]


class ShipmentViewSet(viewsets.ModelViewSet):
    # module = PermissionGroup.Module.ORDERS
    permission_classes = [rest_permissions.AllowAny]  # Changed for testing
    serializer_class = ShipmentSerializer
    queryset = Shipment.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["driver", "status"]
    
    def get_queryset(self):
        # For now, return all shipments without organization filtering
        # TODO: Implement proper organization filtering
        queryset = Shipment.objects.all().select_related("customer", "driver", "vehicle").order_by("-created_at")
        
        # Filter by driver if provided (for drivers viewing their own shipments)
        driver_id = self.request.query_params.get('driver')
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
            
        return queryset
    
    def perform_create(self, serializer):
        # TODO: Implement organization assignment
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def assign_driver(self, request, pk=None):
        """Assign a driver and vehicle to a shipment."""
        shipment = self.get_object()
        driver_id = request.data.get('driver_id')
        vehicle_id = request.data.get('vehicle_id')
        
        if not driver_id:
            return Response({'error': 'Driver ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from fleet.models import Driver, Vehicle
            driver = Driver.objects.get(id=driver_id)
            if vehicle_id:
                vehicle = Vehicle.objects.get(id=vehicle_id)
            else:
                vehicle = None
            
            shipment.driver = driver
            shipment.vehicle = vehicle
            shipment.status = Shipment.Status.ASSIGNED
            shipment.save()
            
            # Return immediately without creating status event for now
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
        
        if not shipment.driver:
            return Response({'error': 'No driver assigned to this shipment'}, status=status.HTTP_400_BAD_REQUEST)
        
        if shipment.status != Shipment.Status.ASSIGNED:
            return Response({'error': 'Shipment must be assigned before starting tracking'}, status=status.HTTP_400_BAD_REQUEST)
        
        shipment.status = Shipment.Status.IN_TRANSIT
        shipment.save()
        
        # Temporarily skip status event creation to avoid customer model issues
        # from tracking.models import ShipmentStatusEvent
        # ShipmentStatusEvent.objects.create(
        #     shipment=shipment,
        #     status=Shipment.Status.IN_TRANSIT,
        #     location_description="Tracking started"
        # )
        
        return Response(ShipmentSerializer(shipment).data)
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["status", "priority", "customer"]
    search_fields = ["tracking_code", "pickup_address", "dropoff_address"]
