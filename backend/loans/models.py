import calendar
import uuid
from django.db import models, transaction
from django.conf import settings
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import timedelta

from django.utils import timezone


def add_months(base_date, months):
    month_index = base_date.month - 1 + months
    year = base_date.year + month_index // 12
    month = month_index % 12 + 1
    last_day = calendar.monthrange(year, month)[1]
    day = min(base_date.day, last_day)
    return base_date.replace(year=year, month=month, day=day)


def get_user_by_email(email):
    if not email:
        return None
    user_model = get_user_model()
    return user_model.objects.filter(email__iexact=email).first()


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
    LOAN_TYPE_CHOICES = [
        ('personal', 'Personal Loan'),
        ('student', 'Student Loan'),
    ]

    borrower = models.ForeignKey(Borrower, on_delete=models.CASCADE, related_name='loans')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='loans_created'
    )
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
    loan_type = models.CharField(max_length=20, choices=LOAN_TYPE_CHOICES, default='personal')
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

    def refresh_status(self, save=True):
        remaining = self.remaining_balance
        today = timezone.localdate()

        if remaining == Decimal('0.00') and self.payments.exists():
            next_status = 'paid'
        elif self.maturity_date < today:
            next_status = 'overdue'
        else:
            next_status = 'active'

        self.status = next_status
        if save:
            Loan.objects.filter(pk=self.pk).update(status=next_status)
        return next_status

    def recalculate_payment_balances(self):
        running_balance = self.total_amount_due
        payments = list(self.payments.order_by('payment_date', 'created_at', 'pk'))

        for payment in payments:
            running_balance -= payment.amount_paid
            payment.remaining_balance = max(running_balance, Decimal('0.00'))

        if payments:
            Payment.objects.bulk_update(payments, ['remaining_balance'])

        self.recalculate_installments(payments=payments)

        self.refresh_status()

    def _schedule_months_count(self):
        months = (self.maturity_date.year - self.start_date.year) * 12 + (self.maturity_date.month - self.start_date.month)
        if self.maturity_date.day > self.start_date.day:
            months += 1
        return max(months, 1)

    def generate_installment_schedule(self):
        if self.installments.exists():
            return

        months = self._schedule_months_count()
        total_due = self.total_amount_due
        per_installment = (total_due / Decimal(str(months))).quantize(Decimal('0.01'))

        installments = []
        allocated = Decimal('0.00')
        for index in range(1, months + 1):
            if index == months:
                amount_due = total_due - allocated
            else:
                amount_due = per_installment
                allocated += per_installment

            installments.append(
                LoanInstallment(
                    loan=self,
                    installment_number=index,
                    due_date=add_months(self.start_date, index),
                    amount_due=max(amount_due, Decimal('0.00')),
                    amount_paid=Decimal('0.00'),
                    status='pending',
                )
            )

        LoanInstallment.objects.bulk_create(installments)

    def recalculate_installments(self, payments=None):
        installments = list(self.installments.order_by('installment_number', 'due_date', 'pk'))
        if not installments:
            return

        if payments is None:
            payments = list(self.payments.order_by('payment_date', 'created_at', 'pk'))

        payment_slots = []
        for payment in payments:
            payment_slots.append({
                'payment_date': payment.payment_date,
                'remaining': payment.amount_paid,
            })

        slot_index = 0
        for installment in installments:
            amount_due = installment.amount_due
            amount_covered = Decimal('0.00')
            paid_at = None

            while amount_covered < amount_due and slot_index < len(payment_slots):
                slot = payment_slots[slot_index]
                if slot['remaining'] <= Decimal('0.00'):
                    slot_index += 1
                    continue

                needed = amount_due - amount_covered
                applied = min(needed, slot['remaining'])
                amount_covered += applied
                slot['remaining'] -= applied

                if amount_covered >= amount_due:
                    paid_at = slot['payment_date']

                if slot['remaining'] <= Decimal('0.00'):
                    slot_index += 1

            installment.amount_paid = amount_covered
            if amount_covered >= amount_due and amount_due > Decimal('0.00'):
                installment.status = 'paid'
                installment.paid_at = paid_at
            else:
                installment.status = 'pending'
                installment.paid_at = None

        LoanInstallment.objects.bulk_update(installments, ['amount_paid', 'status', 'paid_at'])

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        if self.pk:
            self.refresh_status(save=False)
        super().save(*args, **kwargs)
        if is_new:
            self.generate_installment_schedule()


class LoanRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    LOAN_TYPE_CHOICES = Loan.LOAN_TYPE_CHOICES

    borrower = models.ForeignKey(Borrower, on_delete=models.CASCADE, related_name='loan_requests')
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='loan_requests_submitted'
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='loan_requests_reviewed'
    )
    approved_loan = models.ForeignKey(
        Loan, on_delete=models.SET_NULL, null=True, blank=True, related_name='source_requests'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    loan_type = models.CharField(max_length=20, choices=LOAN_TYPE_CHOICES, default='personal')
    purpose = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    decision_notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Loan Request #{self.pk} - {self.borrower.full_name}"

    def approve(self, reviewed_by, decision_notes=""):
        if self.status != 'pending':
            raise ValueError('Only pending requests can be approved.')

        today = timezone.localdate()
        notes_parts = [
            'Auto-created from approved borrower loan request.',
        ]
        if self.purpose:
            notes_parts.append(f"Purpose: {self.purpose}")
        if self.notes:
            notes_parts.append(f"Borrower message: {self.notes}")
        if decision_notes:
            notes_parts.append(f"Review note: {decision_notes}")

        with transaction.atomic():
            loan = Loan.objects.create(
                borrower=self.borrower,
                created_by=reviewed_by,
                principal_amount=self.amount,
                loan_type=self.loan_type,
                interest_rate=Decimal('5.00'),
                payment_term='monthly',
                start_date=today,
                maturity_date=today + timedelta(days=30),
                notes='\n'.join(notes_parts),
            )

            self.status = 'approved'
            self.reviewed_by = reviewed_by
            self.reviewed_at = timezone.now()
            self.decision_notes = decision_notes
            self.approved_loan = loan
            self.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'decision_notes', 'approved_loan', 'updated_at'])

        return loan

    def reject(self, reviewed_by, decision_notes=""):
        if self.status != 'pending':
            raise ValueError('Only pending requests can be rejected.')

        self.status = 'rejected'
        self.reviewed_by = reviewed_by
        self.reviewed_at = timezone.now()
        self.decision_notes = decision_notes
        self.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'decision_notes', 'updated_at'])


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
        other_payments_total = self.loan.payments.exclude(pk=self.pk).aggregate(
            total=models.Sum('amount_paid')
        )['total'] or Decimal('0.00')
        available_balance = max(self.loan.total_amount_due - other_payments_total, Decimal('0.00'))

        if self.amount_paid > available_balance:
            raise ValueError(
                f"Payment of ₱{self.amount_paid} exceeds remaining balance of ₱{available_balance}."
            )

        with transaction.atomic():
            super().save(*args, **kwargs)
            self.loan.recalculate_payment_balances()
            Invoice.create_payment_invoice(self)

    def delete(self, *args, **kwargs):
        loan = self.loan
        with transaction.atomic():
            Invoice.objects.filter(payment=self).delete()
            super().delete(*args, **kwargs)
            loan.recalculate_payment_balances()


class LoanInstallment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
    ]

    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name='installments')
    installment_number = models.PositiveIntegerField()
    due_date = models.DateField()
    amount_due = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid_at = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['due_date', 'installment_number']
        unique_together = ('loan', 'installment_number')

    def __str__(self):
        return f"Loan #{self.loan_id} installment #{self.installment_number}"


class Invoice(models.Model):
    TYPE_CHOICES = [
        ('application', 'Loan Application Invoice'),
        ('payment', 'Loan Payment Invoice'),
    ]

    invoice_number = models.CharField(max_length=50, unique=True)
    invoice_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    borrower = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='loan_invoices')
    loan = models.ForeignKey(Loan, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    loan_request = models.ForeignKey(LoanRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    payment = models.OneToOneField(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoice')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField(null=True, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-issued_at']

    def __str__(self):
        return self.invoice_number

    @staticmethod
    def _build_invoice_number(prefix):
        return f"{prefix}-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

    @classmethod
    def create_application_invoice(cls, loan_request):
        borrower_user = loan_request.requested_by
        if not borrower_user:
            return None

        existing = cls.objects.filter(invoice_type='application', loan_request=loan_request).first()
        if existing:
            return existing

        return cls.objects.create(
            invoice_number=cls._build_invoice_number('APP'),
            invoice_type='application',
            borrower=borrower_user,
            loan_request=loan_request,
            amount=loan_request.amount,
            due_date=None,
            notes='Invoice issued for submitted loan application.',
        )

    @classmethod
    def create_payment_invoice(cls, payment):
        borrower_user = get_user_by_email(payment.loan.borrower.email)

        if not borrower_user:
            return None

        if hasattr(payment, 'invoice') and payment.invoice:
            invoice = payment.invoice
            invoice.amount = payment.amount_paid
            invoice.loan = payment.loan
            invoice.due_date = payment.payment_date
            invoice.save(update_fields=['amount', 'loan', 'due_date'])
            return invoice

        return cls.objects.create(
            invoice_number=cls._build_invoice_number('PAY'),
            invoice_type='payment',
            borrower=borrower_user,
            loan=payment.loan,
            payment=payment,
            amount=payment.amount_paid,
            due_date=payment.payment_date,
            notes='Invoice issued for posted loan payment.',
        )