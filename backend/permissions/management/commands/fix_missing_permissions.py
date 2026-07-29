from django.core.management.base import BaseCommand
from permissions.models import RolePermission, PermissionGroup
from organizations.models import Organization, OrganizationUser


class Command(BaseCommand):
    help = 'Fix missing role permissions'

    def handle(self, *args, **options):
        # Define all required permissions for each role
        required_permissions = {
            'CUSTOMER': {
                'dashboard': 'VIEW',
                'fuel': 'VIEW',
                'orders': 'VIEW',
                'tracking': 'VIEW',
            },
            'ADMIN': {
                'dashboard': 'FULL',
                'fuel': 'FULL',
                'orders': 'FULL',
                'tracking': 'FULL',
                'vehicles': 'FULL',
                'dispatch': 'FULL',
                'routes': 'FULL',
                'settings': 'FULL',
            },
        }
        
        for org in Organization.objects.all():
            self.stdout.write(f"Processing organization: {org.name}")
            
            for role, modules in required_permissions.items():
                for module, access_level in modules.items():
                    role_perm, created = RolePermission.objects.get_or_create(
                        organization=org,
                        role=role,
                        module=module,
                        defaults={'access_level': access_level}
                    )
                    
                    if created:
                        self.stdout.write(self.style.SUCCESS(f"Created: {role} - {module} - {access_level}"))
                    else:
                        self.stdout.write(f"Exists: {role} - {module} - {role_perm.access_level}")
        
        self.stdout.write(self.style.SUCCESS("Permission fix complete"))