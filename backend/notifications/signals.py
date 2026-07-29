from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models.signals import pre_save
from .models import Notification
from .services import NotificationService


@receiver(post_save, sender='tracking.ShipmentStatusEvent')
def shipment_status_changed(sender, instance, created, **kwargs):
    """Send notification when shipment status changes."""
    if created:
        # Get the shipment's customer
        shipment = instance.shipment
        if shipment and shipment.customer:
            try:
                # Check if customer has a user field
                if hasattr(shipment.customer, 'user') and shipment.customer.user:
                    NotificationService.send_notification(
                        user=shipment.customer.user,
                        notification_type=Notification.NotificationType.SHIPMENT_STATUS,
                        title=f"Shipment Status Updated: {instance.status}",
                        message=f"Your shipment {shipment.tracking_code} status is now: {instance.status}",
                        related_object_type='Shipment',
                        related_object_id=shipment.id
                    )
            except Exception as e:
                # Log error but don't fail status event creation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send shipment status notification: {e}")


@receiver(post_save, sender='dispatch.Trip')
def dispatch_assignment_created(sender, instance, created, **kwargs):
    """Send notification when a trip is assigned to a driver."""
    if created and instance.driver:
        NotificationService.send_notification(
            user=instance.driver.user,
            notification_type=Notification.NotificationType.DISPATCH_ASSIGNMENT,
            title=f"New Trip Assignment",
            message=f"You have been assigned to trip #{instance.id}",
            related_object_type='Trip',
            related_object_id=instance.id
        )


@receiver(post_save, sender='tracking.GPSAlert')
def gps_alert_created(sender, instance, created, **kwargs):
    """Send notification when GPS alert is created."""
    if created:
        # Notify driver if vehicle has assigned driver
        if instance.vehicle and instance.vehicle.assigned_driver:
            NotificationService.send_notification(
                user=instance.vehicle.assigned_driver.user,
                notification_type=Notification.NotificationType.GPS_ALERT,
                title=f"GPS Alert: {instance.alert_type}",
                message=instance.description or "GPS alert triggered for your vehicle",
                related_object_type='GPSAlert',
                related_object_id=instance.id
            )
        
        # Notify dispatchers/admins about high severity alerts
        if instance.severity == 'high':
            # Get organization's dispatchers and admins
            from organizations.models import OrganizationUser
            from accounts.models import User
            
            org_users = OrganizationUser.objects.filter(
                organization=instance.organization,
                role__in=[OrganizationUser.Role.ADMIN, OrganizationUser.Role.DISPATCHER]
            )
            
            for org_user in org_users:
                NotificationService.send_notification(
                    user=org_user.user,
                    notification_type=Notification.NotificationType.GPS_ALERT,
                    title=f"High Severity GPS Alert: {instance.alert_type}",
                    message=instance.description or "High severity GPS alert triggered",
                    related_object_type='GPSAlert',
                    related_object_id=instance.id
                )


@receiver(pre_save, sender='fleet.MaintenanceRecord')
def maintenance_due_check(sender, instance, **kwargs):
    """Send notification when maintenance is due or overdue."""
    if instance.pk:
        # Only check on updates, not creates
        old_instance = sender.objects.get(pk=instance.pk)
        
        # Check if status changed to scheduled or if it's now due
        if (old_instance.status != instance.status and 
            instance.status == 'scheduled' and 
            instance.scheduled_date):
            
            # Notify organization's admins and dispatchers
            from organizations.models import OrganizationUser
            
            org_users = OrganizationUser.objects.filter(
                organization=instance.vehicle.organization,
                role__in=[OrganizationUser.Role.ADMIN, OrganizationUser.Role.DISPATCHER]
            )
            
            for org_user in org_users:
                NotificationService.send_notification(
                    user=org_user.user,
                    notification_type=Notification.NotificationType.MAINTENANCE_DUE,
                    title=f"Maintenance Scheduled: {instance.vehicle.plate_number}",
                    message=f"Maintenance scheduled for {instance.vehicle.plate_number} on {instance.scheduled_date}",
                    related_object_type='MaintenanceRecord',
                    related_object_id=instance.id
                )


@receiver(post_save, sender='fuel.FuelAlert')
def fuel_alert_created(sender, instance, created, **kwargs):
    """Send notification when fuel alert is created."""
    if created:
        # Notify organization's admins and dispatchers
        from organizations.models import OrganizationUser
        
        org_users = OrganizationUser.objects.filter(
            organization=instance.organization,
            role__in=[OrganizationUser.Role.ADMIN, OrganizationUser.Role.DISPATCHER]
        )
        
        for org_user in org_users:
            NotificationService.send_notification(
                user=org_user.user,
                notification_type=Notification.NotificationType.FUEL_ANOMALY,
                title=f"Fuel Alert: {instance.alert_type}",
                message=instance.description or "Fuel anomaly detected",
                related_object_type='FuelAlert',
                related_object_id=instance.id
            )


@receiver(post_save, sender='accounts.User')
def user_created(sender, instance, created, **kwargs):
    """Send welcome notification when user is created."""
    if created:
        try:
            NotificationService.send_notification(
                user=instance,
                notification_type=Notification.NotificationType.ACCOUNT_VERIFICATION,
                title="Welcome to LogisticsPro",
                message="Thank you for signing up! Please verify your email address.",
                related_object_type='User',
                related_object_id=instance.id
            )
        except Exception as e:
            # Log error but don't fail user creation if Redis is down
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send welcome notification to user {instance.username}: {e}")