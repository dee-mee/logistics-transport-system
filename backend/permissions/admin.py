from django.contrib import admin
from django.contrib.auth.models import Permission
from .models import PermissionGroup, RolePermission, UserPermission


@admin.register(PermissionGroup)
class PermissionGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'module', 'description', 'created_at']
    list_filter = ['module', 'created_at']
    search_fields = ['name', 'description']
    filter_horizontal = ['permissions']
    readonly_fields = ['created_at']


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ['organization', 'role', 'module', 'access_level']
    list_filter = ['role', 'module', 'access_level']
    search_fields = ['organization__name']
    filter_horizontal = ['custom_permissions']


@admin.register(UserPermission)
class UserPermissionAdmin(admin.ModelAdmin):
    list_display = ['organization', 'user']
    list_filter = ['organization']
    search_fields = ['user__username', 'organization__name']
    filter_horizontal = ['permissions']