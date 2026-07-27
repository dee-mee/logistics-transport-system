from rest_framework import serializers
from .models import Organization, OrganizationUser, OrganizationSettings, Invitation


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'plan', 'status', 'email', 'phone', 'address', 
                  'website', 'timezone', 'currency', 'locale', 'max_vehicles', 'max_drivers', 
                  'max_users', 'trial_ends_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class OrganizationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['name', 'slug', 'plan', 'email', 'phone', 'address', 'website', 
                  'timezone', 'currency', 'locale', 'max_vehicles', 'max_drivers', 'max_users']


class OrganizationUserSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = OrganizationUser
        fields = ['id', 'organization', 'user', 'user_email', 'user_name', 'role', 
                  'is_active', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class OrganizationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationSettings
        fields = ['id', 'organization', 'enable_gps_tracking', 'enable_fuel_management', 
                  'enable_maintenance', 'enable_route_optimization', 'enable_notifications',
                  'default_dispatch_radius_km', 'max_working_hours_per_day', 
                  'require_mileage_logs', 'require_pre_trip_inspection', 'logo_url', 
                  'primary_color', 'secondary_color', 'notification_email', 'notification_sms',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvitationSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    invited_by_name = serializers.CharField(source='invited_by.get_full_name', read_only=True)
    
    class Meta:
        model = Invitation
        fields = ['id', 'organization', 'organization_name', 'email', 'role', 'status', 
                  'invited_by', 'invited_by_name', 'message', 'token', 'expires_at', 
                  'accepted_at', 'created_at']
        read_only_fields = ['id', 'token', 'created_at', 'accepted_at']


class InvitationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ['email', 'role', 'message', 'expires_at']