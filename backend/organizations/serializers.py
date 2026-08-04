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
        extra_kwargs = {
            'slug': {'required': False, 'allow_blank': True},
            'plan': {'required': False, 'default': 'basic'},
            'email': {'required': True},
            'phone': {'required': False, 'allow_blank': True},
            'address': {'required': False, 'allow_blank': True},
            'website': {'required': False, 'allow_blank': True},
            'timezone': {'required': False, 'default': 'UTC'},
            'currency': {'required': False, 'default': 'USD'},
            'locale': {'required': False, 'default': 'en_US'},
            'max_vehicles': {'required': False, 'default': 10},
            'max_drivers': {'required': False, 'default': 20},
            'max_users': {'required': False, 'default': 50},
        }


class OrganizationUserSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = OrganizationUser
        fields = ['id', 'organization', 'user', 'user_email', 'user_name', 'username', 'role', 
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
        extra_kwargs = {
            'expires_at': {'required': False}
        }
    
    def validate_role(self, value):
        # Map friendly role names to model values
        role_mapping = {
            'manager': OrganizationUser.Role.MANAGER,
            'admin': OrganizationUser.Role.ADMIN,
            'driver': OrganizationUser.Role.DRIVER,
            'dispatcher': OrganizationUser.Role.DISPATCHER,
            'owner': OrganizationUser.Role.OWNER,
            'viewer': OrganizationUser.Role.VIEWER,
            'customer': OrganizationUser.Role.CUSTOMER,
            'member': OrganizationUser.Role.VIEWER,  # Map member to viewer
        }
        if value in role_mapping:
            return role_mapping[value]
        return value