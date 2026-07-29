import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('logistics_transport_system')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat Schedule
app.conf.beat_schedule = {
    'cleanup-expired-tokens': {
        'task': 'accounts.tasks.cleanup_expired_tokens',
        'schedule': crontab(hour=0, minute=0),  # Run daily at midnight
    },
    'retry-failed-notifications': {
        'task': 'notifications.tasks.retry_failed_notifications',
        'schedule': crontab(minute='*/15'),  # Run every 15 minutes
    },
    'send-daily-digest': {
        'task': 'notifications.tasks.send_daily_digest',
        'schedule': crontab(hour=8, minute=0),  # Run daily at 8 AM
    },
    'cleanup-old-notifications': {
        'task': 'notifications.tasks.cleanup_old_notifications',
        'schedule': crontab(hour=0, minute=0, day_of_week=0),  # Run weekly on Sunday
    },
}

app.conf.task_time_limit = 3600  # 1 hour hard limit
app.conf.task_soft_time_limit = 3000  # 50 minutes soft limit