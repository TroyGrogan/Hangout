from django.http import HttpResponse
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from apps.events.views import EventViewSet, EventAttendeeViewSet
from apps.users.views import UserViewSet, RegisterView, debug_credentials
from apps.users.views import ChangePasswordView

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'events', EventViewSet, basename='event')
router.register(r'users', UserViewSet, basename='user')  # Single registration
router.register(r'event-attendees', EventAttendeeViewSet, basename='event-attendee')

# Root view
def home_view(request):
    return HttpResponse("Welcome to StandInOnBusiness API!")

# Combine router URLs with other URL patterns
urlpatterns = [
    path('', home_view, name='home'),
    path('admin/', admin.site.urls),
    # JWT endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Registration endpoint
    path('api/users/register/', RegisterView.as_view(), name='register'),
    path('api/users/change-password/', ChangePasswordView.as_view(), name='change-password'),
    # Main App Routers
    path('api/', include(router.urls)), # Includes events, users, event-attendees
    # Debugging URL
    path('api/debug-credentials/', debug_credentials, name='debug-credentials'),
    # AI Chat URLs
    path('api/ai/', include('apps.ai_chat.urls')),
]
