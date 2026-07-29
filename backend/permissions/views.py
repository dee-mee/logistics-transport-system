from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import Permission
from .models import PermissionGroup, RolePermission, UserPermission
from .serializers import (
    PermissionSerializer, PermissionGroupSerializer, 
    RolePermissionSerializer, UserPermissionSerializer,
    OrganizationRolePermissionsSerializer
)
from accounts.services import AuditLogService


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
        
        old_access = None
        role_perm = serializer.save()
        
        # Log permission change
        if old_access and old_access != role_perm.access_level:
            AuditLogService.log_permission_change(
                self.request.user,
                role_perm.organization,
                role_perm.module,
                role_perm.role,
                old_access,
                role_perm.access_level,
                self.request
            )

    def perform_update(self, serializer):
        old_access = self.instance.access_level
        role_perm = serializer.save()
        
        # Log permission change
        if old_access != role_perm.access_level:
            AuditLogService.log_permission_change(
                self.request.user,
                role_perm.organization,
                role_perm.module,
                role_perm.role,
                old_access,
                role_perm.access_level,
                self.request
            )

    @action(detail=False, methods=['get'])
    def organization_permissions(self, request):
        """Get all role permissions for the current organization."""
        organization = request.user.current_organization
        if not organization:
            return Response(
                {"error": "No organization set for current user"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        role_permissions = self.get_queryset()
        serializer = self.get_serializer(role_permissions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def set_organization_permissions(self, request):
        """Set all role permissions for the current organization."""
        organization = request.user.current_organization
        if not organization:
            return Response(
                {"error": "No organization set for current user"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = OrganizationRolePermissionsSerializer(data=request.data)
        if serializer.is_valid():
            result = serializer.save()
            return Response(result)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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