import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/axios";
import { ProtectedLayout } from "../components/common/Layout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Select, Textarea } from "../components/forms/Input";
import { toast } from "../components/ui/Toast";
import { formatCurrency, formatDate, getErrorMessage } from "../utils/admin";
import "../styles/borrower.css";

const emptyRequestForm = {
  amount: "",
  loan_type: "personal",
  purpose: "",
  notes: "",
};

const LOAN_TYPE_OPTIONS = [
  { value: "personal", label: "Personal Loan" },
  { value: "student", label: "Student Loan" },
];

function toKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseKey(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export default function BorrowerDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loanRequests, setLoanRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [requestForm, setRequestForm] = useState(emptyRequestForm);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => toKey(new Date()));

  useEffect(() => {
    async function loadBorrowerData() {
      try {
        setLoading(true);
        const [summaryRes, loansRes, paymentsRes, requestsRes, invoicesRes, calendarRes] = await Promise.all([
          api.get("/borrower/summary/"),
          api.get("/borrower/loans/"),
          api.get("/borrower/payments/"),
          api.get("/borrower/loan-requests/"),
          api.get("/borrower/invoices/"),
          api.get("/borrower/calendar/"),
        ]);

        setSummary(summaryRes.data);
        setLoans(loansRes.data.results || loansRes.data);
        setPayments(paymentsRes.data.results || paymentsRes.data);
        setLoanRequests(requestsRes.data.results || requestsRes.data);
        setInvoices((invoicesRes.data?.results || invoicesRes.data || []));
        setCalendarEvents(calendarRes.data?.results || calendarRes.data || []);
      } catch (error) {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    loadBorrowerData();
  }, []);

  // Calculate progress percentage
  const progressPercent =
    summary?.total_due > 0 ? Math.round((summary?.total_paid / summary?.total_due) * 100) : 0;

  // Get top 5 recent payments
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
    .slice(0, 5);

  async function handleRequestSubmit(event) {
    event.preventDefault();
    setSubmittingRequest(true);

    try {
      const response = await api.post("/borrower/loan-requests/", requestForm);
      const createdRequest = response.data;
      setLoanRequests((current) => [createdRequest, ...current]);
      if (createdRequest.invoice) {
        setInvoices((current) => [createdRequest.invoice, ...current]);
        toast.success(`Loan request submitted. Invoice ${createdRequest.invoice.invoice_number} issued.`);
      } else {
        toast.success("Loan request submitted for review");
      }
      setRequestForm(emptyRequestForm);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to submit your loan request"));
    } finally {
      setSubmittingRequest(false);
    }
  }

  const calendarByDate = useMemo(() => {
    const grouped = new Map();
    for (const event of calendarEvents) {
      const date = event.due_date;
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date).push(event);
    }
    return grouped;
  }, [calendarEvents]);

  const monthTimeline = useMemo(() => {
    const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const monthEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
    const rows = [];

    for (const event of calendarEvents) {
      const dueDate = parseKey(event.due_date);
      if (!dueDate || dueDate < monthStart || dueDate > monthEnd) continue;
      rows.push(event);
    }

    const grouped = new Map();
    for (const event of rows) {
      if (!grouped.has(event.due_date)) {
        grouped.set(event.due_date, {
          due_date: event.due_date,
          amount_due: 0,
          amount_paid: 0,
          events: [],
        });
      }
      const bucket = grouped.get(event.due_date);
      bucket.amount_due += Number(event.amount_due || 0);
      bucket.amount_paid += Number(event.amount_paid || 0);
      bucket.events.push(event);
    }

    const todayKey = toKey(new Date());
    return Array.from(grouped.values())
      .map((item) => {
        let status = "paid";
        if (item.events.some((event) => event.status === "pending" && event.due_date < todayKey)) {
          status = "overdue";
        } else if (item.events.some((event) => event.status === "pending")) {
          status = "pending";
        }
        return {
          ...item,
          status,
        };
      })
      .sort((left, right) => new Date(left.due_date) - new Date(right.due_date));
  }, [calendarEvents, monthCursor]);

  const monthCalendar = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const gridStart = new Date(year, month, 1 - startWeekday);

    const cells = [];
    const todayKey = toKey(new Date());
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const isoDate = toKey(date);
      const events = calendarByDate.get(isoDate) || [];
      const pending = events.filter((event) => event.status === "pending" && event.due_date >= todayKey).length;
      const overdue = events.filter((event) => event.status === "pending" && event.due_date < todayKey).length;
      const paid = events.filter((event) => event.status === "paid").length;
      cells.push({
        key: isoDate,
        date,
        day: date.getDate(),
        inMonth: date.getMonth() === month,
        pending,
        overdue,
        paid,
      });
    }

    return {
      monthLabel: firstDay.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      cells,
    };
  }, [calendarByDate, monthCursor]);

  const selectedDateEvents = calendarByDate.get(selectedDateKey) || [];

  function goMonth(direction) {
    const nextMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + direction, 1);
    setMonthCursor(nextMonth);
    setSelectedDateKey(toKey(nextMonth));
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="borrower-container">
          <div className="loading-spinner">Loading your dashboard...</div>
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
            <h1>My Loans</h1>
            <p>View your loans, payments, and request new financing inside the system</p>
          </div>
        </div>

        <div className="borrower-request-grid">
          <Card className="borrower-request-card">
            <CardHeader>
              <CardTitle>Loan Request Form</CardTitle>
            </CardHeader>
            <CardBody>
              <form className="borrower-request-form" onSubmit={handleRequestSubmit}>
                <Input
                  id="request-amount"
                  label="Requested Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={requestForm.amount}
                  onChange={(event) => setRequestForm((current) => ({ ...current, amount: event.target.value }))}
                  required
                />
                <Input
                  id="request-purpose"
                  label="Purpose"
                  placeholder="Optional purpose for the request"
                  value={requestForm.purpose}
                  onChange={(event) => setRequestForm((current) => ({ ...current, purpose: event.target.value }))}
                />
                <Select
                  id="request-loan-type"
                  label="Loan Type"
                  value={requestForm.loan_type}
                  options={LOAN_TYPE_OPTIONS}
                  onChange={(event) => setRequestForm((current) => ({ ...current, loan_type: event.target.value }))}
                />
                <Textarea
                  id="request-notes"
                  label="Notes / Message"
                  placeholder="Add any details the admin should review"
                  value={requestForm.notes}
                  onChange={(event) => setRequestForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                />
                <div className="borrower-request-actions">
                  <Button type="submit" loading={submittingRequest}>Submit Request</Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card className="borrower-request-card">
            <CardHeader>
              <CardTitle>Request Status</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="borrower-request-list">
                {loanRequests.length === 0 && <p className="borrower-empty-copy">No loan requests yet.</p>}
                {loanRequests.map((request) => (
                  <div key={request.id} className="borrower-request-item">
                    <div className="borrower-request-item-header">
                      <div>
                        <strong>{formatCurrency(request.amount)}</strong>
                        <p>{request.loan_type_display || request.loan_type || "Loan"} - {request.purpose || "General financing request"}</p>
                      </div>
                      <span className={`status-badge status-${request.status}`}>{request.status}</span>
                    </div>
                    <p className="borrower-request-meta">Submitted {formatDate(request.created_at)}</p>
                    {request.notes && <p className="borrower-request-notes">{request.notes}</p>}
                    {request.approved_loan_id && (
                      <Link to={`/borrower/loan/${request.approved_loan_id}`} className="loan-details-link borrower-inline-link">
                        View created loan
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="borrower-summary-grid">
          <Card className="borrower-summary-card">
            <CardBody>
              <p className="summary-label">Total Loan Amount</p>
              <h2 className="summary-value">{formatCurrency(summary?.total_due)}</h2>
              <p className="summary-meta">{summary?.total_loans} loan(s)</p>
            </CardBody>
          </Card>

          <Card className="borrower-summary-card">
            <CardBody>
              <p className="summary-label">Total Paid</p>
              <h2 className="summary-value">{formatCurrency(summary?.total_paid)}</h2>
              <p className="summary-meta">{progressPercent}% complete</p>
            </CardBody>
          </Card>

          <Card className="borrower-summary-card">
            <CardBody>
              <p className="summary-label">Remaining Balance</p>
              <h2 className="summary-value">{formatCurrency(summary?.total_remaining)}</h2>
              <p className="summary-meta">{summary?.active_loans} active</p>
            </CardBody>
          </Card>

          <Card className="borrower-summary-card">
            <CardBody>
              <p className="summary-label">Next Due Date</p>
              <h2 className="summary-value">{summary?.next_due_date ? formatDate(summary?.next_due_date) : "N/A"}</h2>
              <p className="summary-meta">Keep payments on track</p>
            </CardBody>
          </Card>
        </div>

        <div className="borrower-request-grid">
          <Card className="borrower-request-card">
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="borrower-request-list">
                {invoices.length === 0 && <p className="borrower-empty-copy">No invoices yet.</p>}
                {invoices.slice(0, 8).map((invoice) => (
                  <div key={invoice.id} className="borrower-request-item">
                    <div className="borrower-request-item-header">
                      <div>
                        <strong>{invoice.invoice_number}</strong>
                        <p>{invoice.invoice_type === "application" ? "Loan Application Invoice" : "Loan Payment Invoice"}</p>
                      </div>
                      <span className="status-badge status-approved">Issued</span>
                    </div>
                    <p className="borrower-request-meta">Amount {formatCurrency(invoice.amount)}</p>
                    <p className="borrower-request-meta">Issued {formatDate(invoice.issued_at)}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card className="borrower-request-card">
            <CardHeader>
              <CardTitle>Loan Deadlines Calendar</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="borrower-calendar-header">{monthCalendar.monthLabel}</div>
              <div className="borrower-calendar-nav">
                <button type="button" className="borrower-calendar-nav-btn" onClick={() => goMonth(-1)}>
                  Previous Month
                </button>
                <button type="button" className="borrower-calendar-nav-btn" onClick={() => goMonth(1)}>
                  Next Month
                </button>
              </div>
              <div className="borrower-calendar-grid">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                  <div key={label} className="borrower-calendar-weekday">{label}</div>
                ))}
                {monthCalendar.cells.map((cell) => (
                  <button
                    key={cell.key}
                    type="button"
                    className={`borrower-calendar-cell ${!cell.inMonth ? "is-outside" : ""} ${selectedDateKey === cell.key ? "is-selected" : ""}`}
                    onClick={() => setSelectedDateKey(cell.key)}
                  >
                    <span className="borrower-calendar-day">{cell.day}</span>
                    <div className="borrower-calendar-markers">
                      {cell.overdue > 0 && <span className="marker marker-overdue">{cell.overdue} overdue</span>}
                      {cell.pending > 0 && <span className="marker marker-pending">{cell.pending} due</span>}
                      {cell.paid > 0 && <span className="marker marker-paid">{cell.paid} paid</span>}
                    </div>
                  </button>
                ))}
              </div>
              <div className="borrower-calendar-timeline-header">
                <strong>Monthly Timeline</strong>
                <span>Shows each deadline and expected payment for this month.</span>
              </div>
              <div className="borrower-request-list">
                {monthTimeline.length === 0 && <p className="borrower-empty-copy">No monthly deadlines for this month.</p>}
                {monthTimeline.map((event) => (
                  <div key={event.due_date} className="borrower-request-item">
                    <div className="borrower-request-item-header">
                      <div>
                        <strong>Deadline {formatDate(event.due_date)}</strong>
                        <p>{event.events.length} installment(s)</p>
                      </div>
                      <span className={`status-badge status-${event.status}`}>{event.status}</span>
                    </div>
                    <p className="borrower-request-meta">Expected payment {formatCurrency(event.amount_due)}</p>
                    <p className="borrower-request-meta">Paid so far {formatCurrency(event.amount_paid)}</p>
                  </div>
                ))}
              </div>
              <div className="borrower-calendar-timeline-header">
                <strong>Selected Date Details</strong>
                <span>{selectedDateKey ? formatDate(selectedDateKey) : "No date selected"}</span>
              </div>
              <div className="borrower-request-list">
                {selectedDateEvents.length === 0 && <p className="borrower-empty-copy">No installments on this date.</p>}
                {selectedDateEvents.map((event) => (
                  <div key={event.id} className="borrower-request-item">
                    <div className="borrower-request-item-header">
                      <div>
                        <strong>{event.title}</strong>
                        <p>{event.loan_type}</p>
                      </div>
                      <span className={`status-badge status-${event.status}`}>{event.status}</span>
                    </div>
                    <p className="borrower-request-meta">Amount {formatCurrency(event.amount_due)}</p>
                    <p className="borrower-request-meta">Paid {formatCurrency(event.amount_paid)}</p>
                    {event.paid_at && <p className="borrower-request-meta">Paid on {formatDate(event.paid_at)}</p>}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Overall Progress */}
        <Card className="borrower-progress-card">
          <CardHeader>
            <CardTitle>Loan Progress</CardTitle>
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
                  Paid <strong>{formatCurrency(summary?.total_paid)}</strong> of{" "}
                  <strong>{formatCurrency(summary?.total_due)}</strong>
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Loan Cards */}
        {loans.length > 0 && (
          <div className="borrower-section">
            <h2>Your Loans</h2>
            <div className="loan-cards-grid">
              {loans.map((loan) => {
                const loanProgress = loan.total_amount_due > 0 ? (loan.total_paid / loan.total_amount_due) * 100 : 0;
                const statusBadgeClass = `status-badge status-${loan.status}`;

                return (
                  <Card key={loan.id} className="loan-card">
                    <CardHeader>
                      <div className="loan-card-header">
                        <div>
                          <h3>Loan #{loan.id}</h3>
                          <p className="loan-borrower">{loan.borrower_name}</p>
                        </div>
                        <span className={statusBadgeClass}>{loan.status}</span>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <div className="loan-details">
                        <div className="loan-detail-row">
                          <span className="loan-label">Principal Amount:</span>
                          <span className="loan-value">{formatCurrency(loan.principal_amount)}</span>
                        </div>
                        <div className="loan-detail-row">
                          <span className="loan-label">Remaining Balance:</span>
                          <span className="loan-value">{formatCurrency(loan.remaining_balance)}</span>
                        </div>
                        <div className="loan-detail-row">
                          <span className="loan-label">Interest Rate:</span>
                          <span className="loan-value">{loan.interest_rate}%</span>
                        </div>
                        <div className="loan-detail-row">
                          <span className="loan-label">Maturity Date:</span>
                          <span className="loan-value">{formatDate(loan.maturity_date)}</span>
                        </div>

                        {/* Mini progress bar */}
                        <div className="loan-progress-mini">
                          <div className="progress-bar-bg-mini">
                            <div className="progress-bar-fill-mini" style={{ width: `${loanProgress}%` }}></div>
                          </div>
                          <span className="progress-percent-mini">{Math.round(loanProgress)}% paid</span>
                        </div>
                      </div>

                      {/* View Details Link */}
                      <Link to={`/borrower/loan/${loan.id}`} className="loan-details-link">
                        View Full Details →
                      </Link>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment History */}
        {recentPayments.length > 0 && (
          <Card className="borrower-payment-history">
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="payment-history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Loan</th>
                      <th>Amount</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td>Loan #{payment.loan}</td>
                        <td className="payment-amount">{formatCurrency(payment.amount_paid)}</td>
                        <td className="payment-ref">{payment.reference_number || "--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Empty State */}
        {loans.length === 0 && (
          <Card className="empty-state">
            <CardBody>
              <p>No loans found. Contact your lender to get started.</p>
            </CardBody>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  );
}
