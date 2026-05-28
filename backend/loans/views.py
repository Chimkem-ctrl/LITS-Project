import csv
from datetime import timedelta
from decimal import Decimal

from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, Count, Q, Avg
from .models import Borrower, Loan, LoanRequest, Payment, Invoice, LoanInstallment
from .serializers import (
    BorrowerLoanRequestCreateSerializer,
    BorrowerSerializer,
    InvoiceSerializer,
    LoanInstallmentSerializer,
    LoanRequestSerializer,
    LoanSerializer,
    LoanListSerializer,
    PaymentSerializer,
)
from .permissions import IsAdminOrOfficer, IsBorrower


def compute_total_remaining(loans_queryset):
    return sum((loan.remaining_balance for loan in loans_queryset), Decimal('0.00'))


def get_or_create_borrower_for_user(user):
    borrower = Borrower.objects.filter(email=user.email).first()
    if borrower:
        return borrower

    return Borrower.objects.create(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
    )


class BorrowerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminOrOfficer]
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
    permission_classes = [IsAuthenticated, IsAdminOrOfficer]

    def get_serializer_class(self):
        if self.action == 'list':
            return LoanListSerializer
        return LoanSerializer

    def get_queryset(self):
        qs = Loan.objects.select_related('borrower').prefetch_related('payments', 'installments')
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
        total_remaining = compute_total_remaining(Loan.objects.prefetch_related('payments'))
        return Response({
            'total_loans': total_loans,
            'active_loans': active_loans,
            'paid_loans': paid_loans,
            'total_borrowers': total_borrowers,
            'total_disbursed': total_disbursed,
            'total_collected': total_collected,
            'total_remaining_balances': total_remaining,
        })


class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminOrOfficer]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        qs = Payment.objects.select_related('loan', 'recorded_by')
        loan_id = self.request.query_params.get('loan')
        if loan_id:
            qs = qs.filter(loan_id=loan_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)
        # Update loan status
        loan = serializer.instance.loan
        loan.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class LoanRequestViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminOrOfficer]
    serializer_class = LoanRequestSerializer

    def get_queryset(self):
        queryset = LoanRequest.objects.select_related('borrower', 'requested_by', 'reviewed_by', 'approved_loan')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        loan_request = self.get_object()
        decision_notes = request.data.get('decision_notes', '')

        try:
            loan_request.approve(reviewed_by=request.user, decision_notes=decision_notes)
        except ValueError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(loan_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        loan_request = self.get_object()
        decision_notes = request.data.get('decision_notes', '')

        try:
            loan_request.reject(reviewed_by=request.user, decision_notes=decision_notes)
        except ValueError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(loan_request)
        return Response(serializer.data)


class BorrowerLoanRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsBorrower]
    http_method_names = ['get', 'post']

    def get_queryset(self):
        return LoanRequest.objects.filter(
            requested_by=self.request.user
        ).select_related('borrower', 'requested_by', 'reviewed_by', 'approved_loan')

    def get_serializer_class(self):
        if self.action == 'create':
            return BorrowerLoanRequestCreateSerializer
        return LoanRequestSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        borrower = get_or_create_borrower_for_user(request.user)
        loan_request = LoanRequest.objects.create(
            borrower=borrower,
            requested_by=request.user,
            amount=serializer.validated_data['amount'],
            loan_type=serializer.validated_data.get('loan_type', 'personal'),
            purpose=serializer.validated_data.get('purpose', ''),
            notes=serializer.validated_data.get('notes', ''),
        )
        application_invoice = Invoice.create_application_invoice(loan_request)
        response_serializer = LoanRequestSerializer(loan_request)
        payload = response_serializer.data
        payload['invoice'] = InvoiceSerializer(application_invoice).data if application_invoice else None
        return Response(payload, status=status.HTTP_201_CREATED)


class BorrowerDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsBorrower]

    def _get_borrower_loans(self, request):
        return Loan.objects.filter(borrower__email=request.user.email).prefetch_related('payments', 'installments').select_related('borrower')

    def _ensure_loan_installments(self, loans):
        for loan in loans:
            if not loan.installments.exists():
                loan.generate_installment_schedule()
            loan.recalculate_installments()

    @action(detail=False, methods=['get'])
    def summary(self, request):
        loans = list(self._get_borrower_loans(request))
        self._ensure_loan_installments(loans)
        total_loans = len(loans)
        active_loans = sum(1 for loan in loans if loan.status == 'active')
        total_due = sum((loan.total_amount_due for loan in loans), 0)
        total_paid = sum((loan.total_paid for loan in loans), 0)
        next_deadline = LoanInstallment.objects.filter(
            loan__borrower__email=request.user.email,
            status='pending',
        ).order_by('due_date').first()

        return Response({
            'total_loans': total_loans,
            'active_loans': active_loans,
            'total_due': total_due,
            'total_paid': total_paid,
            'total_remaining': max(total_due - total_paid, 0),
            'next_due_date': next_deadline.due_date if next_deadline else None,
        })

    @action(detail=False, methods=['get'])
    def loans(self, request):
        loans = list(self._get_borrower_loans(request))
        self._ensure_loan_installments(loans)
        serializer = LoanListSerializer(loans, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def payments(self, request):
        payments = Payment.objects.filter(loan__borrower__email=request.user.email).select_related('loan', 'recorded_by')
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        loans = list(self._get_borrower_loans(request))
        self._ensure_loan_installments(loans)

        installments = LoanInstallment.objects.filter(
            loan__borrower__email=request.user.email
        ).select_related('loan', 'loan__borrower').order_by('due_date', 'installment_number')
        serializer = LoanInstallmentSerializer(installments, many=True)

        events = []
        for installment, item in zip(installments, serializer.data):
            events.append({
                'id': installment.id,
                'loan_id': installment.loan_id,
                'loan_type': installment.loan.get_loan_type_display(),
                'borrower_name': installment.loan.borrower.full_name,
                'title': f"Installment #{installment.installment_number}",
                'due_date': item['due_date'],
                'amount_due': item['amount_due'],
                'amount_paid': item['amount_paid'],
                'status': item['status'],
                'paid_at': item['paid_at'],
            })

        return Response(events)


class BorrowerInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsBorrower]
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        return Invoice.objects.filter(borrower=self.request.user).select_related('loan', 'loan_request', 'payment')


class AdminReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAdminOrOfficer]

    @action(detail=False, methods=['get'])
    def summary(self, request):
        total_loans = Loan.objects.count()
        active_loans = Loan.objects.filter(status='active').count()
        overdue_loans = Loan.objects.filter(status='overdue').count()
        total_borrowers = Borrower.objects.count()
        total_disbursed = Loan.objects.aggregate(total=Sum('principal_amount'))['total'] or 0
        total_collected = Payment.objects.aggregate(total=Sum('amount_paid'))['total'] or 0
        total_remaining = compute_total_remaining(Loan.objects.prefetch_related('payments'))

        return Response({
            'total_loans': total_loans,
            'active_loans': active_loans,
            'overdue_loans': overdue_loans,
            'total_borrowers': total_borrowers,
            'total_disbursed': total_disbursed,
            'total_collected': total_collected,
            'total_remaining': total_remaining,
            'average_payment': Payment.objects.aggregate(avg=Avg('amount_paid'))['avg'] or 0,
        })

    @action(detail=False, methods=['get'])
    def loan_status_chart(self, request):
        data = Loan.objects.values('status').annotate(value=Count('id')).order_by('status')
        return Response(list(data))

    @action(detail=False, methods=['get'])
    def payments_trend(self, request):
        start_date = timezone.localdate() - timedelta(days=365)
        trend = (
            Payment.objects.filter(payment_date__gte=start_date)
            .annotate(month=TruncMonth('payment_date'))
            .values('month')
            .annotate(total=Sum('amount_paid'), count=Count('id'))
            .order_by('month')
        )
        return Response([
            {
                'month': item['month'].strftime('%Y-%m'),
                'total': item['total'],
                'count': item['count'],
            }
            for item in trend
        ])

    @action(detail=False, methods=['get'])
    def top_borrowers(self, request):
        borrowers = Borrower.objects.annotate(
            total_principal=Sum('loans__principal_amount'),
            total_collected=Sum('loans__payments__amount_paid'),
            active_loans=Count('loans', filter=Q(loans__status='active'), distinct=True),
        ).order_by('-total_principal')[:5]

        payload = []
        for borrower in borrowers:
            total_principal = borrower.total_principal or 0
            total_collected = borrower.total_collected or 0
            payload.append({
                'id': borrower.id,
                'name': borrower.full_name,
                'active_loans': borrower.active_loans,
                'total_principal': total_principal,
                'total_collected': total_collected,
                'remaining_balance': max(total_principal - total_collected, 0),
            })

        return Response(payload)

    @action(detail=False, methods=['get'])
    def export(self, request):
        dataset = request.query_params.get('dataset', 'loans')
        exporters = {
            'borrowers': export_borrowers_csv,
            'loans': export_loans_csv,
            'payments': export_payments_csv,
        }

        if dataset not in exporters:
            return Response({'detail': 'Unsupported dataset.'}, status=status.HTTP_400_BAD_REQUEST)

        return exporters[dataset]()


def export_borrowers_csv():
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="borrowers-report.csv"'
    writer = csv.writer(response)
    writer.writerow(['Borrower', 'Email', 'Phone', 'Government ID', 'Created At'])

    for borrower in Borrower.objects.all().order_by('last_name', 'first_name'):
        writer.writerow([
            borrower.full_name,
            borrower.email,
            borrower.phone,
            borrower.id_number,
            borrower.created_at.strftime('%Y-%m-%d %H:%M'),
        ])

    return response


def export_loans_csv():
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="loans-report.csv"'
    writer = csv.writer(response)
    writer.writerow([
        'Borrower', 'Principal Amount', 'Interest Rate', 'Payment Term',
        'Start Date', 'Maturity Date', 'Status', 'Total Due', 'Total Paid', 'Remaining Balance'
    ])

    for loan in Loan.objects.select_related('borrower').prefetch_related('payments'):
        writer.writerow([
            loan.borrower.full_name,
            loan.principal_amount,
            loan.interest_rate,
            loan.payment_term,
            loan.start_date,
            loan.maturity_date,
            loan.status,
            loan.total_amount_due,
            loan.total_paid,
            loan.remaining_balance,
        ])

    return response


def export_payments_csv():
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="payments-report.csv"'
    writer = csv.writer(response)
    writer.writerow([
        'Payment Date', 'Borrower', 'Loan ID', 'Amount Paid', 'Remaining Balance', 'Recorded By'
    ])

    payments = Payment.objects.select_related('loan__borrower', 'recorded_by').order_by('-payment_date', '-created_at')
    for payment in payments:
        writer.writerow([
            payment.payment_date,
            payment.loan.borrower.full_name,
            payment.loan_id,
            payment.amount_paid,
            payment.remaining_balance,
            payment.recorded_by.full_name if payment.recorded_by else '',
        ])

    return response