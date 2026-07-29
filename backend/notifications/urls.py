from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, NotificationPreferenceViewSet

router = DefaultRouter()
router.register("", NotificationViewSet, basename='notification')
router.register("preferences", NotificationPreferenceViewSet, basename='notification-preference')

urlpatterns = router.urls