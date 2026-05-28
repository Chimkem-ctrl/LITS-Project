from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdminReportViewSet,
    BorrowerDashboardViewSet,
    BorrowerInvoiceViewSet,
    BorrowerLoanRequestViewSet,
    BorrowerViewSet,
    LoanRequestViewSet,
    LoanViewSet,
    PaymentViewSet,
)

router = DefaultRouter()
router.register(r'borrowers', BorrowerViewSet, basename='borrower')
router.register(r'loans', LoanViewSet, basename='loan')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'loan-requests', LoanRequestViewSet, basename='loan-request')

urlpatterns = [
    path('', include(router.urls)),
    path('borrower/summary/', BorrowerDashboardViewSet.as_view({'get': 'summary'}), name='borrower-summary'),
    path('borrower/loans/', BorrowerDashboardViewSet.as_view({'get': 'loans'}), name='borrower-loans'),
    path('borrower/payments/', BorrowerDashboardViewSet.as_view({'get': 'payments'}), name='borrower-payments'),
    path('borrower/calendar/', BorrowerDashboardViewSet.as_view({'get': 'calendar'}), name='borrower-calendar'),
    path('borrower/loan-requests/', BorrowerLoanRequestViewSet.as_view({'get': 'list', 'post': 'create'}), name='borrower-loan-requests'),
    path('borrower/invoices/', BorrowerInvoiceViewSet.as_view({'get': 'list'}), name='borrower-invoices'),
    path('reports/summary/', AdminReportViewSet.as_view({'get': 'summary'}), name='report-summary'),
    path('reports/loan-status-chart/', AdminReportViewSet.as_view({'get': 'loan_status_chart'}), name='report-loan-status-chart'),
    path('reports/payments-trend/', AdminReportViewSet.as_view({'get': 'payments_trend'}), name='report-payments-trend'),
    path('reports/top-borrowers/', AdminReportViewSet.as_view({'get': 'top_borrowers'}), name='report-top-borrowers'),
    path('reports/export/', AdminReportViewSet.as_view({'get': 'export'}), name='report-export'),
]