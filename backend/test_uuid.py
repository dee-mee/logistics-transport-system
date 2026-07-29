import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User

# Get actual user IDs
users = User.objects.all()
for user in users:
    print(f"User: {user.username}, ID: {user.id}, ID type: {type(user.id)}")