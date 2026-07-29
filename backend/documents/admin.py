from django.contrib import admin
from .models import Document, DocumentRequirement, DocumentVerificationLog


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'document_type', 'entity_type', 'entity_id', 'status', 'expiry_date', 'is_verified', 'created_at']
    list_filter = ['entity_type', 'document_type', 'status', 'is_verified', 'expiry_date']
    search_fields = ['title', 'document_number', 'issuing_authority']
    readonly_fields = ['file_name', 'file_size', 'created_at', 'updated_at']
    date_hierarchy = 'expiry_date'
    ordering = ['-expiry_date', '-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('entity_type', 'entity_id', 'document_type', 'title', 'description')
        }),
        ('Document Details', {
            'fields': ('document_number', 'issuing_authority', 'issue_date', 'expiry_date')
        }),
        ('File Information', {
            'fields': ('file', 'file_name', 'file_size', 'file_url')
        }),
        ('Verification', {
            'fields': ('is_verified', 'verified_by', 'verified_at', 'verification_notes')
        }),
        ('Notifications', {
            'fields': ('reminder_days_before', 'last_reminder_sent')
        }),
        ('Metadata', {
            'fields': ('tags', 'metadata', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(DocumentRequirement)
class DocumentRequirementAdmin(admin.ModelAdmin):
    list_display = ['entity_type', 'user_role', 'document_type', 'is_required', 'is_expirable', 'default_reminder_days']
    list_filter = ['entity_type', 'user_role', 'document_type', 'is_required', 'is_expirable']
    search_fields = ['document_type', 'description']
    ordering = ['entity_type', 'user_role', 'document_type']


@admin.register(DocumentVerificationLog)
class DocumentVerificationLogAdmin(admin.ModelAdmin):
    list_display = ['document', 'action', 'performed_by', 'created_at']
    list_filter = ['action', 'performed_by', 'created_at']
    search_fields = ['notes']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']