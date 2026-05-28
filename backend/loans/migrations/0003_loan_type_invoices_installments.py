from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('loans', '0002_loanrequest'),
    ]

    operations = [
        migrations.AddField(
            model_name='loan',
            name='loan_type',
            field=models.CharField(choices=[('personal', 'Personal Loan'), ('student', 'Student Loan')], default='personal', max_length=20),
        ),
        migrations.AddField(
            model_name='loanrequest',
            name='loan_type',
            field=models.CharField(choices=[('personal', 'Personal Loan'), ('student', 'Student Loan')], default='personal', max_length=20),
        ),
        migrations.CreateModel(
            name='LoanInstallment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('installment_number', models.PositiveIntegerField()),
                ('due_date', models.DateField()),
                ('amount_due', models.DecimalField(decimal_places=2, max_digits=12)),
                ('amount_paid', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('paid', 'Paid')], default='pending', max_length=20)),
                ('paid_at', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('loan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='installments', to='loans.loan')),
            ],
            options={
                'ordering': ['due_date', 'installment_number'],
                'unique_together': {('loan', 'installment_number')},
            },
        ),
        migrations.CreateModel(
            name='Invoice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('invoice_number', models.CharField(max_length=50, unique=True)),
                ('invoice_type', models.CharField(choices=[('application', 'Loan Application Invoice'), ('payment', 'Loan Payment Invoice')], max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('due_date', models.DateField(blank=True, null=True)),
                ('issued_at', models.DateTimeField(auto_now_add=True)),
                ('notes', models.TextField(blank=True)),
                ('borrower', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='loan_invoices', to=settings.AUTH_USER_MODEL)),
                ('loan', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='invoices', to='loans.loan')),
                ('loan_request', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='invoices', to='loans.loanrequest')),
                ('payment', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='invoice', to='loans.payment')),
            ],
            options={
                'ordering': ['-issued_at'],
            },
        ),
    ]
