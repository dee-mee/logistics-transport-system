#!/usr/bin/env python
"""
Script to check existing customers in the database
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from orders.models import Customer
from accounts.models import User

print("Customers count:", Customer.objects.count())
print("Users with customer role:", User.objects.filter(role='customer').count())

for customer in Customer.objects.all():
    print(f"Customer: {customer.contact_name} / {customer.company_name}, Email: {customer.email}, Phone: {customer.contact_phone}")

for user in User.objects.filter(role='customer'):
    has_profile = hasattr(user, 'customer_profile')
    print(f"User: {user.username}, Has profile: {has_profile}")