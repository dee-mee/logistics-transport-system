from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
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
        return Customer.objects.filter(
            organization=self.request.user.current_organization
        ).order_by("-created_at")
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
    filter_backends = [filters.SearchFilter]
    search_fields = ["company_name", "contact_name", "contact_phone"]


class ShipmentViewSet(viewsets.ModelViewSet):
    module = PermissionGroup.Module.ORDERS
    permission_classes = [HasModuleAccess]
    serializer_class = ShipmentSerializer
    queryset = Shipment.objects.all()
    
    def get_queryset(self):
        queryset = Shipment.objects.filter(
            organization=self.request.user.current_organization
        ).select_related("customer").order_by("-created_at")
        
        # Customers can only see their own shipments
        try:
            from organizations.models import OrganizationUser
            org_user = OrganizationUser.objects.get(
                organization=self.request.user.current_organization,
                user=self.request.user
            )
            if org_user.role == OrganizationUser.Role.CUSTOMER:
                queryset = queryset.filter(customer=self.request.user)
        except OrganizationUser.DoesNotExist:
            pass
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["status", "priority", "customer"]
    search_fields = ["tracking_code", "pickup_address", "dropoff_address"]
