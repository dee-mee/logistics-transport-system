from rest_framework.routers import DefaultRouter
from .views import TripViewSet, TripStopViewSet

router = DefaultRouter()
router.register("trips", TripViewSet)
router.register("trip-stops", TripStopViewSet)

urlpatterns = router.urls
