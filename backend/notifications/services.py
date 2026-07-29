from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.conf import settings
from celery import shared_task
import africastalking
import logging
from .models import Notification, NotificationPreference

logger = logging.getLogger(__name__)


class NotificationService:
    """Centralized notification service handling all notification channels."""
    
    @staticmethod
    def send_notification(user, notification_type, title, message, 
                         related_object_type=None, related_object_id=None):
        """
        Send notification through user's preferred channels.
        
        Args:
            user: The user to notify
            notification_type: Notification.NotificationType value
            title: Notification title
            message: Notification message
            related_object_type: Optional related object type
            related_object_id: Optional related object ID
        """
        # Get or create user preferences
        preferences, created = NotificationPreference.objects.get_or_create(user=user)
        
        # Determine which channels to use based on notification type and user preferences
        channels = []
        
        # Check email preference
        if NotificationService._should_send_email(notification_type, preferences):
            channels.append(Notification.Channel.EMAIL)
        
        # Check SMS preference
        if NotificationService._should_send_sms(notification_type, preferences):
            channels.append(Notification.Channel.SMS)
        
        # Always send in-app notification
        channels.append(Notification.Channel.IN_APP)
        
        # Create notifications for each channel
        for channel in channels:
            notification = Notification.objects.create(
                user=user,
                type=notification_type,
                title=title,
                message=message,
                channel=channel,
                related_object_type=related_object_type,
                related_object_id=related_object_id
            )
            
            # Send based on channel
            if channel == Notification.Channel.EMAIL:
                try:
                    send_email_notification.delay(notification.id)
                except Exception as e:
                    # Log error but don't fail if Celery/Redis is down
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to dispatch email notification {notification.id}: {e}")
            elif channel == Notification.Channel.SMS:
                try:
                    send_sms_notification.delay(notification.id)
                except Exception as e:
                    # Log error but don't fail if Celery/Redis is down
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to dispatch SMS notification {notification.id}: {e}")
            # In-app notifications are already created and stored
    
    @staticmethod
    def _should_send_email(notification_type, preferences):
        """Check if user wants email for this notification type."""
        type_mapping = {
            Notification.NotificationType.SHIPMENT_STATUS: preferences.email_shipment_status,
            Notification.NotificationType.DISPATCH_ASSIGNMENT: preferences.email_dispatch_assignment,
            Notification.NotificationType.GPS_ALERT: preferences.email_gps_alert,
            Notification.NotificationType.MAINTENANCE_DUE: preferences.email_maintenance_due,
            Notification.NotificationType.FUEL_ANOMALY: preferences.email_fuel_anomaly,
            Notification.NotificationType.PASSWORD_RESET: preferences.email_password_reset,
            Notification.NotificationType.ACCOUNT_VERIFICATION: preferences.email_account_verification,
        }
        return type_mapping.get(notification_type, True)
    
    @staticmethod
    def _should_send_sms(notification_type, preferences):
        """Check if user wants SMS for this notification type."""
        type_mapping = {
            Notification.NotificationType.SHIPMENT_STATUS: preferences.sms_shipment_status,
            Notification.NotificationType.DISPATCH_ASSIGNMENT: preferences.sms_dispatch_assignment,
            Notification.NotificationType.GPS_ALERT: preferences.sms_gps_alert,
            Notification.NotificationType.MAINTENANCE_DUE: preferences.sms_maintenance_due,
            Notification.NotificationType.FUEL_ANOMALY: preferences.sms_fuel_anomaly,
            Notification.NotificationType.PASSWORD_RESET: preferences.sms_password_reset,
            Notification.NotificationType.ACCOUNT_VERIFICATION: preferences.sms_account_verification,
        }
        return type_mapping.get(notification_type, False)


@shared_task(bind=True, max_retries=3)
def send_email_notification(self, notification_id):
    """Send email notification asynchronously."""
    try:
        notification = Notification.objects.get(id=notification_id)
        
        # Check if email backend is configured
        if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
            logger.info(f"Email notification (console): {notification.title} to {notification.user.email}")
            notification.delivery_status = Notification.DeliveryStatus.SENT
            notification.sent_at = timezone.now()
            notification.save()
            return "Email sent to console"
        
        # Prepare email context
        context = {
            'user': notification.user,
            'notification': notification,
            'site_name': 'LogisticsPro',
        }
        
        # Choose template based on notification type
        template_map = {
            Notification.NotificationType.SHIPMENT_STATUS: 'email/shipment_status.html',
            Notification.NotificationType.DISPATCH_ASSIGNMENT: 'email/dispatch_assignment.html',
            Notification.NotificationType.GPS_ALERT: 'email/gps_alert.html',
            Notification.NotificationType.MAINTENANCE_DUE: 'email/maintenance_due.html',
            Notification.NotificationType.FUEL_ANOMALY: 'email/fuel_anomaly.html',
            Notification.NotificationType.PASSWORD_RESET: 'email/password_reset_email.html',
            Notification.NotificationType.ACCOUNT_VERIFICATION: 'email/account_verification.html',
        }
        
        template_name = template_map.get(notification.type, 'email/default_notification.html')
        
        # Render email content
        html_message = render_to_string(template_name, context)
        plain_message = notification.message
        
        # Send email
        send_mail(
            subject=notification.title,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[notification.user.email],
            html_message=html_message,
            fail_silently=False
        )
        
        # Update notification status
        notification.delivery_status = Notification.DeliveryStatus.SENT
        notification.sent_at = timezone.now()
        notification.save()
        
        logger.info(f"Email sent successfully to {notification.user.email}")
        return "Email sent successfully"
        
    except Exception as e:
        logger.error(f"Failed to send email notification: {str(e)}")
        
        # Update notification status
        notification.delivery_status = Notification.DeliveryStatus.FAILED
        notification.error_message = str(e)
        notification.retry_count += 1
        notification.save()
        
        # Retry with exponential backoff
        if notification.retry_count < 3:
            raise self.retry(exc=e, countdown=60 * (2 ** notification.retry_count))
        
        return f"Failed after {notification.retry_count} retries"


@shared_task(bind=True, max_retries=3)
def send_sms_notification(self, notification_id):
    """Send SMS notification asynchronously via Africa's Talking."""
    try:
        notification = Notification.objects.get(id=notification_id)
        
        # Check if SMS is configured
        if not settings.AFRICASTALKING_USERNAME or not settings.AFRICASTALKING_API_KEY:
            logger.warning("Africa's Talking not configured - SMS disabled")
            notification.delivery_status = Notification.DeliveryStatus.FAILED
            notification.error_message = "SMS provider not configured"
            notification.save()
            return "SMS provider not configured"
        
        # Get user's phone number
        phone_number = notification.user.phone_number
        if not phone_number:
            logger.warning(f"User {notification.user.username} has no phone number")
            notification.delivery_status = Notification.DeliveryStatus.FAILED
            notification.error_message = "User has no phone number"
            notification.save()
            return "User has no phone number"
        
        # Get SMS instance (SDK initialized at app startup)
        sms = africastalking.SMS
        
        # Send SMS
        # Truncate message if too long (SMS limit is 160 chars for single message)
        message = notification.message[:160]
        response = sms.send(
            message,
            [phone_number],
            sender_id=settings.AFRICASTALKING_SENDER_ID
        )
        
        # Update notification status
        if response and response.get('SMSMessageData', {}).get('Recipients'):
            recipient = response['SMSMessageData']['Recipients'][0]
            notification.delivery_status = Notification.DeliveryStatus.SENT
            notification.external_message_id = recipient.get('messageId')
            notification.sent_at = timezone.now()
            notification.save()
            
            logger.info(f"SMS sent successfully to {phone_number}")
            return "SMS sent successfully"
        elif response and isinstance(response, dict) and response.get('responses'):
            # Handle new SDK response format
            sms_response = response['responses'][0] if response['responses'] else {}
            if sms_response.get('status') == 'Success':
                notification.delivery_status = Notification.DeliveryStatus.SENT
                notification.external_message_id = sms_response.get('messageId')
                notification.sent_at = timezone.now()
                notification.save()
                
                logger.info(f"SMS sent successfully to {phone_number}")
                return "SMS sent successfully"
            else:
                raise Exception(f"SMS sending failed: {sms_response.get('message', 'Unknown error')}")
        else:
            raise Exception("No response from Africa's Talking")
        
    except Exception as e:
        logger.error(f"Failed to send SMS notification: {str(e)}")
        
        # Update notification status
        notification.delivery_status = Notification.DeliveryStatus.FAILED
        notification.error_message = str(e)
        notification.retry_count += 1
        notification.save()
        
        # Retry with exponential backoff
        if notification.retry_count < 3:
            raise self.retry(exc=e, countdown=60 * (2 ** notification.retry_count))
        
        return f"Failed after {notification.retry_count} retries"


@shared_task
def retry_failed_notifications():
    """Retry failed notifications that haven't exceeded max retries."""
    failed_notifications = Notification.objects.filter(
        delivery_status=Notification.DeliveryStatus.FAILED,
        retry_count__lt=3
    )
    
    for notification in failed_notifications:
        notification.delivery_status = Notification.DeliveryStatus.RETRYING
        notification.save()
        
        if notification.channel == Notification.Channel.EMAIL:
            send_email_notification.delay(notification.id)
        elif notification.channel == Notification.Channel.SMS:
            send_sms_notification.delay(notification.id)
    
    return f"Retrying {failed_notifications.count()} failed notifications"


@shared_task
def cleanup_old_notifications():
    """Clean up old notifications (older than 90 days)."""
    from datetime import timedelta
    cutoff_date = timezone.now() - timedelta(days=90)
    
    old_notifications = Notification.objects.filter(
        created_at__lt=cutoff_date,
        read=True
    ).delete()
    
    return f"Cleaned up {old_notifications[0]} old notifications"


@shared_task
def send_daily_digest():
    """Send daily digest of notifications to users who enabled it."""
    from datetime import timedelta
    
    # Get users who want daily digest
    users_with_digest = NotificationPreference.objects.filter(
        daily_digest_enabled=True
    ).select_related('user')
    
    for preference in users_with_digest:
        user = preference.user
        
        # Get unread notifications from last 24 hours
        yesterday = timezone.now() - timedelta(days=1)
        recent_notifications = Notification.objects.filter(
            user=user,
            created_at__gte=yesterday,
            read=False
        ).order_by('-created_at')
        
        if recent_notifications.exists():
            # Send digest email
            context = {
                'user': user,
                'notifications': recent_notifications,
                'site_name': 'LogisticsPro',
            }
            
            html_message = render_to_string('email/daily_digest.html', context)
            plain_message = f"You have {recent_notifications.count()} new notifications."
            
            try:
                send_mail(
                    subject="Daily Notification Digest",
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    html_message=html_message,
                    fail_silently=False
                )
                logger.info(f"Daily digest sent to {user.email}")
            except Exception as e:
                logger.error(f"Failed to send daily digest to {user.email}: {str(e)}")
    
    return "Daily digest processing completed"