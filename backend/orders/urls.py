from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, ShipmentViewSet

router = DefaultRouter()
router.register("customers", CustomerViewSet)
router.register("shipments", ShipmentViewSet)

urlpatterns = router.urls
