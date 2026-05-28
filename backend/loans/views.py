from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsOfficerOrAdmin
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, Count, Q
from .models import Borrower, Loan, Payment
from .serializers import BorrowerSerializer, LoanSerializer, LoanListSerializer, PaymentSerializer


class BorrowerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]
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
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]

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

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def apply(self, request):
        """Endpoint for borrowers to submit loan applications. If a Borrower record
        matching the user's email does not exist, one will be created automatically.
        Officers and admins may still create loans through the standard create.
        """
        user = request.user
        data = request.data.copy()

        # Only allow borrowers (and staff) to use this simplified apply flow
        if getattr(user, 'role', None) not in {None, 'borrower', 'officer', 'admin'} and not user.is_staff:
            return Response({'detail': 'Not allowed to apply for loans.'}, status=403)

        # Ensure borrower record exists for this user by email
        borrower_email = data.get('borrower_email') or getattr(user, 'email', None)
        borrower = None
        if borrower_email:
            borrower_qs = Borrower.objects.filter(email=borrower_email)
            if borrower_qs.exists():
                borrower = borrower_qs.first()
            else:
                borrower = Borrower.objects.create(
                    created_by=user if getattr(user, 'role', None) in {'officer', 'admin'} else None,
                    first_name=data.get('first_name') or getattr(user, 'first_name', ''),
                    last_name=data.get('last_name') or getattr(user, 'last_name', ''),
                    email=borrower_email,
                    phone=data.get('phone', ''),
                    address=data.get('address', ''),
                )
        else:
            return Response({'detail': 'Borrower email is required.'}, status=400)

        # Build loan payload
        loan_payload = {
            'borrower': borrower.id,
            'principal_amount': data.get('principal_amount'),
            'interest_rate': data.get('interest_rate', 0),
            'payment_term': data.get('payment_term', 'monthly'),
            'start_date': data.get('start_date'),
            'maturity_date': data.get('maturity_date'),
            'notes': data.get('notes', f"Applied via mobile/web by {user.email}"),
        }

        serializer = self.get_serializer(data=loan_payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=201)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def dashboard_stats(self, request):
        # Allow any authenticated user to access this endpoint, but scope the
        # returned data based on the user's role.
        user = request.user

        if getattr(user, "role", None) in {"admin", "officer"}:
            total_loans = Loan.objects.count()
            active_loans = Loan.objects.filter(status='active').count()
            paid_loans = Loan.objects.filter(status='paid').count()
            total_borrowers = Borrower.objects.count()
            total_disbursed = Loan.objects.aggregate(total=Sum('principal_amount'))['total'] or 0
            total_collected = Payment.objects.aggregate(total=Sum('amount_paid'))['total'] or 0
            scope = "all"
        else:
            # For borrowers, return only stats for loans associated with
            # borrower records that match the user's email.
            borrowers = Borrower.objects.filter(email=user.email)
            loans = Loan.objects.filter(borrower__in=borrowers)
            total_loans = loans.count()
            active_loans = loans.filter(status='active').count()
            paid_loans = loans.filter(status='paid').count()
            total_borrowers = borrowers.count()
            total_disbursed = loans.aggregate(total=Sum('principal_amount'))['total'] or 0
            total_collected = Payment.objects.filter(loan__in=loans).aggregate(total=Sum('amount_paid'))['total'] or 0
            scope = "self"

        return Response({
            'total_loans': total_loans,
            'active_loans': active_loans,
            'paid_loans': paid_loans,
            'total_borrowers': total_borrowers,
            'total_disbursed': total_disbursed,
            'total_collected': total_collected,
            'scope': scope,
        })


class PaymentViewSet(viewsets.ModelViewSet):
    # Allow any authenticated user to list/pay, but enforce ownership for borrowers
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        qs = Payment.objects.select_related('loan', 'recorded_by')
        loan_id = self.request.query_params.get('loan')
        if loan_id:
            qs = qs.filter(loan_id=loan_id)
        return qs

    def perform_create(self, serializer):
        # Ownership and overpayment checks are handled in serializer and model.
        loan = serializer.validated_data.get('loan')
        user = self.request.user

        # If user is borrower, ensure loan belongs to one of their borrower records
        if getattr(user, 'role', None) == 'borrower':
            borrowers = Borrower.objects.filter(email=user.email)
            if not borrowers.exists() or loan.borrower not in borrowers:
                raise ValueError('You may only record payments for your own loans.')

        try:
            serializer.save(recorded_by=self.request.user)
            # Update loan status
            loan = serializer.instance.loan
            loan.save()
        except ValueError as e:
            raise

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)