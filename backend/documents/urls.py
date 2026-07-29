from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, DocumentRequirementViewSet, DocumentVerificationLogViewSet

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'requirements', DocumentRequirementViewSet, basename='document-requirement')
router.register(r'verification-logs', DocumentVerificationLogViewSet, basename='document-verification-log')

urlpatterns = [
    path('', include(router.urls)),
]