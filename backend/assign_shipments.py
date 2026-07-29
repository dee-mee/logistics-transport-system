from orders.models import Shipment
from fleet.models import Driver

# Assign some shipments to driver John (ID: 2)
john_driver = Driver.objects.get(user__id=2)
print(f'Found driver: {john_driver.user.username}')

# Assign first 2 shipments to John
shipments = Shipment.objects.all()[:2]
for shipment in shipments:
    shipment.driver = john_driver
    shipment.save()
    print(f'Assigned {shipment.tracking_code} to driver John')

print('Shipments assigned successfully')