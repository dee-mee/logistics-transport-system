from django.contrib import admin
from .models import ShipmentStatusEvent, VehicleLocationPing

admin.site.register(ShipmentStatusEvent)
admin.site.register(VehicleLocationPing)
