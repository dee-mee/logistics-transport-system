from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FuelTransactionViewSet, FuelCardViewSet, FuelConsumptionViewSet, FuelAlertViewSet

router = DefaultRouter()
router.register(r'transactions', FuelTransactionViewSet, basename='fuel-transaction')
router.register(r'cards', FuelCardViewSet, basename='fuel-card')
router.register(r'consumption', FuelConsumptionViewSet, basename='fuel-consumption')
router.register(r'alerts', FuelAlertViewSet, basename='fuel-alert')

urlpatterns = [
    path('', include(router.urls)),
]