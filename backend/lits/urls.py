
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', lambda request: JsonResponse({'status': 'ok', 'message': 'LITS backend running'})),
    path('admin/', admin.site.urls),
    

    # JWT endpoints (used by FastAPI to verify credentials)
    path('api/v1/auth/jwt/create/',  TokenObtainPairView.as_view(), name='jwt-create'),
    path('api/v1/auth/jwt/refresh/', TokenRefreshView.as_view(),    name='jwt-refresh'),

    # Djoser: registration, activation, password reset
    path('api/v1/auth/', include('djoser.urls')),

    # Chatbot endpoint
    path('api/v1/chat/', include('chatbot.urls')),

    # Loans app: borrowers, loans, payments
    path('api/v1/', include('loans.urls')),

    # Users app: /me/ endpoint
    path('api/v1/users/', include('users.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)