from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from fleet.models import Driver, Vehicle
from organizations.models import Organization, OrganizationUser
from permissions.models import PermissionGroup, RolePermission


class DriverVehicleAssignmentTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.organization = Organization.objects.create(
            name="Acme Logistics",
            email="ops@acme.test",
        )
        self.admin_user = User.objects.create_user(
            username="fleetadmin",
            password="testpass123",
            role="admin",
            current_organization=self.organization,
        )
        OrganizationUser.objects.create(
            organization=self.organization,
            user=self.admin_user,
            role=OrganizationUser.Role.ADMIN,
        )
        RolePermission.objects.create(
            organization=self.organization,
            role=OrganizationUser.Role.ADMIN,
            module=PermissionGroup.Module.VEHICLES,
            access_level=RolePermission.AccessLevel.FULL,
        )
        self.client.force_authenticate(self.admin_user)

        self.vehicle = Vehicle.objects.create(
            organization=self.organization,
            plate_number="KAA123A",
            vehicle_type=Vehicle.VehicleType.VAN,
            status=Vehicle.Status.AVAILABLE,
        )

        self.driver_one_user = User.objects.create_user(
            username="driver-one",
            password="testpass123",
            role="driver",
            current_organization=self.organization,
        )
        self.driver_two_user = User.objects.create_user(
            username="driver-two",
            password="testpass123",
            role="driver",
            current_organization=self.organization,
        )

        self.driver_one = Driver.objects.create(
            organization=self.organization,
            user=self.driver_one_user,
            license_number="LIC-001",
            license_type="commercial",
            license_expiry="2027-01-01",
            assigned_vehicle=self.vehicle,
            status=Driver.Status.AVAILABLE,
        )
        self.driver_two = Driver.objects.create(
            organization=self.organization,
            user=self.driver_two_user,
            license_number="LIC-002",
            license_type="commercial",
            license_expiry="2027-01-01",
            status=Driver.Status.AVAILABLE,
        )

    def test_assign_vehicle_action_rejects_duplicate_assignment(self):
        response = self.client.post(
            f"/api/fleet/drivers/{self.driver_two.id}/assign_vehicle/",
            {"vehicle_id": str(self.vehicle.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.driver_two.refresh_from_db()
        self.assertIsNone(self.driver_two.assigned_vehicle)
        self.assertIn("already assigned", response.data["error"])
