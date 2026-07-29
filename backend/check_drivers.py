from accounts.models import User
from fleet.models import Driver

drivers = Driver.objects.all()
print('Drivers in system:')
for driver in drivers:
    user = driver.user
    print(f'  {user.username} (ID: {user.id}, is_driver: {getattr(user, "is_driver", False)}, role: {getattr(user, "role", "N/A")})')