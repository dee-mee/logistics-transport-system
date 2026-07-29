from django.contrib.auth import get_user_model, authenticate
from rest_framework import generics, permissions, status, throttling
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets
from .serializers import UserSerializer, RegisterSerializer
from permissions.permissions import HasModuleAccess
from permissions.models import PermissionGroup

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.AnonRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(username=username, password=password)
        if not user:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            # Delete the user's token
            request.user.auth_token.delete()
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        except:
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


class UserViewSet(viewsets.ModelViewSet):
    module = PermissionGroup.Module.SETTINGS
    permission_classes = [HasModuleAccess]
    serializer_class = UserSerializer

    def get_queryset(self):
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
