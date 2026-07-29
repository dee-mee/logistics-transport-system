from django.core.management.base import BaseCommand
from permissions.models import RolePermission
from organizations.models import Organization


class Command(BaseCommand):
    help = 'Clean incorrect role permissions'

    def handle(self, *args, **options):
        # Delete all existing role permissions
        count = RolePermission.objects.all().delete()
        self.stdout.write(self.style.WARNING(f"Deleted {count[0]} role permissions"))
        self.stdout.write(self.style.SUCCESS("Clean complete. Run fix_missing_permissions to recreate."))