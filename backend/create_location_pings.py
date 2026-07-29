from tracking.models import VehicleLocationPing
from fleet.models import Vehicle
from django.utils import timezone
import random

vehicles = Vehicle.objects.all()
print(f'Creating location pings for {vehicles.count()} vehicles...')

for vehicle in vehicles:
    lat = -1.2921 + (random.random() - 0.5) * 0.1
    lng = 36.8219 + (random.random() - 0.5) * 0.1
    speed = random.uniform(20, 80)
    heading = random.uniform(0, 360)
    
    # Get the driver from the vehicle if available
    driver = vehicle.assigned_driver if hasattr(vehicle, 'assigned_driver') else None
    
    ping = VehicleLocationPing.objects.create(
        vehicle=vehicle,
        driver=driver,
        lat=lat,
        lng=lng,
        speed_kmh=speed,
        heading_deg=heading,
        address='Sample location near Nairobi',
        status_update='in_transit',
        recorded_at=timezone.now(),
        organization=vehicle.organization
    )
    print(f'Created ping for {vehicle.plate_number}: {lat}, {lng} (org: {vehicle.organization})')

print('Location pings created successfully!')