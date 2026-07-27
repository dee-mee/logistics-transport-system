from rest_framework.routers import DefaultRouter
from .views import (
    VehicleViewSet, DriverViewSet, MaintenanceRecordViewSet,
    VehicleDocumentViewSet, VehicleInspectionViewSet
)

router = DefaultRouter()
router.register("vehicles", VehicleViewSet, basename='vehicle')
router.register("drivers", DriverViewSet, basename='driver')
router.register("maintenance-records", MaintenanceRecordViewSet, basename='maintenance-record')
router.register("documents", VehicleDocumentViewSet, basename='vehicle-document')
router.register("inspections", VehicleInspectionViewSet, basename='vehicle-inspection')

urlpatterns = router.urls
