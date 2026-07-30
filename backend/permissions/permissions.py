from rest_framework import permissions
from .models import RolePermission, PermissionGroup

# Mapping of Django apps to PermissionGroup.Module values
APP_TO_MODULE = {
    'fleet': PermissionGroup.Module.VEHICLES,
    'dispatch': PermissionGroup.Module.DISPATCH,
    'orders': PermissionGroup.Module.ORDERS,
    'tracking': PermissionGroup.Module.TRACKING,
    'routes': PermissionGroup.Module.ROUTES,
    'fuel': PermissionGroup.Module.FUEL,
    'dashboard': PermissionGroup.Module.DASHBOARD,
    'organizations': PermissionGroup.Module.SETTINGS,
    'accounts': PermissionGroup.Module.SETTINGS,
}

# Mapping of DRF actions to access levels
ACTION_TO_ACCESS_LEVEL = {
    'list': RolePermission.AccessLevel.VIEW,
    'retrieve': RolePermission.AccessLevel.VIEW,
    'create': RolePermission.AccessLevel.EDIT,
    'update': RolePermission.AccessLevel.EDIT,
    'partial_update': RolePermission.AccessLevel.EDIT,
    'destroy': RolePermission.AccessLevel.FULL,
    # Custom read-only actions
    'custom_actions': RolePermission.AccessLevel.VIEW,  # Default for custom actions
    'summary': RolePermission.AccessLevel.VIEW,
    'vehicle_summary': RolePermission.AccessLevel.VIEW,
    'stats': RolePermission.AccessLevel.VIEW,
    'active_orders': RolePermission.AccessLevel.VIEW,
    'transactions': RolePermission.AccessLevel.VIEW,
    'vehicle_status': RolePermission.AccessLevel.VIEW,
    'shipment_status': RolePermission.AccessLevel.VIEW,
    'shipment_trend': RolePermission.AccessLevel.VIEW,
    'activity_feed': RolePermission.AccessLevel.VIEW,
    'weekly_performance': RolePermission.AccessLevel.VIEW,
    'alerts': RolePermission.AccessLevel.VIEW,
    'fuel_trend': RolePermission.AccessLevel.VIEW,
    'default_layout': RolePermission.AccessLevel.VIEW,
    'current': RolePermission.AccessLevel.VIEW,
    'assign_vehicle': RolePermission.AccessLevel.EDIT,
    'remove_vehicle': RolePermission.AccessLevel.EDIT,
    'resolve': RolePermission.AccessLevel.EDIT,
    'acknowledge': RolePermission.AccessLevel.EDIT,
    'run': RolePermission.AccessLevel.EDIT,
}


class HasModuleAccess(permissions.BasePermission):
    """
    Permission class that checks if user has appropriate access level for a module.
    
    This class should be used in ViewSets to enforce organization-based permissions.
    Each ViewSet should define a `module` attribute mapping to a PermissionGroup.Module value.
    """
    
    def __init__(self, required_access_level=None):
        """
        Args:
            required_access_level: Optional override for required access level.
                                   If not provided, it's derived from the action.
        """
        self.required_access_level = required_access_level
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        # Get the module from the view
        module = getattr(view, 'module', None)
        if not module:
            # Fallback: try to determine module from the app label
            if hasattr(view, 'queryset') and view.queryset is not None:
                app_label = view.queryset.model._meta.app_label
                if app_label:
                    module = APP_TO_MODULE.get(app_label)
        
        if not module:
            # If no module is defined, fall back to just checking authentication
            return True
        
        # Get the user's current organization
        organization = getattr(request.user, 'current_organization', None)
        if not organization:
            return False
        
        # Determine required access level from action or override
        if self.required_access_level:
            required_level = self.required_access_level
        else:
            action = getattr(view, 'action', 'list')
            required_level = ACTION_TO_ACCESS_LEVEL.get(action, RolePermission.AccessLevel.VIEW)
        
        # Check role-based permissions
        role = None
        module_name = None
        try:
            from organizations.models import OrganizationUser
            org_user = OrganizationUser.objects.get(
                organization=organization,
                user=request.user
            )
            
            # Use the role from OrganizationUser, not from user.role
            role = org_user.role
            
            # Normalize module name to match database format
            if isinstance(module, PermissionGroup.Module):
                module_name = module.value
            else:
                module_name = str(module).lower()
            
            role_perm = RolePermission.objects.get(
                organization=organization,
                role=role,
                module=module_name
            )
            
            # Check if user has required access level
            access_hierarchy = {
                RolePermission.AccessLevel.NONE: 0,
                RolePermission.AccessLevel.VIEW: 1,
                RolePermission.AccessLevel.EDIT: 2,
                RolePermission.AccessLevel.FULL: 3,
            }
            
            user_level = access_hierarchy.get(role_perm.access_level, 0)
            required = access_hierarchy.get(required_level, 1)
            
            return user_level >= required
            
        except (OrganizationUser.DoesNotExist, RolePermission.DoesNotExist) as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Permission check failed: {e}, role={role}, module={module_name}")
            return False
    
    def has_object_permission(self, request, view, obj):
        """
        Check if user has permission to access a specific object.
        
        This adds object-level filtering on top of module-level checks.
        Drivers should only see their own records, customers only their own orders, etc.
        """
        # First check module-level permission
        if not self.has_permission(request, view):
            return False
        
        # Superusers have access to everything
        if request.user.is_superuser:
            return True
        
        # Get the user's organization role
        try:
            from organizations.models import OrganizationUser
            org_user = OrganizationUser.objects.get(
                organization=request.user.current_organization,
                user=request.user
            )
            role = org_user.role
        except OrganizationUser.DoesNotExist:
            return False
        
        # Admins can access all objects in their organization
        if role == OrganizationUser.Role.ADMIN:
            # Ensure object belongs to the same organization
            if hasattr(obj, 'organization'):
                return obj.organization == request.user.current_organization
            return True
        
        # Driver role: only their own assigned records
        if role == OrganizationUser.Role.DRIVER:
            if hasattr(obj, 'driver'):
                return obj.driver == request.user
            if hasattr(obj, 'vehicle'):
                # Check if driver is assigned to this vehicle
                from fleet.models import Vehicle
                try:
                    vehicle = Vehicle.objects.get(id=obj.vehicle.id)
                    return vehicle.assigned_driver == request.user
                except Vehicle.DoesNotExist:
                    return False
            return False
        
        # Customer role: only their own orders/shipments
        if role == OrganizationUser.Role.CUSTOMER:
            if hasattr(obj, 'customer'):
                return obj.customer == request.user
            if hasattr(obj, 'order'):
                return obj.order.customer == request.user
            return False
        
        # Dispatcher role: can access all records in their organization
        if role == OrganizationUser.Role.DISPATCHER:
            if hasattr(obj, 'organization'):
                return obj.organization == request.user.current_organization
            return True
        
        # Default: no object-level access
        return False