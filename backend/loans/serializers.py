from rest_framework import serializers
from django.db.models import Sum
from .models import Borrower, Loan, LoanRequest, Payment, LoanInstallment, Invoice
from decimal import Decimal


class BorrowerSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    active_loans_count = serializers.SerializerMethodField()

    class Meta:
        model = Borrower
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')

    def get_active_loans_count(self, obj):
        return obj.loans.filter(status='active').count()


class PaymentSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('recorded_by', 'remaining_balance', 'created_at')

    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            return obj.recorded_by.full_name
        return None

    def get_invoice_number(self, obj):
        if hasattr(obj, 'invoice') and obj.invoice:
            return obj.invoice.invoice_number
        return None

    def validate_amount_paid(self, value):
        if value <= Decimal('0'):
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value

    def validate(self, attrs):
        loan = attrs.get('loan', getattr(self.instance, 'loan', None))
        amount = attrs.get('amount_paid', getattr(self.instance, 'amount_paid', None))
        if loan and amount:
            other_payments_total = loan.payments.exclude(
                pk=getattr(self.instance, 'pk', None)
            ).aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')
            available_balance = max(loan.total_amount_due - other_payments_total, Decimal('0.00'))
            if amount > available_balance:
                raise serializers.ValidationError(
                    f"Payment of ₱{amount} exceeds remaining balance of ₱{available_balance:.2f}. Over-payment is not allowed."
                )
        return attrs


class LoanSerializer(serializers.ModelSerializer):
    installments = serializers.SerializerMethodField()
    borrower_name = serializers.SerializerMethodField()
    total_interest = serializers.ReadOnlyField()
    total_amount_due = serializers.ReadOnlyField()
    total_paid = serializers.ReadOnlyField()
    remaining_balance = serializers.ReadOnlyField()
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Loan
        fields = '__all__'
        read_only_fields = ('created_by', 'status', 'created_at', 'updated_at')

    def get_borrower_name(self, obj):
        return obj.borrower.full_name

    def get_installments(self, obj):
        installments = obj.installments.all().order_by('installment_number', 'due_date')
        return LoanInstallmentSerializer(installments, many=True).data

    def validate(self, attrs):
        if attrs.get('maturity_date') and attrs.get('start_date'):
            if attrs['maturity_date'] <= attrs['start_date']:
                raise serializers.ValidationError("Maturity date must be after start date.")
        return attrs


class LoanListSerializer(serializers.ModelSerializer):
    loan_type_display = serializers.CharField(source='get_loan_type_display', read_only=True)
    installments = serializers.SerializerMethodField()
    """Lightweight serializer for list views"""
    borrower_name = serializers.SerializerMethodField()
    total_amount_due = serializers.ReadOnlyField()
    total_paid = serializers.ReadOnlyField()
    remaining_balance = serializers.ReadOnlyField()

    class Meta:
        model = Loan
        fields = ('id', 'borrower', 'borrower_name', 'principal_amount', 'interest_rate',
                  'loan_type', 'loan_type_display', 'payment_term', 'start_date', 'maturity_date', 'status', 'notes',
                  'total_amount_due', 'total_paid', 'remaining_balance', 'installments', 'created_at')

    def get_borrower_name(self, obj):
        return obj.borrower.full_name

    def get_installments(self, obj):
        installments = obj.installments.all().order_by('installment_number', 'due_date')
        return LoanInstallmentSerializer(installments, many=True).data


class LoanRequestSerializer(serializers.ModelSerializer):
    loan_type_display = serializers.CharField(source='get_loan_type_display', read_only=True)
    borrower_name = serializers.SerializerMethodField()
    requested_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    approved_loan_id = serializers.IntegerField(source='approved_loan.id', read_only=True)

    class Meta:
        model = LoanRequest
        fields = '__all__'
        read_only_fields = (
            'borrower', 'requested_by', 'reviewed_by', 'approved_loan', 'status',
            'reviewed_at', 'created_at', 'updated_at'
        )

    def get_borrower_name(self, obj):
        return obj.borrower.full_name

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.full_name
        return None

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.full_name
        return None

    def validate_amount(self, value):
        if value <= Decimal('0'):
            raise serializers.ValidationError('Requested amount must be greater than zero.')
        return value


class BorrowerLoanRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanRequest
        fields = ('amount', 'loan_type', 'purpose', 'notes')

    def validate_amount(self, value):
        if value <= Decimal('0'):
            raise serializers.ValidationError('Requested amount must be greater than zero.')
        return value


class LoanInstallmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanInstallment
        fields = (
            'id',
            'installment_number',
            'due_date',
            'amount_due',
            'amount_paid',
            'status',
            'paid_at',
        )


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = (
            'id',
            'invoice_number',
            'invoice_type',
            'loan',
            'loan_request',
            'payment',
            'amount',
            'due_date',
            'issued_at',
            'notes',
        )