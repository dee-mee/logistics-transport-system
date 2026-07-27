from rest_framework import serializers
from django.contrib.auth.models import Permission
from .models import PermissionGroup, RolePermission, UserPermission


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'codename', 'name']


class PermissionGroupSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.ListField(
        child=serializers.IntegerField(), 
        write_only=True, 
        required=False
    )
    
    class Meta:
        model = PermissionGroup
        fields = ['id', 'name', 'module', 'permissions', 'permission_ids', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        permission_ids = validated_data.pop('permission_ids', [])
        permission_group = PermissionGroup.objects.create(**validated_data)
        if permission_ids:
            permission_group.permissions.set(permission_ids)
        return permission_group
    
    def update(self, instance, validated_data):
        permission_ids = validated_data.pop('permission_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if permission_ids is not None:
            instance.permissions.set(permission_ids)
        return instance


class RolePermissionSerializer(serializers.ModelSerializer):
    custom_permissions = PermissionSerializer(many=True, read_only=True)
    custom_permission_ids = serializers.ListField(
        child=serializers.IntegerField(), 
        write_only=True, 
        required=False
    )
    
    class Meta:
        model = RolePermission
        fields = ['id', 'organization', 'role', 'module', 'access_level', 
                  'custom_permissions', 'custom_permission_ids']
    
    def create(self, validated_data):
        custom_permission_ids = validated_data.pop('custom_permission_ids', [])
        role_permission = RolePermission.objects.create(**validated_data)
        if custom_permission_ids:
            role_permission.custom_permissions.set(custom_permission_ids)
        return role_permission
    
    def update(self, instance, validated_data):
        custom_permission_ids = validated_data.pop('custom_permission_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if custom_permission_ids is not None:
            instance.custom_permissions.set(custom_permission_ids)
        return instance


class UserPermissionSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.ListField(
        child=serializers.IntegerField(), 
        write_only=True, 
        required=False
    )
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = UserPermission
        fields = ['id', 'organization', 'user', 'user_email', 'user_name', 
                  'permissions', 'permission_ids']
    
    def create(self, validated_data):
        permission_ids = validated_data.pop('permission_ids', [])
        user_permission = UserPermission.objects.create(**validated_data)
        if permission_ids:
            user_permission.permissions.set(permission_ids)
        return user_permission
    
    def update(self, instance, validated_data):
        permission_ids = validated_data.pop('permission_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if permission_ids is not None:
            instance.permissions.set(permission_ids)
        return instance