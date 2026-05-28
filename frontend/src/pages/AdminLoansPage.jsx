import { useEffect, useMemo, useState } from "react";
import { api } from "../api/axios";
import { ProtectedLayout } from "../components/common/Layout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Select, Textarea } from "../components/forms/Input";
import { toast } from "../components/ui/Toast";
import { AdminPageHeader, DataTable, StatusBadge } from "../components/admin/AdminUI";
import { formatCurrency, formatDate, getErrorMessage, normalizeListPayload } from "../utils/admin";
import "../styles/admin.css";

const emptyLoanForm = {
  borrower: "",
  principal_amount: "",
  loan_type: "personal",
  interest_rate: "",
  payment_term: "monthly",
  start_date: "",
  maturity_date: "",
  notes: "",
};

const loanTerms = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
];

const loanTypes = [
  { value: "personal", label: "Personal Loan" },
  { value: "student", label: "Student Loan" },
];

export default function AdminLoansPage() {
  const [borrowers, setBorrowers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loanRequests, setLoanRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loanForm, setLoanForm] = useState(emptyLoanForm);
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [borrowersResponse, loansResponse, requestsResponse] = await Promise.all([
        api.get("/borrowers/"),
        api.get("/loans/"),
        api.get("/loan-requests/?status=pending"),
      ]);
      setBorrowers(normalizeListPayload(borrowersResponse.data));
      setLoans(normalizeListPayload(loansResponse.data));
      setLoanRequests(normalizeListPayload(requestsResponse.data));
    } catch {
      toast.error("Failed to load loans data");
    }
  }

  const filteredLoans = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return loans;

    return loans.filter((loan) =>
      [loan.borrower_name, loan.status, loan.payment_term, loan.loan_type_display]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [loans, searchTerm]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      if (editingLoanId) {
        await api.patch(`/loans/${editingLoanId}/`, loanForm);
        toast.success("Loan updated successfully");
      } else {
        await api.post("/loans/", loanForm);
        toast.success("Loan created successfully");
      }
      resetForm();
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save loan"));
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(loan) {
    setEditingLoanId(loan.id);
    setLoanForm({
      borrower: String(loan.borrower),
      principal_amount: loan.principal_amount,
      loan_type: loan.loan_type,
      interest_rate: loan.interest_rate,
      payment_term: loan.payment_term,
      start_date: loan.start_date,
      maturity_date: loan.maturity_date,
      notes: loan.notes || "",
    });
  }

  async function handleDelete(loanId) {
    try {
      await api.delete(`/loans/${loanId}/`);
      toast.success("Loan deleted successfully");
      if (editingLoanId === loanId) {
        resetForm();
      }
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete loan"));
    }
  }

  function resetForm() {
    setEditingLoanId(null);
    setLoanForm(emptyLoanForm);
  }

  async function handleReviewRequest(requestId, decision) {
    setProcessingRequestId(requestId);

    try {
      await api.post(`/loan-requests/${requestId}/${decision}/`);
      toast.success(
        decision === "approve"
          ? "Loan request approved and converted into a loan"
          : "Loan request rejected"
      );
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to review loan request"));
    } finally {
      setProcessingRequestId(null);
    }
  }

  return (
    <ProtectedLayout>
      <div className="admin-container">
        <AdminPageHeader
          title="Loans"
          description="Create, update, and manage loan accounts for borrowers."
          actions={<Input id="loan-search" placeholder="Search loans" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />}
        />

        <Card className="admin-panel-card admin-panel-card-wide admin-section-block">
          <CardHeader>
            <CardTitle>Pending Loan Requests</CardTitle>
          </CardHeader>
          <CardBody>
            <DataTable
              columns={["Borrower", "Type", "Amount", "Purpose", "Message", "Requested", "Actions"]}
              emptyMessage="No pending loan requests"
              rows={loanRequests.map((request) => ({
                key: request.id,
                cells: [
                  request.borrower_name,
                  request.loan_type_display || request.loan_type,
                  formatCurrency(request.amount),
                  request.purpose || "--",
                  request.notes || "--",
                  formatDate(request.created_at),
                  <div key={`${request.id}-actions`} className="table-actions">
                    <Button
                      size="sm"
                      onClick={() => handleReviewRequest(request.id, "approve")}
                      loading={processingRequestId === request.id}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleReviewRequest(request.id, "reject")}
                      loading={processingRequestId === request.id}
                    >
                      Reject
                    </Button>
                  </div>,
                ],
              }))}
            />
          </CardBody>
        </Card>

        <div className="admin-content-grid">
          <Card className="admin-panel-card">
            <CardHeader>
              <CardTitle>{editingLoanId ? "Edit Loan" : "Create Loan Account"}</CardTitle>
            </CardHeader>
            <CardBody>
              <form className="admin-form" onSubmit={handleSubmit}>
                <div className="admin-form-grid">
                  <Select id="loan-borrower" label="Borrower" value={loanForm.borrower} onChange={(event) => setLoanForm((current) => ({ ...current, borrower: event.target.value }))} options={[{ value: "", label: "Select borrower" }, ...borrowers.map((borrower) => ({ value: String(borrower.id), label: borrower.full_name }))]} required />
                  <Input id="loan-principal" label="Principal Amount" type="number" min="0" step="0.01" value={loanForm.principal_amount} onChange={(event) => setLoanForm((current) => ({ ...current, principal_amount: event.target.value }))} required />
                  <Select id="loan-type" label="Loan Type" value={loanForm.loan_type} onChange={(event) => setLoanForm((current) => ({ ...current, loan_type: event.target.value }))} options={loanTypes} required />
                  <Input id="loan-interest" label="Interest Rate (%)" type="number" min="0" step="0.01" value={loanForm.interest_rate} onChange={(event) => setLoanForm((current) => ({ ...current, interest_rate: event.target.value }))} required />
                  <Select id="loan-term" label="Payment Term" value={loanForm.payment_term} onChange={(event) => setLoanForm((current) => ({ ...current, payment_term: event.target.value }))} options={loanTerms} required />
                  <Input id="loan-start" label="Start Date" type="date" value={loanForm.start_date} onChange={(event) => setLoanForm((current) => ({ ...current, start_date: event.target.value }))} required />
                  <Input id="loan-maturity" label="Maturity Date" type="date" value={loanForm.maturity_date} onChange={(event) => setLoanForm((current) => ({ ...current, maturity_date: event.target.value }))} required />
                  <Textarea id="loan-notes" label="Notes" value={loanForm.notes} onChange={(event) => setLoanForm((current) => ({ ...current, notes: event.target.value }))} />
                </div>
                <div className="admin-form-actions">
                  <Button type="submit" loading={saving}>{editingLoanId ? "Save Changes" : "Create Loan"}</Button>
                  {editingLoanId && <Button variant="secondary" onClick={resetForm}>Cancel</Button>}
                </div>
              </form>
            </CardBody>
          </Card>

          <Card className="admin-panel-card admin-panel-card-wide">
            <CardHeader>
              <CardTitle>Loan Portfolio</CardTitle>
            </CardHeader>
            <CardBody>
              <DataTable
                columns={["Borrower", "Type", "Principal", "Total Due", "Balance", "Status", "Actions"]}
                emptyMessage="No loans found"
                rows={filteredLoans.map((loan) => ({
                  key: loan.id,
                  cells: [
                    loan.borrower_name,
                    loan.loan_type_display || loan.loan_type,
                    formatCurrency(loan.principal_amount),
                    formatCurrency(loan.total_amount_due),
                    formatCurrency(loan.remaining_balance),
                    <StatusBadge key={`${loan.id}-status`} status={loan.status} />,
                    <div key={`${loan.id}-actions`} className="table-actions">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(loan)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(loan.id)}>Delete</Button>
                    </div>,
                  ],
                }))}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}