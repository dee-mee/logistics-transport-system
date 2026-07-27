from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PermissionViewSet, PermissionGroupViewSet, RolePermissionViewSet, UserPermissionViewSet

router = DefaultRouter()
router.register(r'permissions', PermissionViewSet, basename='permission')
router.register(r'permission-groups', PermissionGroupViewSet, basename='permission-group')
router.register(r'role-permissions', RolePermissionViewSet, basename='role-permission')
router.register(r'user-permissions', UserPermissionViewSet, basename='user-permission')

urlpatterns = [
    path('', include(router.urls)),
]