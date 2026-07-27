from django.db import models
from django.contrib.auth.models import Permission
from organizations.models import Organization, OrganizationUser


class PermissionGroup(models.Model):
    """Groups of permissions for different roles and modules."""
    
    class Module(models.TextChoices):
        DASHBOARD = "dashboard", "Dashboard"
        VEHICLES = "vehicles", "Vehicles"
        DRIVERS = "drivers", "Drivers"
        DISPATCH = "dispatch", "Dispatch"
        TRACKING = "tracking", "Tracking"
        ORDERS = "orders", "Orders"
        MAINTENANCE = "maintenance", "Maintenance"
        FUEL = "fuel", "Fuel"
        INVENTORY = "inventory", "Inventory"
        COMPLIANCE = "compliance", "Compliance"
        INCIDENTS = "incidents", "Incidents"
        FINANCIAL = "financial", "Financial"
        REPORTS = "reports", "Reports"
        SETTINGS = "settings", "Settings"
        
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    module = models.CharField(max_length=20, choices=Module.choices)
    permissions = models.ManyToManyField(Permission, related_name='permission_groups')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('name', 'module')
        ordering = ['module', 'name']
    
    def __str__(self):
        return f"{self.module} - {self.name}"


class RolePermission(models.Model):
    """Assigns permission groups to organization roles."""
    
    class AccessLevel(models.TextChoices):
        NONE = "none", "No Access"
        VIEW = "view", "View Only"
        EDIT = "edit", "Edit"
        FULL = "full", "Full Control"
        
    id = models.AutoField(primary_key=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='role_permissions')
    role = models.CharField(max_length=20, choices=OrganizationUser.Role.choices)
    module = models.CharField(max_length=20, choices=PermissionGroup.Module.choices)
    access_level = models.CharField(max_length=10, choices=AccessLevel.choices, default=AccessLevel.NONE)
    custom_permissions = models.ManyToManyField(Permission, blank=True, related_name='custom_role_permissions')
    
    class Meta:
        unique_together = ('organization', 'role', 'module')
        ordering = ['organization', 'role', 'module']
    
    def __str__(self):
        return f"{self.organization.name} - {self.role} - {self.module} ({self.access_level})"


class UserPermission(models.Model):
    """Custom permissions for specific users (overrides role permissions)."""
    
    id = models.AutoField(primary_key=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='user_permissions')
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='custom_permissions')
    permissions = models.ManyToManyField(Permission, related_name='user_custom_permissions')
    
    class Meta:
        unique_together = ('organization', 'user')
    
    def __str__(self):
        return f"Custom permissions for {self.user.username} in {self.organization.name}"