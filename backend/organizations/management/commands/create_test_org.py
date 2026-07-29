from django.core.management.base import BaseCommand
from organizations.models import Organization
from accounts.models import User


class Command(BaseCommand):
    help = 'Create test organization and assign to test user'

    def handle(self, *args, **options):
        # Create an organization
        org, created = Organization.objects.get_or_create(
            slug='test-org',
            defaults={'name': 'Test Organization', 'email': 'test@example.com'}
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created organization: {org.name}'))
        else:
            self.stdout.write(f'Organization already exists: {org.name}')

        # Assign test user to organization
        try:
            user = User.objects.get(username='testuser')
            user.current_organization = org
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Assigned user {user.username} to organization {org.name}'))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR('Test user not found'))