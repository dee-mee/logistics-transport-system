from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.models import Permission
from .models import RolePermission, UserPermission


class OrganizationPermissionBackend(BaseBackend):
    """Custom permission backend that checks organization-based permissions."""
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        # This backend doesn't handle authentication, only authorization
        return None
    
    def has_perm(self, user_obj, perm, obj=None):
        """Check if user has a specific permission."""
        if not user_obj.is_authenticated:
            return False
        
        # Superusers have all permissions
        if user_obj.is_superuser:
            return True
        
        # Get the user's current organization
        organization = getattr(user_obj, 'current_organization', None)
        if not organization:
            return False
        
        # Check for custom user permissions first
        try:
            user_perm = UserPermission.objects.get(
                organization=organization, 
                user=user_obj
            )
            if user_perm.permissions.filter(codename=perm).exists():
                return True
        except UserPermission.DoesNotExist:
            pass
        
        # Check role-based permissions
        try:
            from organizations.models import OrganizationUser
            org_user = OrganizationUser.objects.get(
                organization=organization,
                user=user_obj
            )
            
            # Get the role permission for the module
            role_perm = RolePermission.objects.get(
                organization=organization,
                role=org_user.role,
                module=self._get_module_from_permission(perm)
            )
            
            # Check access level
            if role_perm.access_level == RolePermission.AccessLevel.FULL:
                return True
            elif role_perm.access_level == RolePermission.AccessLevel.EDIT:
                return perm.startswith('view_') or perm.startswith('change_') or perm.startswith('add_')
            elif role_perm.access_level == RolePermission.AccessLevel.VIEW:
                return perm.startswith('view_')
            
            # Check custom permissions
            if role_perm.custom_permissions.filter(codename=perm).exists():
                return True
                
        except (OrganizationUser.DoesNotExist, RolePermission.DoesNotExist):
            pass
        
        return False
    
    def has_module_perms(self, user_obj, app_label):
        """Check if user has any permissions in the given app."""
        if not user_obj.is_authenticated:
            return False
        
        if user_obj.is_superuser:
            return True
        
        organization = getattr(user_obj, 'current_organization', None)
        if not organization:
            return False
        
        # Check if user has any permissions in this app's module
        try:
            from organizations.models import OrganizationUser
            org_user = OrganizationUser.objects.get(
                organization=organization,
                user=user_obj
            )
            
            # Map app labels to modules
            app_to_module = {
                'fleet': 'vehicles',
                'dispatch': 'dispatch',
                'orders': 'orders',
                'tracking': 'tracking',
                'organizations': 'settings',
            }
            
            module = app_to_module.get(app_label, app_label)
            
            role_perm = RolePermission.objects.filter(
                organization=organization,
                role=org_user.role,
                module=module
            ).first()
            
            if role_perm and role_perm.access_level != RolePermission.AccessLevel.NONE:
                return True
                
        except OrganizationUser.DoesNotExist:
            pass
        
        return False
    
    def get_all_permissions(self, user_obj, obj=None):
        """Get all permissions for the user."""
        if not user_obj.is_authenticated:
            return set()
        
        if user_obj.is_superuser:
            return set(Permission.objects.values_list('codename', flat=True))
        
        organization = getattr(user_obj, 'current_organization', None)
        if not organization:
            return set()
        
        permissions = set()
        
        # Get custom user permissions
        try:
            user_perm = UserPermission.objects.get(
                organization=organization,
                user=user_obj
            )
            permissions.update(user_perm.permissions.values_list('codename', flat=True))
        except UserPermission.DoesNotExist:
            pass
        
        # Get role-based permissions
        try:
            from organizations.models import OrganizationUser
            org_user = OrganizationUser.objects.get(
                organization=organization,
                user=user_obj
            )
            
            role_perms = RolePermission.objects.filter(
                organization=organization,
                role=org_user.role
            )
            
            for role_perm in role_perms:
                if role_perm.access_level == RolePermission.AccessLevel.FULL:
                    # Add all permissions for this module
                    permissions.update(
                        Permission.objects.filter(
                            codename__startswith=role_perm.module
                        ).values_list('codename', flat=True)
                    )
                elif role_perm.access_level == RolePermission.AccessLevel.EDIT:
                    permissions.update(
                        Permission.objects.filter(
                            codename__startswith=role_perm.module
                        ).exclude(
                            codename__startswith='delete_'
                        ).values_list('codename', flat=True)
                    )
                elif role_perm.access_level == RolePermission.AccessLevel.VIEW:
                    permissions.update(
                        Permission.objects.filter(
                            codename__startswith=f'view_{role_perm.module}'
                        ).values_list('codename', flat=True)
                    )
                
                permissions.update(role_perm.custom_permissions.values_list('codename', flat=True))
                
        except OrganizationUser.DoesNotExist:
            pass
        
        return permissions
    
    def _get_module_from_permission(self, perm):
        """Extract module name from permission codename."""
        # Permission format: app.action_model (e.g., fleet.view_vehicle)
        # or app.action_module (e.g., fleet.view_vehicles)
        parts = perm.split('.')
        if len(parts) == 2:
            # Django format: app_label.codename (e.g., fleet.view_vehicle)
            codename = parts[1]
            # Extract the action and model/module
            action_parts = codename.split('_')
            if len(action_parts) >= 2:
                # The second part is the model/module name
                return action_parts[1]
            return codename
        else:
            # Simple format: action_model (e.g., view_vehicle)
            action_parts = perm.split('_')
            if len(action_parts) >= 2:
                return action_parts[1]
            return perm