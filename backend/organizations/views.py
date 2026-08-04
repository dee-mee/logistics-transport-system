from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.db.models import Q
from .models import Organization, OrganizationUser, OrganizationSettings, Invitation
from .serializers import (
    OrganizationSerializer, OrganizationCreateSerializer, OrganizationUserSerializer,
    OrganizationSettingsSerializer, InvitationSerializer, InvitationCreateSerializer
)
from permissions.permissions import HasModuleAccess
from permissions.models import PermissionGroup


class OrganizationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing organizations."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see organizations they belong to
        try:
            org_ids = OrganizationUser.objects.filter(
                user=self.request.user
            ).values_list('organization_id', flat=True)
            return Organization.objects.filter(id__in=org_ids)
        except Exception as e:
            # If user has no organizations, return empty queryset
            return Organization.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return OrganizationCreateSerializer
        return OrganizationSerializer
    
    def perform_create(self, serializer):
        try:
            organization = serializer.save()
            # Automatically create the creator as an owner
            OrganizationUser.objects.create(
                organization=organization,
                user=self.request.user,
                role=OrganizationUser.Role.OWNER
            )
            # Set the user's current organization
            self.request.user.current_organization = organization
            self.request.user.save()
            # Create default organization settings
            OrganizationSettings.objects.create(organization=organization)
        except Exception as e:
            # If something goes wrong, delete the organization to avoid orphaned records
            if 'organization' in locals():
                organization.delete()
            raise
    
    @action(detail=True, methods=['get'])
    def get_settings(self, request, pk=None):
        """Get organization settings."""
        organization = self.get_object()
        # Check if user belongs to this organization
        if not OrganizationUser.objects.filter(
            organization=organization,
            user=request.user
        ).exists():
            return Response({'error': 'You do not have access to this organization'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            org_settings = organization.org_settings
        except OrganizationSettings.DoesNotExist:
            org_settings = OrganizationSettings.objects.create(organization=organization)
        
        serializer = OrganizationSettingsSerializer(org_settings)
        return Response(serializer.data)
    
    @action(detail=True, methods=['put', 'patch'])
    def update_settings(self, request, pk=None):
        """Update organization settings."""
        organization = self.get_object()
        # Check if user is owner or admin
        try:
            org_user = OrganizationUser.objects.get(
                organization=organization,
                user=request.user
            )
            if org_user.role not in [OrganizationUser.Role.OWNER, OrganizationUser.Role.ADMIN]:
                return Response({'error': 'You do not have permission to update settings'}, status=status.HTTP_403_FORBIDDEN)
        except OrganizationUser.DoesNotExist:
            return Response({'error': 'You do not have access to this organization'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            org_settings = organization.org_settings
        except OrganizationSettings.DoesNotExist:
            org_settings = OrganizationSettings.objects.create(organization=organization)
        
        serializer = OrganizationSettingsSerializer(org_settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get organization members."""
        organization = self.get_object()
        # Check if user belongs to this organization
        if not OrganizationUser.objects.filter(
            organization=organization,
            user=request.user
        ).exists():
            return Response({'error': 'You do not have access to this organization'}, status=status.HTTP_403_FORBIDDEN)
        
        members = organization.members.select_related('user').all()
        serializer = OrganizationUserSerializer(members, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """Invite a user to the organization."""
        organization = self.get_object()
        # Check if user is owner or admin
        try:
            org_user = OrganizationUser.objects.get(
                organization=organization,
                user=request.user
            )
            if org_user.role not in [OrganizationUser.Role.OWNER, OrganizationUser.Role.ADMIN]:
                return Response({'error': 'You do not have permission to invite users'}, status=status.HTTP_403_FORBIDDEN)
        except OrganizationUser.DoesNotExist:
            return Response({'error': 'You do not have access to this organization'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = InvitationCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            # Check if user is already a member
            if OrganizationUser.objects.filter(
                organization=organization, 
                user__email=serializer.validated_data['email']
            ).exists():
                return Response(
                    {'error': 'User is already a member of this organization'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            invitation = Invitation.objects.create(
                organization=organization,
                invited_by=request.user,
                **serializer.validated_data
            )
            response_serializer = InvitationSerializer(invitation)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OrganizationUserViewSet(viewsets.ModelViewSet):
    """ViewSet for managing organization memberships."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrganizationUserSerializer
    
    def get_queryset(self):
        # Users can only see organization memberships for their own organizations
        try:
            org_ids = OrganizationUser.objects.filter(
                user=self.request.user
            ).values_list('organization_id', flat=True)
            return OrganizationUser.objects.filter(
                organization_id__in=org_ids
            ).select_related('user', 'organization')
        except Exception as e:
            return OrganizationUser.objects.none()
    
    @action(detail=False, methods=['get'])
    def my_organizations(self, request):
        """Get organizations the current user belongs to."""
        memberships = OrganizationUser.objects.filter(
            user=request.user
        ).select_related('organization')
        serializer = self.get_serializer(memberships, many=True)
        return Response(serializer.data)


class InvitationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing invitations."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InvitationSerializer
    
    def get_queryset(self):
        # Users can only see invitations for their own organizations
        try:
            org_ids = OrganizationUser.objects.filter(
                user=self.request.user
            ).values_list('organization_id', flat=True)
            return Invitation.objects.filter(organization_id__in=org_ids)
        except Exception as e:
            return Invitation.objects.none()
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept an invitation."""
        invitation = self.get_object()
        
        if invitation.email != request.user.email:
            return Response(
                {'error': 'This invitation is not for you'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if invitation.status != Invitation.Status.PENDING:
            return Response(
                {'error': 'This invitation has already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if invitation.expires_at < timezone.now():
            invitation.status = Invitation.Status.EXPIRED
            invitation.save()
            return Response(
                {'error': 'This invitation has expired'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create organization membership
        OrganizationUser.objects.create(
            organization=invitation.organization,
            user=request.user,
            role=invitation.role
        )
        
        # Set the user's current organization to the invited organization
        request.user.current_organization = invitation.organization
        request.user.save()
        
        invitation.status = Invitation.Status.ACCEPTED
        invitation.accepted_at = timezone.now()
        invitation.save()
        
        return Response({'message': 'Invitation accepted successfully'})
    
    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Decline an invitation."""
        invitation = self.get_object()
        
        if invitation.email != request.user.email:
            return Response(
                {'error': 'This invitation is not for you'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if invitation.status != Invitation.Status.PENDING:
            return Response(
                {'error': 'This invitation has already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invitation.status = Invitation.Status.DECLINED
        invitation.save()
        
        return Response({'message': 'Invitation declined'})