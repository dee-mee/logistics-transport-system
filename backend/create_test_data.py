import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User
from fleet.models import Vehicle
from organizations.models import Organization

# Create test users
print("Creating test users...")
for i in range(3):
    username = f"testuser{i}"
    if not User.objects.filter(username=username).exists():
        user = User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="testpass123",
            role='driver',
            email_verified=True
        )
        print(f"Created user: {username}")
    else:
        print(f"User {username} already exists")

# Create test organization
print("\nCreating test organization...")
unique_id = random.randint(1000, 9999)
org, created = Organization.objects.get_or_create(
    name=f"Test Organization {unique_id}",
    defaults={
        'email': f'test{unique_id}@example.com',
        'phone': '+254700000000',
        'address': '123 Test Street',
        'slug': f'test-organization-{unique_id}'
    }
)
if created:
    print(f"Created organization: {org.name}")
else:
    print(f"Organization {org.name} already exists")

# Create test vehicles
print("\nCreating test vehicles...")
for i in range(3):
    plate_number = f"KAA{i}23B"
    if not Vehicle.objects.filter(plate_number=plate_number).exists():
        vehicle = Vehicle.objects.create(
            plate_number=plate_number,
            vehicle_type='truck',
            make='Toyota',
            model='Hilux',
            year=2023,
            organization=org,
            status='available'
        )
        print(f"Created vehicle: {plate_number}")
    else:
        print(f"Vehicle {plate_number} already exists")

print("\nTest data creation complete!")
print(f"Total users: {User.objects.count()}")
print(f"Total organizations: {Organization.objects.count()}")
print(f"Total vehicles: {Vehicle.objects.count()}")