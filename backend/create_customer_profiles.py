#!/usr/bin/env python
"""
Script to create customer profiles for existing users with customer role
who don't have customer profiles yet.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User
from orders.models import Customer

def create_missing_customer_profiles():
    """Create customer profiles for users with customer role but no profile."""
    # Get all users with customer role
    customer_users = User.objects.filter(role='customer')
    
    print(f"Found {customer_users.count()} users with customer role")
    
    created_count = 0
    skipped_count = 0
    error_count = 0
    
    for user in customer_users:
        try:
            # Check if user already has a customer profile
            if hasattr(user, 'customer_profile'):
                print(f"Skipping {user.username} - already has customer profile")
                skipped_count += 1
                continue
            
            # Create customer profile
            Customer.objects.create(
                user=user,
                contact_name=f"{user.first_name} {user.last_name}" if user.first_name or user.last_name else user.username,
                contact_phone=user.phone_number or '',
                contact_email=user.email
            )
            print(f"Created customer profile for {user.username}")
            created_count += 1
            
        except Exception as e:
            print(f"Error creating customer profile for {user.username}: {e}")
            error_count += 1
    
    print(f"\nSummary:")
    print(f"Created: {created_count}")
    print(f"Skipped: {skipped_count}")
    print(f"Errors: {error_count}")

if __name__ == '__main__':
    create_missing_customer_profiles()