import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/axios";
import { ProtectedLayout } from "../components/common/Layout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { toast } from "../components/ui/Toast";
import { formatCurrency, formatDate } from "../utils/admin";
import "../styles/borrower.css";

export default function BorrowerLoanDetailsPage() {
  const { id } = useParams();
  const [loan, setLoan] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLoanDetails() {
      try {
        setLoading(true);
        // Fetch borrower's loans and find the one matching the ID
        const loansRes = await api.get("/borrower/loans/");
        const loansData = loansRes.data.results || loansRes.data;
        const foundLoan = loansData.find((l) => l.id === parseInt(id));

        if (!foundLoan) {
          toast.error("Loan not found");
          return;
        }

        setLoan(foundLoan);

        // Fetch all payments and filter for this loan
        const paymentsRes = await api.get("/borrower/payments/");
        const paymentsData = paymentsRes.data.results || paymentsRes.data;
        const loanPayments = paymentsData.filter((p) => p.loan === foundLoan.id);
        setPayments(loanPayments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)));
      } catch (error) {
        toast.error("Failed to load loan details");
      } finally {
        setLoading(false);
      }
    }

    loadLoanDetails();
  }, [id]);

  const installmentSchedule = loan?.installments || [];
  const progressPercent =
    loan?.total_amount_due > 0 ? Math.round((loan?.total_paid / loan?.total_amount_due) * 100) : 0;

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="borrower-container">
          <div className="loading-spinner">Loading loan details...</div>
        </div>
      </ProtectedLayout>
    );
  }

  if (!loan) {
    return (
      <ProtectedLayout>
        <div className="borrower-container">
          <Card className="empty-state">
            <CardBody>
              <p>Loan not found. Please try again.</p>
            </CardBody>
          </Card>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="borrower-container">
        {/* Header */}
        <div className="borrower-header">
          <div>
            <h1>Loan Details</h1>
            <p>Loan #{loan.id} • {loan.borrower_name}</p>
          </div>
          <span className={`status-badge status-${loan.status}`}>{loan.status}</span>
        </div>

        {/* Loan Summary */}
        <div className="loan-details-grid">
          <Card>
            <CardBody>
              <p className="detail-label">Principal Amount</p>
              <h3 className="detail-value">{formatCurrency(loan.principal_amount)}</h3>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="detail-label">Loan Type</p>
              <h3 className="detail-value">{loan.loan_type_display || loan.loan_type}</h3>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="detail-label">Interest Rate</p>
              <h3 className="detail-value">{loan.interest_rate}%</h3>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="detail-label">Payment Term</p>
              <h3 className="detail-value">{loan.payment_term}</h3>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="detail-label">Start Date</p>
              <h3 className="detail-value">{formatDate(loan.start_date)}</h3>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="detail-label">Maturity Date</p>
              <h3 className="detail-value">{formatDate(loan.maturity_date)}</h3>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="detail-label">Total Amount Due</p>
              <h3 className="detail-value">{formatCurrency(loan.total_amount_due)}</h3>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="detail-label">Total Paid</p>
              <h3 className="detail-value">{formatCurrency(loan.total_paid)}</h3>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="detail-label">Remaining Balance</p>
              <h3 className="detail-value">{formatCurrency(loan.remaining_balance)}</h3>
            </CardBody>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Repayment Progress</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="progress-container">
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <div className="progress-stats">
                <span className="progress-stat">
                  <strong>{progressPercent}%</strong> Complete
                </span>
                <span className="progress-stat">
                  {formatCurrency(loan.total_paid)} paid of {formatCurrency(loan.total_amount_due)}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Notes */}
        {loan.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="loan-notes">{loan.notes}</p>
            </CardBody>
          </Card>
        )}

        {/* Installment Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Installment Schedule</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="installment-schedule-table">
              <table>
                <thead>
                  <tr>
                    <th>Installment</th>
                    <th>Due Date</th>
                    <th>Amount Due</th>
                    <th>Status</th>
                    <th>Paid Date</th>
                  </tr>
                </thead>
                <tbody>
                  {installmentSchedule.map((inst) => (
                    <tr key={inst.id} className={`status-row-${inst.status}`}>
                      <td>#{inst.installment_number}</td>
                      <td>{formatDate(inst.due_date)}</td>
                      <td>{formatCurrency(inst.amount_due)}</td>
                      <td>
                        <span className={`status-badge status-${inst.status}`}>{inst.status}</span>
                      </td>
                      <td>{inst.paid_at ? formatDate(inst.paid_at) : "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Payment History */}
        {payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="payment-history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Invoice Number</th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td className="payment-amount">{formatCurrency(payment.amount_paid)}</td>
                        <td>{payment.invoice_number || "--"}</td>
                        <td className="payment-recorder">{payment.recorded_by_name || "System"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {payments.length === 0 && (
          <Card className="empty-state">
            <CardBody>
              <p>No payments recorded yet.</p>
            </CardBody>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  );
}
