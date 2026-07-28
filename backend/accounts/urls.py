from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegisterView, LoginView, MeView, ProfileView, UserViewSet

router = DefaultRouter()
router.register(r"users", UserViewSet, basename='user')

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="me"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("", include(router.urls)),
]
