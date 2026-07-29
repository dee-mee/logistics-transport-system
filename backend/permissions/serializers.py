from rest_framework import serializers
from .models import RolePermission, PermissionGroup, UserPermission
from django.contrib.auth.models import Permission


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'codename', 'name', 'content_type']
        read_only_fields = ['id']


class PermissionGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermissionGroup
        fields = ['id', 'name', 'module', 'permissions', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class RolePermissionSerializer(serializers.ModelSerializer):
    module_name = serializers.CharField(source='get_module_display', read_only=True)
    access_level_name = serializers.CharField(source='get_access_level_display', read_only=True)
    role_name = serializers.CharField(source='get_role_display', read_only=True)
    custom_permissions = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Permission.objects.all(),
        required=False
    )

    class Meta:
        model = RolePermission
        fields = [
            'id', 'organization', 'role', 'role_name', 'module', 'module_name',
            'access_level', 'access_level_name', 'custom_permissions'
        ]
        read_only_fields = ['id']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Add permission details
        if instance.custom_permissions.exists():
            data['custom_permissions_details'] = [
                {
                    'id': perm.id,
                    'codename': perm.codename,
                    'name': perm.name
                }
                for perm in instance.custom_permissions.all()
            ]
        return data


class UserPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPermission
        fields = ['id', 'organization', 'user', 'permissions']
        read_only_fields = ['id']


class OrganizationRolePermissionsSerializer(serializers.Serializer):
    """Serializer for getting/setting all role permissions for an organization."""
    organization_id = serializers.UUIDField()
    role_permissions = RolePermissionSerializer(many=True)

    def create(self, validated_data):
        organization_id = validated_data['organization_id']
        role_permissions_data = validated_data['role_permissions']
        
        from organizations.models import Organization
        organization = Organization.objects.get(id=organization_id)
        
        # Clear existing permissions for this organization
        RolePermission.objects.filter(organization=organization).delete()
        
        # Create new permissions
        created_permissions = []
        for perm_data in role_permissions_data:
            perm_data['organization'] = organization
            serializer = RolePermissionSerializer(data=perm_data)
            if serializer.is_valid():
                created_permissions.append(serializer.save())
        
        return {
            'organization_id': organization_id,
            'role_permissions': created_permissions
        }