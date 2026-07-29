import uuid
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.utils import timezone
from django.core.files.storage import default_storage
import os


def document_upload_path(instance, filename):
    """Generate upload path for documents."""
    # documents/{entity_type}/{entity_id}/{document_type}/{filename}
    entity_type = instance.entity_type.lower()
    document_type = instance.document_type.lower().replace(' ', '_')
    return f'documents/{entity_type}/{instance.entity_id}/{document_type}/{filename}'


class Document(models.Model):
    """Universal document model for all entities (users, vehicles, organizations)."""
    
    class EntityType(models.TextChoices):
        USER = "user", "User"
        VEHICLE = "vehicle", "Vehicle"
        ORGANIZATION = "organization", "Organization"
    
    class DocumentType(models.TextChoices):
        # User Documents
        NATIONAL_ID = "national_id", "National ID"
        KRA_PIN = "kra_pin", "KRA PIN"
        KRA_CERTIFICATE = "kra_certificate", "KRA Certificate"
        DRIVING_LICENSE = "driving_license", "Driving License"
        PROFILE_PHOTO = "profile_photo", "Profile Photo"
        CERTIFICATE_OF_GOOD_CONDUCT = "certificate_of_good_conduct", "Certificate of Good Conduct"
        PASSPORT = "passport", "Passport"
        MEDICAL_CERTIFICATE = "medical_certificate", "Medical Certificate"
        
        # Vehicle Documents
        INSURANCE = "insurance", "Insurance"
        REGISTRATION = "registration", "Registration"
        NUMBER_PLATE = "number_plate", "Number Plate"
        INSPECTION_CERTIFICATE = "inspection_certificate", "Inspection Certificate"
        ROAD_WORTHINESS = "road_worthiness", "Road Worthiness Certificate"
        LOGBOOK = "logbook", "Logbook"
        
        # General Documents
        CONTRACT = "contract", "Contract"
        ND_A = "nda", "Non-Disclosure Agreement"
        OTHER = "other", "Other"
    
    class Status(models.TextChoices):
        VALID = "valid", "Valid"
        EXPIRED = "expired", "Expired"
        EXPIRING_SOON = "expiring_soon", "Expiring Soon"
        PENDING = "pending", "Pending Verification"
        REJECTED = "rejected", "Rejected"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Entity relationship (polymorphic-like)
    entity_type = models.CharField(max_length=20, choices=EntityType.choices)
    entity_id = models.CharField(max_length=36)  # Allow both UUID and string for flexibility
    
    # Document details
    document_type = models.CharField(max_length=50, choices=DocumentType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Document identification
    document_number = models.CharField(max_length=100, blank=True, help_text="Document number/ID if applicable")
    issuing_authority = models.CharField(max_length=200, blank=True, help_text="Issuing authority/organization")
    
    # Dates
    issue_date = models.DateField(null=True, blank=True, help_text="Date when document was issued")
    expiry_date = models.DateField(null=True, blank=True, help_text="Date when document expires")
    
    # File storage
    file = models.FileField(
        upload_to=document_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'])],
        null=True,
        blank=True
    )
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True, help_text="File size in bytes")
    file_url = models.URLField(blank=True, help_text="External URL if file is stored elsewhere")
    
    # Verification
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_documents'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verification_notes = models.TextField(blank=True)
    
    # Notifications
    reminder_days_before = models.PositiveIntegerField(default=30, help_text="Days before expiry to send reminder")
    last_reminder_sent = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    tags = models.JSONField(default=list, blank=True, help_text="Tags for categorization")
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional document metadata")
    
    # Additional information
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-expiry_date']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['document_type']),
            models.Index(fields=['status']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['is_verified']),
            models.Index(fields=['entity_type', 'document_type', 'expiry_date']),
        ]
        # Disabled unique constraint for testing
        # constraints = [
        #     models.UniqueConstraint(
        #         fields=['entity_type', 'entity_id', 'document_type', 'document_number'],
        #         name='unique_document_per_entity',
        #         condition=models.Q(document_number__isnull=False),
        #         violation_error_message='A document with this number already exists for this entity.'
        #     )
        # ]
    
    def __str__(self):
        return f"{self.get_document_type_display()} for {self.entity_type} {self.entity_id}"
    
    def save(self, *args, **kwargs):
        # Update file size and name if file is provided
        if self.file:
            self.file_name = self.file.name
            self.file_size = self.file.size
        
        # Extract custom argument before passing to parent
        force_update_status = kwargs.pop('force_update_status', False)
        
        # Only update status if not already set or if this is a new document
        if not self.pk or force_update_status:
            self._update_status_without_save()
        
        super().save(*args, **kwargs)
    
    def _update_status_without_save(self):
        """Update document status based on expiry date without saving."""
        if not self.expiry_date:
            self.status = self.Status.VALID
            return
        
        today = timezone.now().date()
        days_until_expiry = (self.expiry_date - today).days
        
        if days_until_expiry < 0:
            self.status = self.Status.EXPIRED
        elif days_until_expiry <= self.reminder_days_before:
            self.status = self.Status.EXPIRING_SOON
        else:
            self.status = self.Status.VALID
    
    def update_status(self):
        """Update document status based on expiry date."""
        self._update_status_without_save()
        self.save(update_fields=['status'])
    
    def is_expired(self):
        """Check if document is expired."""
        if not self.expiry_date:
            return False
        return timezone.now().date() > self.expiry_date
    
    def is_expiring_soon(self):
        """Check if document is expiring soon."""
        if not self.expiry_date:
            return False
        days_until_expiry = (self.expiry_date - timezone.now().date()).days
        return 0 <= days_until_expiry <= self.reminder_days_before
    
    def days_until_expiry(self):
        """Get days until expiry."""
        if not self.expiry_date:
            return None
        return (self.expiry_date - timezone.now().date()).days
    
    def delete(self, *args, **kwargs):
        # Delete file from storage when document is deleted
        if self.file:
            if self.file.storage.exists(self.file.name):
                self.file.delete()
        super().delete(*args, **kwargs)


class DocumentRequirement(models.Model):
    """Define required documents for different entity types and roles."""
    
    class EntityType(models.TextChoices):
        USER = "user", "User"
        VEHICLE = "vehicle", "Vehicle"
        ORGANIZATION = "organization", "Organization"
    
    class UserRole(models.TextChoices):
        DRIVER = "driver", "Driver"
        DISPATCHER = "dispatcher", "Dispatcher"
        ADMIN = "admin", "Admin"
        CUSTOMER = "customer", "Customer"
        ALL = "all", "All Roles"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    entity_type = models.CharField(max_length=20, choices=EntityType.choices)
    user_role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.ALL)
    
    document_type = models.CharField(max_length=50, choices=Document.DocumentType.choices)
    
    is_required = models.BooleanField(default=True, help_text="Whether this document is mandatory")
    is_expirable = models.BooleanField(default=True, help_text="Whether this document has an expiry date")
    
    default_reminder_days = models.PositiveIntegerField(default=30, help_text="Default reminder days before expiry")
    
    description = models.TextField(blank=True, help_text="Description of why this document is required")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['entity_type', 'user_role', 'document_type']
        indexes = [
            models.Index(fields=['entity_type', 'user_role']),
            models.Index(fields=['document_type']),
        ]
        unique_together = ['entity_type', 'user_role', 'document_type']
    
    def __str__(self):
        return f"{self.get_document_type_display()} for {self.entity_type} ({self.user_role})"


class DocumentVerificationLog(models.Model):
    """Track document verification history."""
    
    class Action(models.TextChoices):
        UPLOADED = "uploaded", "Uploaded"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"
        UPDATED = "updated", "Updated"
        EXPIRED = "expired", "Expired"
        REMINDER_SENT = "reminder_sent", "Reminder Sent"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='verification_logs')
    
    action = models.CharField(max_length=20, choices=Action.choices)
    
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='document_verification_logs'
    )
    
    notes = models.TextField(blank=True)
    changes = models.JSONField(default=dict, blank=True, help_text="Record of changes made")
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['document', '-created_at']),
            models.Index(fields=['action', '-created_at']),
            models.Index(fields=['performed_by', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_action_display()} for {self.document} by {self.performed_by}"