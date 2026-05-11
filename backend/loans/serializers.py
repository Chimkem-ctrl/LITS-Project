from rest_framework import serializers
from .models import Borrower, Loan, Payment
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

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('recorded_by', 'remaining_balance', 'created_at')

    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            return obj.recorded_by.full_name
        return None

    def validate_amount_paid(self, value):
        if value <= Decimal('0'):
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value

    def validate(self, attrs):
        loan = attrs.get('loan')
        amount = attrs.get('amount_paid')
        if loan and amount:
            current_balance = loan.remaining_balance
            if amount > current_balance:
                raise serializers.ValidationError(
                    f"Payment of ₱{amount} exceeds remaining balance of ₱{current_balance:.2f}. Over-payment is not allowed."
                )
        return attrs


class LoanSerializer(serializers.ModelSerializer):
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

    def validate(self, attrs):
        if attrs.get('maturity_date') and attrs.get('start_date'):
            if attrs['maturity_date'] <= attrs['start_date']:
                raise serializers.ValidationError("Maturity date must be after start date.")
        return attrs


class LoanListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    borrower_name = serializers.SerializerMethodField()
    total_amount_due = serializers.ReadOnlyField()
    total_paid = serializers.ReadOnlyField()
    remaining_balance = serializers.ReadOnlyField()

    class Meta:
        model = Loan
        fields = ('id', 'borrower', 'borrower_name', 'principal_amount', 'interest_rate',
                  'payment_term', 'start_date', 'maturity_date', 'status',
                  'total_amount_due', 'total_paid', 'remaining_balance', 'created_at')

    def get_borrower_name(self, obj):
        return obj.borrower.full_name