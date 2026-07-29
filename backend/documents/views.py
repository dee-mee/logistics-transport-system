from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, Count, Case, When, IntegerField
from django.core.files.uploadedfile import UploadedFile
import logging

from .models import Document, DocumentRequirement, DocumentVerificationLog
from .serializers import (
    DocumentSerializer, DocumentVerificationSerializer, 
    DocumentRequirementSerializer, DocumentVerificationLogSerializer,
    DocumentStatisticsSerializer, BulkDocumentUploadSerializer
)

logger = logging.getLogger(__name__)


class DocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for Document model with filtering and custom actions."""
    
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [AllowAny]  # Changed from IsAuthenticated to AllowAny for testing
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['entity_type', 'document_type', 'status', 'is_verified']
    search_fields = ['title', 'document_number', 'issuing_authority']
    ordering_fields = ['expiry_date', 'created_at', 'title']
    ordering = ['-expiry_date']
    
    def get_queryset(self):
        """Filter documents based on query parameters."""
        queryset = super().get_queryset()
        
        # Filter by entity_type and entity_id if provided
        entity_type = self.request.query_params.get('entity_type')
        entity_id = self.request.query_params.get('entity_id')
        
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        
        if entity_id:
            queryset = queryset.filter(entity_id=entity_id)
        
        # For now, return all documents for testing if no filters
        # In production, implement proper permission filtering
        return queryset
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def entities(self, request):
        """Get available entities for document management."""
        from accounts.models import User
        from fleet.models import Vehicle
        from organizations.models import Organization
        
        entity_type = request.query_params.get('entity_type')
        
        # For now, be permissive and show all data for testing
        # In production, you should check user permissions
        entities = []
        
        if entity_type == 'user' or not entity_type:
            # Get all users for now
            users = User.objects.all()
            
            entities.extend([
                {
                    'id': str(u.id),  # Convert User.id to string for UUID handling
                    'name': u.username,
                    'email': u.email,
                    'role': u.role,
                    'entity_type': 'user'
                }
                for u in users
            ])
        
        if entity_type == 'vehicle' or not entity_type:
            # Get all vehicles for now
            vehicles = Vehicle.objects.all()
            
            entities.extend([
                {
                    'id': str(v.id),  # Vehicle IDs are already UUIDs
                    'name': v.plate_number,
                    'make': v.make,
                    'model': v.model,
                    'entity_type': 'vehicle'
                }
                for v in vehicles
            ])
        
        if entity_type == 'organization' or not entity_type:
            # Get all organizations for now
            organizations = Organization.objects.all()
            
            entities.extend([
                {
                    'id': str(o.id),  # Organization IDs are already UUIDs
                    'name': o.name,
                    'industry': o.plan,  # Use plan instead of industry
                    'entity_type': 'organization'
                }
                for o in organizations
            ])
        
        return Response(entities)
    
    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """Group documents by status."""
        status_filter = request.query_params.get('status')
        
        if status_filter:
            documents = self.get_queryset().filter(status=status_filter)
        else:
            documents = self.get_queryset()
        
        serializer = self.get_serializer(documents, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get documents expiring soon."""
        documents = self.get_queryset().filter(
            status=Document.Status.EXPIRING_SOON
        )
        serializer = self.get_serializer(documents, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Get expired documents."""
        documents = self.get_queryset().filter(
            status=Document.Status.EXPIRED
        )
        serializer = self.get_serializer(documents, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending verification documents."""
        documents = self.get_queryset().filter(
            status=Document.Status.PENDING
        )
        serializer = self.get_serializer(documents, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def statistics(self, request):
        """Get document statistics."""
        queryset = self.get_queryset()
        
        # Count by status
        stats = queryset.aggregate(
            total_documents=Count('id'),
            valid_documents=Count('id', filter=Q(status=Document.Status.VALID)),
            expired_documents=Count('id', filter=Q(status=Document.Status.EXPIRED)),
            expiring_soon_documents=Count('id', filter=Q(status=Document.Status.EXPIRING_SOON)),
            pending_documents=Count('id', filter=Q(status=Document.Status.PENDING)),
            rejected_documents=Count('id', filter=Q(status=Document.Status.REJECTED)),
        )
        
        # Count by document type
        documents_by_type = queryset.values('document_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Count by entity type
        documents_by_entity = queryset.values('entity_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Format the response
        response_data = {
            'total_documents': stats['total_documents'],
            'valid_documents': stats['valid_documents'],
            'expired_documents': stats['expired_documents'],
            'expiring_soon_documents': stats['expiring_soon_documents'],
            'pending_documents': stats['pending_documents'],
            'rejected_documents': stats['rejected_documents'],
            'documents_by_type': {
                item['document_type']: item['count'] 
                for item in documents_by_type
            },
            'documents_by_entity': {
                item['entity_type']: item['count'] 
                for item in documents_by_entity
            }
        }
        
        serializer = DocumentStatisticsSerializer(response_data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def verify(self, request, pk=None):
        """Verify or reject a document."""
        document = self.get_object()
        serializer = DocumentVerificationSerializer(data=request.data)
        
        if serializer.is_valid():
            document.is_verified = serializer.validated_data['is_verified']
            document.verification_notes = serializer.validated_data.get('verification_notes', '')
            document.verified_by = request.user if request.user.is_authenticated else None
            document.verified_at = timezone.now()
            
            # Update status based on verification
            if document.is_verified:
                document.status = Document.Status.VALID
                action = DocumentVerificationLog.Action.VERIFIED
                notes = 'Document verified successfully'
            else:
                document.status = Document.Status.REJECTED
                action = DocumentVerificationLog.Action.REJECTED
                notes = f'Document rejected: {document.verification_notes}'
            
            document.save()
            
            # Create verification log
            DocumentVerificationLog.objects.create(
                document=document,
                action=action,
                performed_by=request.user if request.user.is_authenticated else None,
                notes=notes
            )
            
            return Response(DocumentSerializer(document).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def send_reminder(self, request, pk=None):
        """Send reminder for expiring document."""
        document = self.get_object()
        
        if not document.expiry_date:
            return Response(
                {'error': 'This document has no expiry date.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create reminder log
        DocumentVerificationLog.objects.create(
            document=document,
            action=DocumentVerificationLog.Action.REMINDER_SENT,
            performed_by=request.user,
            notes=f'Reminder sent for document expiring on {document.expiry_date}'
        )
        
        document.last_reminder_sent = timezone.now()
        document.save()
        
        # Here you would integrate with your notification system
        # For now, we'll just log it
        logger.info(f"Reminder sent for document {document.id} expiring on {document.expiry_date}")
        
        return Response({'message': 'Reminder sent successfully'})
    
    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        """Bulk upload documents for an entity."""
        serializer = BulkDocumentUploadSerializer(data=request.data)
        
        if serializer.is_valid():
            documents_data = serializer.validated_data['documents']
            created_documents = []
            
            for doc_data in documents_data:
                doc_serializer = DocumentSerializer(
                    data=doc_data,
                    context={'request': request}
                )
                if doc_serializer.is_valid():
                    document = doc_serializer.save()
                    created_documents.append(document)
                else:
                    return Response(
                        doc_serializer.errors,
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            return Response(
                DocumentSerializer(created_documents, many=True).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DocumentRequirementViewSet(viewsets.ModelViewSet):
    """ViewSet for DocumentRequirement model."""
    
    queryset = DocumentRequirement.objects.all()
    serializer_class = DocumentRequirementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['entity_type', 'user_role', 'is_required']
    search_fields = ['document_type', 'description']
    ordering_fields = ['entity_type', 'user_role', 'document_type']
    ordering = ['entity_type', 'user_role', 'document_type']
    
    @action(detail=False, methods=['get'])
    def by_role(self, request):
        """Get requirements for a specific role."""
        user_role = request.query_params.get('user_role')
        entity_type = request.query_params.get('entity_type')
        
        if user_role and entity_type:
            requirements = self.get_queryset().filter(
                user_role=user_role,
                entity_type=entity_type
            )
        elif user_role:
            requirements = self.get_queryset().filter(
                Q(user_role=user_role) | Q(user_role=DocumentRequirement.UserRole.ALL)
            )
        else:
            requirements = self.get_queryset()
        
        serializer = self.get_serializer(requirements, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def initialize_defaults(self, request):
        """Initialize default document requirements."""
        # Default requirements for drivers
        driver_requirements = [
            {'document_type': 'national_id', 'is_required': True, 'is_expirable': False},
            {'document_type': 'kra_pin', 'is_required': True, 'is_expirable': False},
            {'document_type': 'kra_certificate', 'is_required': True, 'is_expirable': True},
            {'document_type': 'driving_license', 'is_required': True, 'is_expirable': True},
            {'document_type': 'profile_photo', 'is_required': True, 'is_expirable': False},
            {'document_type': 'certificate_of_good_conduct', 'is_required': True, 'is_expirable': True},
            {'document_type': 'medical_certificate', 'is_required': True, 'is_expirable': True},
        ]
        
        # Default requirements for vehicles
        vehicle_requirements = [
            {'document_type': 'insurance', 'is_required': True, 'is_expirable': True},
            {'document_type': 'registration', 'is_required': True, 'is_expirable': True},
            {'document_type': 'number_plate', 'is_required': True, 'is_expirable': False},
            {'document_type': 'inspection_certificate', 'is_required': True, 'is_expirable': True},
            {'document_type': 'road_worthiness', 'is_required': True, 'is_expirable': True},
        ]
        
        created_count = 0
        
        # Create driver requirements
        for req in driver_requirements:
            DocumentRequirement.objects.get_or_create(
                entity_type='user',
                user_role='driver',
                document_type=req['document_type'],
                defaults={
                    'is_required': req['is_required'],
                    'is_expirable': req['is_expirable'],
                    'description': f'Required document for drivers: {req["document_type"]}'
                }
            )
            created_count += 1
        
        # Create vehicle requirements
        for req in vehicle_requirements:
            DocumentRequirement.objects.get_or_create(
                entity_type='vehicle',
                user_role='all',
                document_type=req['document_type'],
                defaults={
                    'is_required': req['is_required'],
                    'is_expirable': req['is_expirable'],
                    'description': f'Required document for vehicles: {req["document_type"]}'
                }
            )
            created_count += 1
        
        return Response({
            'message': f'Initialized {created_count} default document requirements'
        })


class DocumentVerificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for DocumentVerificationLog model (read-only)."""
    
    queryset = DocumentVerificationLog.objects.all()
    serializer_class = DocumentVerificationLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['document', 'action', 'performed_by']
    search_fields = ['notes']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter logs based on user permissions."""
        queryset = super().get_queryset()
        user = self.request.user
        
        # Non-admin users can only see logs for documents they can access
        if not user.is_superuser and not user.is_staff:
            accessible_documents = DocumentViewSet.as_view({'get': 'list'})(self.request).data
            accessible_doc_ids = [doc['id'] for doc in accessible_documents]
            queryset = queryset.filter(document_id__in=accessible_doc_ids)
        
        return queryset