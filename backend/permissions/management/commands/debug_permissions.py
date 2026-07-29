from django.core.management.base import BaseCommand
from permissions.models import RolePermission
from organizations.models import Organization, OrganizationUser
from accounts.models import User


class Command(BaseCommand):
    help = 'Debug permission setup'

    def handle(self, *args, **options):
        try:
            user = User.objects.get(username='testuser')
            self.stdout.write(f"User: {user.username}, role: {user.role}")
            
            org = user.current_organization
            self.stdout.write(f"Organization: {org.name}")
            
            org_user = OrganizationUser.objects.get(organization=org, user=user)
            self.stdout.write(f"OrganizationUser role: {org_user.role}")
            
            role_perms = RolePermission.objects.filter(organization=org)
            self.stdout.write(f"Role permissions count: {role_perms.count()}")
            
            for rp in role_perms:
                self.stdout.write(f"  {rp.role} - {rp.module} - {rp.access_level}")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))