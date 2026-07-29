from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView, MeView, ProfileView, UserViewSet,
    CustomPasswordResetConfirm, LockoutView
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename='user')

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("login/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("reset-password/", include('django_rest_passwordreset.urls')),
    path("reset-password/confirm/", CustomPasswordResetConfirm.as_view(), name="reset_password_confirm"),
    path("locked/", LockoutView.as_view(), name="locked"),
    path("", include(router.urls)),
]
