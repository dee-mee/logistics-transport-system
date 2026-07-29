import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User
from rest_framework_simplejwt.tokens import RefreshToken

# Get or create test user
user, created = User.objects.get_or_create(
    username='testadmin',
    defaults={
        'email': 'testadmin@example.com',
        'role': 'admin',
        'is_staff': True,
        'is_superuser': True
    }
)
if created:
    user.set_password('testpass123')
    user.save()
    print(f"Created user: {user.username}")
else:
    print(f"User {user.username} already exists")

# Generate JWT token
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

print(f"\nAccess Token: {access_token}")
print(f"\nYou can test the API with:")
print(f"curl -X GET 'http://127.0.0.1:8000/api/documents/documents/entities/?entity_type=user' -H 'Authorization: Bearer {access_token}'")