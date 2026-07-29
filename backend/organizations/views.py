from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
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
    module = PermissionGroup.Module.SETTINGS
    permission_classes = [HasModuleAccess]
    
    def get_queryset(self):
        # Users can only see organizations they belong to
        return Organization.objects.filter(members__user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return OrganizationCreateSerializer
        return OrganizationSerializer
    
    def perform_create(self, serializer):
        organization = serializer.save()
        # Automatically create the creator as an owner
        OrganizationUser.objects.create(
            organization=organization,
            user=self.request.user,
            role=OrganizationUser.Role.OWNER
        )
        # Create default settings
        OrganizationSettings.objects.create(organization=organization)
    
    @action(detail=True, methods=['get'])
    def settings(self, request, pk=None):
        """Get organization settings."""
        organization = self.get_object()
        try:
            settings = organization.settings
        except OrganizationSettings.DoesNotExist:
            settings = OrganizationSettings.objects.create(organization=organization)
        
        serializer = OrganizationSettingsSerializer(settings)
        return Response(serializer.data)
    
    @action(detail=True, methods=['put', 'patch'])
    def update_settings(self, request, pk=None):
        """Update organization settings."""
        organization = self.get_object()
        try:
            settings = organization.settings
        except OrganizationSettings.DoesNotExist:
            settings = OrganizationSettings.objects.create(organization=organization)
        
        serializer = OrganizationSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get organization members."""
        organization = self.get_object()
        members = organization.members.select_related('user').all()
        serializer = OrganizationUserSerializer(members, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """Invite a user to the organization."""
        organization = self.get_object()
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
    module = PermissionGroup.Module.SETTINGS
    permission_classes = [HasModuleAccess]
    serializer_class = OrganizationUserSerializer
    
    def get_queryset(self):
        return OrganizationUser.objects.filter(
            organization__members__user=self.request.user
        ).select_related('user', 'organization')
    
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
    module = PermissionGroup.Module.SETTINGS
    permission_classes = [HasModuleAccess]
    serializer_class = InvitationSerializer
    
    def get_queryset(self):
        # Users can see invitations sent to them or sent by them
        return Invitation.objects.filter(
            Q(email=self.request.user.email) | Q(invited_by=self.request.user)
        ).select_related('organization', 'invited_by')
    
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