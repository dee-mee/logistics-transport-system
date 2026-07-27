from rest_framework.routers import DefaultRouter
from .views import RouteViewSet, RouteStopViewSet, RouteOptimizationViewSet, RouteTemplateViewSet

router = DefaultRouter()
router.register("routes", RouteViewSet, basename='route')
router.register("stops", RouteStopViewSet, basename='route-stop')
router.register("optimizations", RouteOptimizationViewSet, basename='route-optimization')
router.register("templates", RouteTemplateViewSet, basename='route-template')

urlpatterns = router.urls