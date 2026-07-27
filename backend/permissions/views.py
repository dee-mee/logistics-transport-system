from rest_framework import viewsets, permissions
from django.contrib.auth.models import Permission
from .models import PermissionGroup, RolePermission, UserPermission
from .serializers import (
    PermissionSerializer, PermissionGroupSerializer, 
    RolePermissionSerializer, UserPermissionSerializer
)


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing available permissions."""
    serializer_class = PermissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Permission.objects.all()


class PermissionGroupViewSet(viewsets.ModelViewSet):
    """ViewSet for managing permission groups."""
    serializer_class = PermissionGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PermissionGroup.objects.all()
    
    def perform_create(self, serializer):
        serializer.save()


class RolePermissionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing role permissions."""
    serializer_class = RolePermissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see role permissions for their organizations
        return RolePermission.objects.filter(
            organization__members__user=self.request.user
        ).select_related('organization')
    
    def perform_create(self, serializer):
        # Ensure user can only create for their organizations
        org = serializer.validated_data['organization']
        if not org.members.filter(user=self.request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only manage permissions for your organizations")
        serializer.save()


class UserPermissionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user-specific permissions."""
    serializer_class = UserPermissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserPermission.objects.filter(
            organization__members__user=self.request.user
        ).select_related('organization', 'user')
    
    def perform_create(self, serializer):
        # Ensure user can only create for their organizations
        org = serializer.validated_data['organization']
        if not org.members.filter(user=self.request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only manage permissions for your organizations")
        serializer.save()