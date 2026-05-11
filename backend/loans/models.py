from django.db import models
from django.conf import settings
from decimal import Decimal


class Borrower(models.Model):
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='borrowers_created'
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    id_number = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class Loan(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paid', 'Fully Paid'),
        ('overdue', 'Overdue'),
    ]
    TERM_CHOICES = [
        ('weekly', 'Weekly'),
        ('biweekly', 'Bi-Weekly'),
        ('monthly', 'Monthly'),
    ]

    borrower = models.ForeignKey(Borrower, on_delete=models.CASCADE, related_name='loans')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='loans_created'
    )
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, help_text='Annual interest rate %')
    payment_term = models.CharField(max_length=20, choices=TERM_CHOICES, default='monthly')
    start_date = models.DateField()
    maturity_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Loan #{self.pk} - {self.borrower.full_name}"

    @property
    def total_interest(self):
        from datetime import date
        days = (self.maturity_date - self.start_date).days
        years = Decimal(str(days)) / Decimal('365')
        return (self.principal_amount * self.interest_rate / Decimal('100') * years).quantize(Decimal('0.01'))

    @property
    def total_amount_due(self):
        return self.principal_amount + self.total_interest

    @property
    def total_paid(self):
        return self.payments.aggregate(
            total=models.Sum('amount_paid')
        )['total'] or Decimal('0.00')

    @property
    def remaining_balance(self):
        balance = self.total_amount_due - self.total_paid
        return max(balance, Decimal('0.00'))

    def save(self, *args, **kwargs):
        if self.remaining_balance == Decimal('0.00') and self.payments.exists():
            self.status = 'paid'
        super().save(*args, **kwargs)


class Payment(models.Model):
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name='payments')
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='payments_recorded'
    )
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2, editable=False, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"Payment #{self.pk} for Loan #{self.loan.pk}"

    def save(self, *args, **kwargs):
        # Validate: prevent overpayment
        current_balance = self.loan.remaining_balance
        if not self.pk:  # new payment
            if self.amount_paid > current_balance:
                raise ValueError(
                    f"Payment of ₱{self.amount_paid} exceeds remaining balance of ₱{current_balance}."
                )
        # Compute remaining balance after this payment
        self.remaining_balance = current_balance - self.amount_paid
        super().save(*args, **kwargs)
        # Update loan status
        loan = self.loan
        if loan.remaining_balance == Decimal('0.00'):
            Loan.objects.filter(pk=loan.pk).update(status='paid')