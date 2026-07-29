from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import logging

from .models import Document, DocumentVerificationLog
from notifications.services import NotificationService
from notifications.models import Notification

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Document)
def document_created_or_updated(sender, instance, created, **kwargs):
    """Handle document creation and updates."""
    if created:
        # Log document upload
        DocumentVerificationLog.objects.create(
            document=instance,
            action=DocumentVerificationLog.Action.UPLOADED,
            notes='Document uploaded successfully'
        )
        
        # Check if document is already expired
        if instance.expiry_date and instance.is_expired():
            DocumentVerificationLog.objects.create(
                document=instance,
                action=DocumentVerificationLog.Action.EXPIRED,
                notes='Document was already expired at upload time'
            )


@receiver(post_delete, sender=Document)
def document_deleted(sender, instance, **kwargs):
    """Log document deletion."""
    try:
        DocumentVerificationLog.objects.create(
            document_id=instance.id,  # Use ID since instance is being deleted
            action='deleted',
            notes=f'Document deleted: {instance.title}'
        )
    except Exception as e:
        logger.error(f"Failed to log document deletion: {e}")


def check_and_send_expiry_notifications():
    """Check for expiring and expired documents and send notifications."""
    today = timezone.now().date()
    
    # Check for documents expiring in the next 30 days
    thirty_days_from_now = today + timedelta(days=30)
    
    expiring_documents = Document.objects.filter(
        expiry_date__lte=thirty_days_from_now,
        expiry_date__gte=today,
        last_reminder_sent__isnull=True
    )
    
    for document in expiring_documents:
        try:
            # Send notification to relevant users
            send_document_expiry_notification(document, 'expiring_soon')
            
            # Update last reminder sent
            document.last_reminder_sent = timezone.now()
            document.save(update_fields=['last_reminder_sent'])
            
            # Log the reminder
            DocumentVerificationLog.objects.create(
                document=document,
                action=DocumentVerificationLog.Action.REMINDER_SENT,
                notes=f'Expiry reminder sent for document expiring on {document.expiry_date}'
            )
            
        except Exception as e:
            logger.error(f"Failed to send expiry notification for document {document.id}: {e}")
    
    # Check for expired documents
    expired_documents = Document.objects.filter(
        expiry_date__lt=today,
        status=Document.Status.VALID
    )
    
    for document in expired_documents:
        try:
            # Update status to expired
            document.status = Document.Status.EXPIRED
            document.save(update_fields=['status'])
            
            # Send notification
            send_document_expiry_notification(document, 'expired')
            
            # Log the expiry
            DocumentVerificationLog.objects.create(
                document=document,
                action=DocumentVerificationLog.Action.EXPIRED,
                notes=f'Document expired on {document.expiry_date}'
            )
            
        except Exception as e:
            logger.error(f"Failed to process expired document {document.id}: {e}")


def send_document_expiry_notification(document, expiry_type):
    """Send notification for document expiry."""
    try:
        # Determine the recipient based on entity type
        if document.entity_type == 'user':
            # Send to the user
            from accounts.models import User
            try:
                user = User.objects.get(id=document.entity_id)
                NotificationService.send_notification(
                    user=user,
                    notification_type=Notification.NotificationType.DOCUMENT_EXPIRY,
                    title=f"Document {'Expiring Soon' if expiry_type == 'expiring_soon' else 'Expired'}",
                    message=f"Your {document.get_document_type_display()} is {'expiring soon' if expiry_type == 'expiring_soon' else 'expired'}. Please take necessary action.",
                    related_object_type='Document',
                    related_object_id=document.id
                )
            except User.DoesNotExist:
                logger.error(f"User not found for document {document.id}")
        
        elif document.entity_type == 'vehicle':
            # Send to assigned driver and organization admin
            from fleet.models import Vehicle
            try:
                vehicle = Vehicle.objects.get(id=document.entity_id)
                
                # Notify assigned driver
                if vehicle.assigned_vehicle:
                    driver = vehicle.assigned_vehicle
                    NotificationService.send_notification(
                        user=driver.user,
                        notification_type=Notification.NotificationType.DOCUMENT_EXPIRY,
                        title=f"Vehicle Document {'Expiring Soon' if expiry_type == 'expiring_soon' else 'Expired'}",
                        message=f"The {document.get_document_type_display()} for vehicle {vehicle.plate_number} is {'expiring soon' if expiry_type == 'expiring_soon' else 'expired'}.",
                        related_object_type='Document',
                        related_object_id=document.id
                    )
                
                # Notify organization admin
                if vehicle.organization:
                    from accounts.models import User
                    admins = User.objects.filter(
                        current_organization=vehicle.organization,
                        role='admin'
                    )
                    for admin in admins:
                        NotificationService.send_notification(
                            user=admin,
                            notification_type=Notification.NotificationType.DOCUMENT_EXPIRY,
                            title=f"Vehicle Document {'Expiring Soon' if expiry_type == 'expiring_soon' else 'Expired'}",
                            message=f"The {document.get_document_type_display()} for vehicle {vehicle.plate_number} is {'expiring soon' if expiry_type == 'expiring_soon' else 'expired'}.",
                            related_object_type='Document',
                            related_object_id=document.id
                        )
            except Vehicle.DoesNotExist:
                logger.error(f"Vehicle not found for document {document.id}")
        
        elif document.entity_type == 'organization':
            # Send to organization admins
            from organizations.models import Organization
            try:
                organization = Organization.objects.get(id=document.entity_id)
                from accounts.models import User
                admins = User.objects.filter(
                    current_organization=organization,
                    role='admin'
                )
                for admin in admins:
                    NotificationService.send_notification(
                        user=admin,
                        notification_type=Notification.NotificationType.DOCUMENT_EXPIRY,
                        title=f"Organization Document {'Expiring Soon' if expiry_type == 'expiring_soon' else 'Expired'}",
                        message=f"The {document.get_document_type_display()} for {organization.name} is {'expiring soon' if expiry_type == 'expiring_soon' else 'expired'}.",
                        related_object_type='Document',
                        related_object_id=document.id
                    )
            except Organization.DoesNotExist:
                logger.error(f"Organization not found for document {document.id}")
    
    except Exception as e:
        logger.error(f"Failed to send document expiry notification: {e}")