from django.apps import AppConfig
from django.conf import settings


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'

    def ready(self):
        # Import signals to connect them
        import notifications.signals
        
        # Initialize Africa's Talking SDK once at app startup
        # This avoids re-initializing on every SMS send
        if settings.AFRICASTALKING_USERNAME and settings.AFRICASTALKING_API_KEY:
            import africastalking
            africastalking.initialize(
                settings.AFRICASTALKING_USERNAME,
                settings.AFRICASTALKING_API_KEY
            )