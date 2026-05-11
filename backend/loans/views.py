from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, Count, Q
from .models import Borrower, Loan, Payment
from .serializers import BorrowerSerializer, LoanSerializer, LoanListSerializer, PaymentSerializer


class BorrowerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BorrowerSerializer

    def get_queryset(self):
        return Borrower.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def loans(self, request, pk=None):
        borrower = self.get_object()
        loans = borrower.loans.all()
        serializer = LoanListSerializer(loans, many=True)
        return Response(serializer.data)


class LoanViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return LoanListSerializer
        return LoanSerializer

    def get_queryset(self):
        qs = Loan.objects.select_related('borrower').prefetch_related('payments')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        borrower_id = self.request.query_params.get('borrower')
        if borrower_id:
            qs = qs.filter(borrower_id=borrower_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        total_loans = Loan.objects.count()
        active_loans = Loan.objects.filter(status='active').count()
        paid_loans = Loan.objects.filter(status='paid').count()
        total_borrowers = Borrower.objects.count()
        total_disbursed = Loan.objects.aggregate(total=Sum('principal_amount'))['total'] or 0
        total_collected = Payment.objects.aggregate(total=Sum('amount_paid'))['total'] or 0
        return Response({
            'total_loans': total_loans,
            'active_loans': active_loans,
            'paid_loans': paid_loans,
            'total_borrowers': total_borrowers,
            'total_disbursed': total_disbursed,
            'total_collected': total_collected,
        })


class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        qs = Payment.objects.select_related('loan', 'recorded_by')
        loan_id = self.request.query_params.get('loan')
        if loan_id:
            qs = qs.filter(loan_id=loan_id)
        return qs

    def perform_create(self, serializer):
        try:
            serializer.save(recorded_by=self.request.user)
            # Update loan status
            loan = serializer.instance.loan
            loan.save()
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)