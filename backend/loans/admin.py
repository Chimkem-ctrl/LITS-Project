from django.contrib import admin
from .models import Borrower, Loan, Payment


@admin.register(Borrower)
class BorrowerAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'email', 'phone', 'created_at')
    search_fields = ('first_name', 'last_name', 'email')


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ('borrower', 'principal_amount', 'status', 'start_date', 'maturity_date')
    list_filter = ('status', 'payment_term')
    search_fields = ('borrower__first_name', 'borrower__last_name')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('loan', 'amount_paid', 'payment_date', 'remaining_balance')
    list_filter = ('payment_date',)