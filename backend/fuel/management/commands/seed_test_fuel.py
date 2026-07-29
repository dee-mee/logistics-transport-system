from django.core.management.base import BaseCommand
from accounts.models import User
from fuel.models import FuelTransaction
from organizations.models import Organization
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Seed test fuel data for testing'

    def handle(self, *args, **options):
        # Get the test user
        try:
            user = User.objects.get(username='testuser')
            self.stdout.write(f"User: {user.username}, Role: {user.role}, Org: {user.current_organization}")
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("Test user not found"))
            return

        # Check if user has an organization
        if not user.current_organization:
            self.stdout.write("User has no organization assigned")
            # Create or assign an organization
            org, created = Organization.objects.get_or_create(
                slug='test-org',
                defaults={'name': 'Test Organization', 'email': 'test@example.com'}
            )
            if created:
                self.stdout.write(f"Created organization: {org.name}")
            else:
                self.stdout.write(f"Using existing organization: {org.name}")
            
            user.current_organization = org
            user.save()
            self.stdout.write(f"Assigned user to organization: {org.name}")

        # Create some test fuel transactions
        org = user.current_organization
        self.stdout.write(f"Creating test fuel transactions for organization: {org.name}")

        # Get or create a vehicle
        from fleet.models import Vehicle
        vehicle = Vehicle.objects.filter(organization=org).first()
        if not vehicle:
            vehicle = Vehicle.objects.create(
                organization=org,
                plate_number="TEST123",
                make="Test",
                model="Vehicle",
                year=2023,
                vehicle_type="truck",
                status="available"
            )
            self.stdout.write(f"Created test vehicle: {vehicle.plate_number}")

        # Create fuel transactions for the last 30 days
        for i in range(10):
            date = timezone.now() - timedelta(days=i)
            FuelTransaction.objects.create(
                organization=org,
                vehicle=vehicle,
                transaction_type="purchase",
                fuel_type="diesel",
                date=date,
                quantity_liters=50.0 + i * 5,
                price_per_liter=1.5,
                total_cost=(50.0 + i * 5) * 1.5,
                location="Test Station",
                odometer_reading=10000 + i * 500
            )

        self.stdout.write(self.style.SUCCESS(f"Created fuel transactions"))
        self.stdout.write(f"Total fuel transactions: {FuelTransaction.objects.filter(organization=org).count()}")