from rest_framework import viewsets, permissions as rest_permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import Trip, TripStop
from .serializers import TripSerializer, TripStopSerializer
from permissions.permissions import HasModuleAccess
from permissions.models import PermissionGroup


class TripViewSet(viewsets.ModelViewSet):
    # module = PermissionGroup.Module.DISPATCH
    permission_classes = [rest_permissions.AllowAny]  # Changed for testing
    serializer_class = TripSerializer
    queryset = Trip.objects.all()
    
    def get_queryset(self):
        # For now, return all trips without organization filtering
        # TODO: Implement proper organization filtering when Trip model has organization field
        queryset = Trip.objects.all().select_related("vehicle", "driver__user").prefetch_related("stops").order_by("-created_at")
        
        # Drivers can only see their own trips (only if authenticated)
        if self.request.user.is_authenticated:
            try:
                from organizations.models import OrganizationUser
                org_user = OrganizationUser.objects.get(
                    organization=self.request.user.current_organization,
                    user=self.request.user
                )
                if org_user.role == OrganizationUser.Role.DRIVER:
                    queryset = queryset.filter(driver=self.request.user)
            except (OrganizationUser.DoesNotExist, AttributeError):
                pass
        
        return queryset
    
    def perform_create(self, serializer):
        # TODO: Implement organization assignment when Trip model has organization field
        serializer.save()
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "vehicle", "driver"]


class TripStopViewSet(viewsets.ModelViewSet):
    # module = PermissionGroup.Module.DISPATCH
    permission_classes = [rest_permissions.AllowAny]  # Changed for testing
    serializer_class = TripStopSerializer
    queryset = TripStop.objects.all()
    
    def get_queryset(self):
        # For now, return all trip stops without organization filtering
        # TODO: Implement proper organization filtering when Trip model has organization field
        return TripStop.objects.all().select_related("trip", "shipment").all()
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["trip", "stop_type"]
