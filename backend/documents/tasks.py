from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task
def check_document_expiry():
    """Check for expiring and expired documents and send notifications."""
    from documents.signals import check_and_send_expiry_notifications
    
    try:
        check_and_send_expiry_notifications()
        logger.info("Document expiry check completed successfully")
    except Exception as e:
        logger.error(f"Document expiry check failed: {e}")


@shared_task
def update_document_statuses():
    """Update status of all documents based on expiry dates."""
    from documents.models import Document
    
    try:
        documents = Document.objects.all()
        updated_count = 0
        
        for document in documents:
            old_status = document.status
            document.update_status()
            if old_status != document.status:
                updated_count += 1
        
        logger.info(f"Updated status for {updated_count} documents")
        return {'updated_count': updated_count}
    
    except Exception as e:
        logger.error(f"Document status update failed: {e}")
        return {'error': str(e)}