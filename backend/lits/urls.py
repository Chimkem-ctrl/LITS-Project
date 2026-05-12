from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    

    # JWT endpoints (used by FastAPI to verify credentials)
    path('api/v1/auth/jwt/create/',  TokenObtainPairView.as_view(), name='jwt-create'),
    path('api/v1/auth/jwt/refresh/', TokenRefreshView.as_view(),    name='jwt-refresh'),

    # Djoser: registration, activation, password reset
    path('api/v1/auth/', include('djoser.urls')),

    # Loans app: borrowers, loans, payments
    path('api/v1/', include('loans.urls')),

    # Users app: /me/ endpoint
    path('api/v1/users/', include('users.urls')),
]