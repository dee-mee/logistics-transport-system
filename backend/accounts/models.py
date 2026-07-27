from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user with a role so one login system serves everyone in the platform."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        DISPATCHER = "dispatcher", "Dispatcher"
        DRIVER = "driver", "Driver"
        CUSTOMER = "customer", "Customer"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    phone_number = models.CharField(max_length=20, blank=True)
    
    # Multi-organization support
    current_organization = models.ForeignKey(
        'organizations.Organization', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='current_users'
    )

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"
