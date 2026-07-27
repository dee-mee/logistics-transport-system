from django.contrib import admin
from .models import Organization, OrganizationUser, OrganizationSettings, Invitation


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'plan', 'status', 'created_at']
    list_filter = ['plan', 'status', 'created_at']
    search_fields = ['name', 'slug', 'email']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(OrganizationUser)
class OrganizationUserAdmin(admin.ModelAdmin):
    list_display = ['user', 'organization', 'role', 'is_active', 'joined_at']
    list_filter = ['role', 'is_active', 'joined_at']
    search_fields = ['user__username', 'organization__name']
    readonly_fields = ['id', 'joined_at']


@admin.register(OrganizationSettings)
class OrganizationSettingsAdmin(admin.ModelAdmin):
    list_display = ['organization', 'enable_gps_tracking', 'enable_fuel_management', 'enable_maintenance']
    list_filter = ['enable_gps_tracking', 'enable_fuel_management', 'enable_maintenance', 'enable_route_optimization']
    search_fields = ['organization__name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ['email', 'organization', 'role', 'status', 'expires_at', 'created_at']
    list_filter = ['role', 'status', 'created_at']
    search_fields = ['email', 'organization__name']
    readonly_fields = ['id', 'token', 'created_at', 'accepted_at']