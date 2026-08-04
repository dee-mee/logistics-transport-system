from rest_framework import viewsets, permissions as rest_permissions
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
