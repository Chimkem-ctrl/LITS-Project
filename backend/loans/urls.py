from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BorrowerViewSet, LoanViewSet, PaymentViewSet

router = DefaultRouter()
router.register(r'borrowers', BorrowerViewSet, basename='borrower')
router.register(r'loans', LoanViewSet, basename='loan')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
]