from django.core.management.base import BaseCommand
from organizations.models import Organization, OrganizationUser
from accounts.models import User


class Command(BaseCommand):
    help = 'Add user as member to organization'

    def handle(self, *args, **options):
        try:
            user = User.objects.get(username='testuser')
            org = Organization.objects.get(slug='test-org')
            
            # Create OrganizationUser membership
            org_user, created = OrganizationUser.objects.get_or_create(
                organization=org,
                user=user,
                defaults={'role': OrganizationUser.Role.CUSTOMER}
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'Added {user.username} as {org_user.role} to {org.name}'))
            else:
                self.stdout.write(f'User already member: {org_user.role}')
                
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR('Test user not found'))
        except Organization.DoesNotExist:
            self.stdout.write(self.style.ERROR('Test organization not found'))