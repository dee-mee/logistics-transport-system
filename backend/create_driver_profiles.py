#!/usr/bin/env python
"""
Script to create driver profiles for existing users with driver role
who don't have driver profiles yet.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User
from fleet.models import Driver
from datetime import datetime, timedelta

def create_missing_driver_profiles():
    """Create driver profiles for users with driver role but no profile."""
    # Get all users with driver role
    driver_users = User.objects.filter(role='driver')
    
    print(f"Found {driver_users.count()} users with driver role")
    
    created_count = 0
    skipped_count = 0
    error_count = 0
    
    for user in driver_users:
        try:
            # Check if user already has a driver profile
            if hasattr(user, 'driver_profile'):
                print(f"Skipping {user.username} - already has driver profile")
                skipped_count += 1
                continue
            
            # Create driver profile
            default_expiry = datetime.now().date() + timedelta(days=365)
            Driver.objects.create(
                user=user,
                license_number='TEMP-' + user.username.upper(),
                license_type='commercial',
                license_expiry=default_expiry,
                employment_type='full_time',
                status='available'
            )
            print(f"Created driver profile for {user.username}")
            created_count += 1
            
        except Exception as e:
            print(f"Error creating driver profile for {user.username}: {e}")
            error_count += 1
    
    print(f"\nSummary:")
    print(f"Created: {created_count}")
    print(f"Skipped: {skipped_count}")
    print(f"Errors: {error_count}")

if __name__ == '__main__':
    create_missing_driver_profiles()