from django.contrib.auth import get_user_model, authenticate
from rest_framework import generics, permissions, status, throttling
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django_rest_passwordreset.views import ResetPasswordConfirm
from axes.decorators import axes_dispatch
from django.utils.decorators import method_decorator
from .serializers import UserSerializer, RegisterSerializer, CustomTokenObtainPairSerializer
from .services import AuditLogService
from permissions.permissions import HasModuleAccess
from permissions.models import PermissionGroup

User = get_user_model()


@method_decorator(axes_dispatch, name='post')
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.AnonRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Log user creation
        AuditLogService.log_user_create(user=None, target_user=user, request=request)
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": UserSerializer(user).data
            },
            status=status.HTTP_201_CREATED,
        )


@method_decorator(axes_dispatch, name='post')
class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.AnonRateThrottle]
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
            # Log successful login
            username = request.data.get('username')
            try:
                user = User.objects.get(username=username)
                AuditLogService.log_login(user, request, status='success')
            except User.DoesNotExist:
                pass
            return response
        except Exception as e:
            # Log failed login attempt
            username = request.data.get('username', 'unknown')
            try:
                user = User.objects.get(username=username)
                AuditLogService.log_login(user, request, status='failed', error_message=str(e))
            except User.DoesNotExist:
                # Log failed attempt with unknown user
                AuditLogService.log_login(None, request, status='failed', error_message='User not found')
            raise


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            # Log logout before token blacklisting
            AuditLogService.log_logout(request.user, request)
            
            # Blacklist the refresh token
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": "Error logging out."}, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        # Check if password is being changed
        if 'password' in request.data:
            # Log password change
            AuditLogService.log_password_change(request.user, request)
        
        return super().update(request, *args, **kwargs)


class CustomPasswordResetConfirm(ResetPasswordConfirm):
    """Custom password reset confirmation with better error handling."""
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # Log password reset
            # Note: We don't have the user object directly in this response
            # but we could extract it from the token if needed
            return Response({"detail": "Password has been reset successfully."})
        return response


class LockoutView(APIView):
    """Custom lockout view for django-axes."""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        return Response({
            "detail": "Account locked due to too many failed login attempts. Please try again later."
        }, status=status.HTTP_403_FORBIDDEN)


def lockout_response(request, credentials, *args, **kwargs):
    """Custom lockout response callable."""
    return Response({
        "detail": "Account locked due to too many failed login attempts. Please try again later."
    }, status=status.HTTP_403_FORBIDDEN)


class UserViewSet(viewsets.ModelViewSet):
    module = PermissionGroup.Module.SETTINGS
    permission_classes = [HasModuleAccess]
    serializer_class = UserSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return RegisterSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Log user creation
        AuditLogService.log_user_create(request.user, user, request)
        
        # Return user data instead of JWT tokens for admin creation
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )

    def get_queryset(self):
        # Superusers see all users, others see scoped results
        if self.request.user.is_superuser:
            return User.objects.all()
            
        # Only allow admins to see users, non-admins see only themselves
        try:
            from organizations.models import OrganizationUser
            org_user = OrganizationUser.objects.get(
                organization=self.request.user.current_organization,
                user=self.request.user
            )
            if self.request.user.is_staff or org_user.role == OrganizationUser.Role.ADMIN:
                # Scope to admin's current organization to prevent cross-tenant leak
                return User.objects.filter(
                    current_organization=self.request.user.current_organization
                )
        except OrganizationUser.DoesNotExist:
            pass
        
        return User.objects.filter(id=self.request.user.id)

    def perform_create(self, serializer):
        # This is handled in the create method above
        pass

    def perform_update(self, serializer):
        # Check if role is being changed
        if 'role' in serializer.validated_data:
            old_role = self.get_object().role
            new_role = serializer.validated_data['role']
            if old_role != new_role:
                AuditLogService.log_role_change(
                    self.request.user, 
                    self.get_object(), 
                    old_role, 
                    new_role, 
                    self.request
                )
        serializer.save()

    def perform_destroy(self, instance):
        username = instance.username
        AuditLogService.log_user_delete(self.request.user, username, self.request)
        instance.delete()
