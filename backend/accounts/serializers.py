from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from organizations.models import Organization, OrganizationUser, OrganizationSettings
import uuid

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    organization_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    organization_role = serializers.CharField(write_only=True, required=False, allow_null=True)
    current_organization_name = serializers.CharField(source='current_organization.name', read_only=True, allow_null=True)
    current_organization_id = serializers.UUIDField(source='current_organization.id', read_only=True, allow_null=True)
    current_organization_role = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone_number', 'is_superuser', 'is_staff', 'is_active', 'password', 'last_login', 'organization_id', 'organization_role', 'current_organization_name', 'current_organization_id', 'current_organization_role']
        read_only_fields = ['id', 'is_superuser', 'is_staff', 'is_active', 'last_login', 'current_organization_name', 'current_organization_id', 'current_organization_role']
    
    def get_current_organization_role(self, obj):
        if obj.current_organization:
            try:
                org_user = OrganizationUser.objects.get(organization=obj.current_organization, user=obj)
                # Map enum to friendly name
                role_mapping = {
                    OrganizationUser.Role.MANAGER: 'manager',
                    OrganizationUser.Role.ADMIN: 'admin',
                    OrganizationUser.Role.DRIVER: 'driver',
                    OrganizationUser.Role.DISPATCHER: 'dispatcher',
                    OrganizationUser.Role.OWNER: 'owner',
                    OrganizationUser.Role.VIEWER: 'viewer',
                    OrganizationUser.Role.CUSTOMER: 'customer',
                }
                return role_mapping.get(org_user.role, 'viewer')
            except OrganizationUser.DoesNotExist:
                return None
        return None
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        organization_id = validated_data.pop('organization_id', None)
        organization_role = validated_data.pop('organization_role', None)
        
        if password:
            user = User.objects.create_user(**validated_data, password=password)
        else:
            user = User.objects.create_user(**validated_data)
        
        # If organization is provided, add user to organization
        if organization_id:
            try:
                organization = Organization.objects.get(id=organization_id)
                # Map role name to enum
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
                role = role_mapping.get(organization_role, OrganizationUser.Role.VIEWER)
                
                OrganizationUser.objects.create(
                    organization=organization,
                    user=user,
                    role=role
                )
                
                # Set as current organization if it's their first
                if not user.current_organization:
                    user.current_organization = organization
                    user.save()
            except Organization.DoesNotExist:
                pass
        
        return user
    
    def update(self, instance, validated_data):
        organization_id = validated_data.pop('organization_id', None)
        organization_role = validated_data.pop('organization_role', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Handle organization assignment
        if organization_id:
            try:
                organization = Organization.objects.get(id=organization_id)
                # Map role name to enum
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
                role = role_mapping.get(organization_role, OrganizationUser.Role.VIEWER)
                
                # Check if user already has a membership in this org
                org_user, created = OrganizationUser.objects.get_or_create(
                    organization=organization,
                    user=instance,
                    defaults={'role': role}
                )
                
                if not created:
                    org_user.role = role
                    org_user.save()
                
                # Set as current organization
                instance.current_organization = organization
                instance.save()
            except Organization.DoesNotExist:
                pass
        
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    organization_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    organization_role = serializers.CharField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'role', 'phone_number', 'organization_id', 'organization_role']

    def validate(self, attrs):
        # Only validate password confirmation if both are provided
        if 'password_confirm' in attrs and attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        organization_id = validated_data.pop('organization_id', None)
        organization_role = validated_data.pop('organization_role', None)
        
        user = User.objects.create_user(**validated_data)
        
        # If organization is provided, add user to organization
        if organization_id:
            try:
                organization = Organization.objects.get(id=organization_id)
                # Map role name to enum
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
                role = role_mapping.get(organization_role, OrganizationUser.Role.VIEWER)
                
                OrganizationUser.objects.create(
                    organization=organization,
                    user=user,
                    role=role
                )
                
                # Set the user's current organization
                user.current_organization = organization
                user.save()
            except Organization.DoesNotExist:
                pass
        else:
            # Auto-create a default organization for the user if no organization provided
            # Use UUID to ensure unique slug
            unique_suffix = str(uuid.uuid4())[:8]
            organization = Organization.objects.create(
                name=f"{user.username}'s Organization",
                slug=f"{user.username}-{unique_suffix}",
                email=user.email,
                phone=user.phone_number or ''
            )
            
            # Create the user as an owner of the organization
            OrganizationUser.objects.create(
                organization=organization,
                user=user,
                role=OrganizationUser.Role.OWNER
            )
            
            # Set the user's current organization
            user.current_organization = organization
            user.save()
            
            # Create default settings for the organization
            OrganizationSettings.objects.create(organization=organization)
        
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['username'] = user.username
        token['role'] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Add user data to response
        data['user'] = UserSerializer(self.user).data
        return data