from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from organizations.models import Organization, OrganizationUser
from permissions.models import RolePermission, PermissionGroup
from permissions.permissions import HasModuleAccess
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class RBACEnforcementTestCase(APITestCase):
    """Test RBAC enforcement across roles, modules, and actions."""
    
    def setUp(self):
        """Set up test organizations, users, and permissions."""
        # Create test organization
        self.organization = Organization.objects.create(
            name="Test Organization",
            code="TEST_ORG"
        )
        
        # Create users with different roles
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@test.com",
            password="testpass123",
            role="admin"
        )
        self.admin_user.current_organization = self.organization
        self.admin_user.save()
        
        self.dispatcher_user = User.objects.create_user(
            username="dispatcher",
            email="dispatcher@test.com",
            password="testpass123",
            role="dispatcher"
        )
        self.dispatcher_user.current_organization = self.organization
        self.dispatcher_user.save()
        
        self.driver_user = User.objects.create_user(
            username="driver",
            email="driver@test.com",
            password="testpass123",
            role="driver"
        )
        self.driver_user.current_organization = self.organization
        self.driver_user.save()
        
        self.customer_user = User.objects.create_user(
            username="customer",
            email="customer@test.com",
            password="testpass123",
            role="customer"
        )
        self.customer_user.current_organization = self.organization
        self.customer_user.save()
        
        # Create organization memberships
        OrganizationUser.objects.create(
            organization=self.organization,
            user=self.admin_user,
            role=OrganizationUser.Role.ADMIN
        )
        OrganizationUser.objects.create(
            organization=self.organization,
            user=self.dispatcher_user,
            role=OrganizationUser.Role.DISPATCHER
        )
        OrganizationUser.objects.create(
            organization=self.organization,
            user=self.driver_user,
            role=OrganizationUser.Role.DRIVER
        )
        OrganizationUser.objects.create(
            organization=self.organization,
            user=self.customer_user,
            role=OrganizationUser.Role.CUSTOMER
        )
        
        # Set up default permissions
        self._setup_default_permissions()
        
        # API client
        self.client = APIClient()
    
    def _setup_default_permissions(self):
        """Set up default role permissions for testing."""
        # Admin permissions - FULL on all modules
        for module in PermissionGroup.Module.values:
            RolePermission.objects.create(
                organization=self.organization,
                role=OrganizationUser.Role.ADMIN,
                module=module,
                access_level=RolePermission.AccessLevel.FULL
            )
        
        # Dispatcher permissions - EDIT on key modules
        dispatcher_modules = [
            PermissionGroup.Module.VEHICLES,
            PermissionGroup.Module.DISPATCH,
            PermissionGroup.Module.ORDERS,
            PermissionGroup.Module.TRACKING,
            PermissionGroup.Module.FUEL,
            PermissionGroup.Module.DASHBOARD
        ]
        for module in dispatcher_modules:
            RolePermission.objects.create(
                organization=self.organization,
                role=OrganizationUser.Role.DISPATCHER,
                module=module,
                access_level=RolePermission.AccessLevel.EDIT
            )
        
        # Driver permissions - VIEW on key modules
        driver_modules = [
            PermissionGroup.Module.VEHICLES,
            PermissionGroup.Module.DISPATCH,
            PermissionGroup.Module.TRACKING,
            PermissionGroup.Module.DASHBOARD
        ]
        for module in driver_modules:
            RolePermission.objects.create(
                organization=self.organization,
                role=OrganizationUser.Role.DRIVER,
                module=module,
                access_level=RolePermission.AccessLevel.VIEW
            )
        
        # Customer permissions - VIEW on limited modules
        customer_modules = [
            PermissionGroup.Module.ORDERS,
            PermissionGroup.Module.TRACKING,
            PermissionGroup.Module.DASHBOARD
        ]
        for module in customer_modules:
            RolePermission.objects.create(
                organization=self.organization,
                role=OrganizationUser.Role.CUSTOMER,
                module=module,
                access_level=RolePermission.AccessLevel.VIEW
            )
    
    def _authenticate_user(self, user):
        """Helper to authenticate a user."""
        self.client.force_authenticate(user=user)
    
    def test_admin_full_access(self):
        """Test admin has FULL access to all modules."""
        self._authenticate_user(self.admin_user)
        
        # Test vehicle endpoints
        response = self.client.get('/api/fleet/vehicles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        response = self.client.post('/api/fleet/vehicles/', {
            'plate_number': 'TEST123',
            'make': 'Toyota',
            'model': 'Hilux',
            'year': 2020,
            'vehicle_type': 'truck',
            'status': 'available'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        response = self.client.delete('/api/fleet/vehicles/1/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    
    def test_dispatcher_edit_access(self):
        """Test dispatcher has EDIT access to key modules."""
        self._authenticate_user(self.dispatcher_user)
        
        # Test vehicle endpoints
        response = self.client.get('/api/fleet/vehicles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        response = self.client.post('/api/fleet/vehicles/', {
            'plate_number': 'TEST123',
            'make': 'Toyota',
            'model': 'Hilux',
            'year': 2020,
            'vehicle_type': 'truck',
            'status': 'available'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Should not have access to settings
        response = self.client.get('/api/organizations/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_driver_view_access(self):
        """Test driver has VIEW access to key modules."""
        self._authenticate_user(self.driver_user)
        
        # Test vehicle endpoints
        response = self.client.get('/api/fleet/vehicles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should not be able to create
        response = self.client.post('/api/fleet/vehicles/', {
            'plate_number': 'TEST123',
            'make': 'Toyota',
            'model': 'Hilux',
            'year': 2020,
            'vehicle_type': 'truck',
            'status': 'available'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_customer_limited_access(self):
        """Test customer has VIEW access to limited modules."""
        self._authenticate_user(self.customer_user)
        
        # Test orders endpoint
        response = self.client.get('/api/orders/shipments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should not have access to fleet
        response = self.client.get('/api/fleet/vehicles/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_has_module_access_permission_class(self):
        """Test HasModuleAccess permission class."""
        from permissions.permissions import HasModuleAccess
        from rest_framework.test import APIRequestFactory
        from fleet.views import VehicleViewSet
        
        factory = APIRequestFactory()
        request = factory.get('/api/fleet/vehicles/')
        request.user = self.admin_user
        
        permission = HasModuleAccess()
        view = VehicleViewSet()
        view.module = PermissionGroup.Module.VEHICLES
        view.action = 'list'
        
        has_permission = permission.has_permission(request, view)
        self.assertTrue(has_permission)
    
    def test_action_to_access_level_mapping(self):
        """Test DRF actions map to correct access levels."""
        from permissions.permissions import ACTION_TO_ACCESS_LEVEL
        
        self.assertEqual(
            ACTION_TO_ACCESS_LEVEL['list'],
            RolePermission.AccessLevel.VIEW
        )
        self.assertEqual(
            ACTION_TO_ACCESS_LEVEL['retrieve'],
            RolePermission.AccessLevel.VIEW
        )
        self.assertEqual(
            ACTION_TO_ACCESS_LEVEL['create'],
            RolePermission.AccessLevel.EDIT
        )
        self.assertEqual(
            ACTION_TO_ACCESS_LEVEL['update'],
            RolePermission.AccessLevel.EDIT
        )
        self.assertEqual(
            ACTION_TO_ACCESS_LEVEL['destroy'],
            RolePermission.AccessLevel.FULL
        )
    
    def test_organization_permission_backend(self):
        """Test OrganizationPermissionBackend."""
        from permissions.backend import OrganizationPermissionBackend
        
        backend = OrganizationPermissionBackend()
        
        # Test admin has all permissions
        has_perm = backend.has_perm(self.admin_user, 'view_vehicle')
        self.assertTrue(has_perm)
        
        # Test dispatcher has edit permissions
        has_perm = backend.has_perm(self.dispatcher_user, 'change_vehicle')
        self.assertTrue(has_perm)
        
        # Test driver only has view permissions
        has_perm = backend.has_perm(self.driver_user, 'view_vehicle')
        self.assertTrue(has_perm)
        has_perm = backend.has_perm(self.driver_user, 'change_vehicle')
        self.assertFalse(has_perm)
    
    def test_cross_tenant_isolation(self):
        """Test users can't access other organizations' data."""
        # Create another organization
        other_org = Organization.objects.create(
            name="Other Organization",
            code="OTHER_ORG"
        )
        
        # Create a user in other organization
        other_user = User.objects.create_user(
            username="other_admin",
            email="other@admin.com",
            password="testpass123",
            role="admin"
        )
        other_user.current_organization = other_org
        other_user.save()
        
        OrganizationUser.objects.create(
            organization=other_org,
            user=other_user,
            role=OrganizationUser.Role.ADMIN
        )
        
        # Set up permissions for other organization
        for module in PermissionGroup.Module.values:
            RolePermission.objects.create(
                organization=other_org,
                role=OrganizationUser.Role.ADMIN,
                module=module,
                access_level=RolePermission.AccessLevel.FULL
            )
        
        # Authenticate as original org admin
        self._authenticate_user(self.admin_user)
        
        # Try to access other organization's data
        response = self.client.get('/api/organizations/')
        # Should only see their own organization
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], str(self.organization.id))


class ObjectLevelFilteringTestCase(APITestCase):
    """Test object-level filtering based on user role."""
    
    def setUp(self):
        """Set up test data for object-level filtering."""
        self.organization = Organization.objects.create(
            name="Test Organization",
            code="TEST_ORG"
        )
        
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@test.com",
            password="testpass123",
            role="admin"
        )
        self.admin_user.current_organization = self.organization
        self.admin_user.save()
        
        self.driver_user = User.objects.create_user(
            username="driver",
            email="driver@test.com",
            password="testpass123",
            role="driver"
        )
        self.driver_user.current_organization = self.organization
        self.driver_user.save()
        
        self.customer_user = User.objects.create_user(
            username="customer",
            email="customer@test.com",
            password="testpass123",
            role="customer"
        )
        self.customer_user.current_organization = self.organization
        self.customer_user.save()
        
        # Create organization memberships
        OrganizationUser.objects.create(
            organization=self.organization,
            user=self.admin_user,
            role=OrganizationUser.Role.ADMIN
        )
        OrganizationUser.objects.create(
            organization=self.organization,
            user=self.driver_user,
            role=OrganizationUser.Role.DRIVER
        )
        OrganizationUser.objects.create(
            organization=self.organization,
            user=self.customer_user,
            role=OrganizationUser.Role.CUSTOMER
        )
        
        # Set up permissions
        for module in PermissionGroup.Module.values:
            RolePermission.objects.create(
                organization=self.organization,
                role=OrganizationUser.Role.ADMIN,
                module=module,
                access_level=RolePermission.AccessLevel.FULL
            )
            RolePermission.objects.create(
                organization=self.organization,
                role=OrganizationUser.Role.DRIVER,
                module=module,
                access_level=RolePermission.AccessLevel.VIEW
            )
            RolePermission.objects.create(
                organization=self.organization,
                role=OrganizationUser.Role.CUSTOMER,
                module=module,
                access_level=RolePermission.AccessLevel.VIEW
            )
        
        self.client = APIClient()
    
    def test_driver_object_filtering(self):
        """Test driver can only see their own assigned records."""
        self._authenticate_user(self.driver_user)
        
        # Test driver queryset filtering
        response = self.client.get('/api/fleet/drivers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only see their own record
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['user'], self.driver_user.id)
    
    def test_customer_object_filtering(self):
        """Test customer can only see their own orders."""
        self._authenticate_user(self.customer_user)
        
        # Test customer queryset filtering
        response = self.client.get('/api/orders/shipments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only see their own shipments
        for shipment in response.data:
            self.assertEqual(shipment['customer'], self.customer_user.id)