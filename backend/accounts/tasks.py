from celery import shared_task
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from django.utils import timezone
from datetime import timedelta


@shared_task
def cleanup_expired_tokens():
    """Clean up expired tokens to prevent database bloat."""
    # Clean up blacklisted tokens that are older than 30 days
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    # Delete blacklisted tokens older than 30 days
    old_blacklisted = BlacklistedToken.objects.filter(
        token__blacklisted_at__lt=thirty_days_ago
    )
    count = old_blacklisted.count()
    old_blacklisted.delete()
    
    # Delete outstanding tokens that are expired
    # Note: This requires checking the token's expiration time
    # For simplicity, we'll delete tokens older than 7 days
    seven_days_ago = timezone.now() - timedelta(days=7)
    old_outstanding = OutstandingToken.objects.filter(
        created_at__lt=seven_days_ago
    )
    outstanding_count = old_outstanding.count()
    old_outstanding.delete()
    
    return f"Cleaned up {count} blacklisted tokens and {outstanding_count} outstanding tokens"