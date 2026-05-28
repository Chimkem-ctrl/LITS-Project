import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../styles/theme";

function formatCurrency(value) {
  const num = parseFloat(value ?? 0);
  if (isNaN(num)) return "\u20B10.00";
  return "\u20B1" + num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function StatusBadge({ status }) {
  const map = {
    active:   COLORS.badgeActive,
    paid:     COLORS.badgePaid,
    overdue:  COLORS.badgeOverdue,
    pending:  COLORS.badgePending,
    approved: COLORS.badgeApproved,
    rejected: COLORS.badgeRejected,
  };
  const s = map[status] ?? { bg: COLORS.surfaceAlt, text: COLORS.textSecondary };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : ""}
      </Text>
    </View>
  );
}

function StatCard({ icon, label, value, accentColor }) {
  return (
    <View style={[styles.statCard, accentColor && { borderLeftColor: accentColor, borderLeftWidth: 3 }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, accentColor && { color: accentColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, onAction, actionLabel }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function BorrowerDashboard({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [loans, setLoans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, loansRes, requestsRes, invoicesRes, calendarRes] = await Promise.all([
        api.get("/borrower/summary/"),
        api.get("/borrower/loans/"),
        api.get("/borrower/loan-requests/"),
        api.get('/borrower/invoices/'),
        api.get('/borrower/calendar/'),
      ]);
      setSummary(summaryRes.data);
      setLoans(normalizeList(loansRes.data));
      setRequests(normalizeList(requestsRes.data));
      setInvoices(normalizeList(invoicesRes.data));
      setCalendarEvents(normalizeList(calendarRes.data));
    } catch {
      Alert.alert("Error", "Could not load your loan data.");
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await fetchData(); setLoading(false); })();
  }, [fetchData]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.accent} size="large" /></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
    >
      <View style={styles.statsGrid}>
        <StatCard icon="📄" label="My Loans"   value={summary?.total_loans ?? "\u2014"}  accentColor={COLORS.accent} />
        <StatCard icon="✅" label="Active"      value={summary?.active_loans ?? "\u2014"} accentColor={COLORS.primary} />
        <StatCard icon="💵" label="Total Paid"  value={formatCurrency(summary?.total_paid)} />
        <StatCard icon="⏰" label="Remaining"   value={formatCurrency(summary?.total_remaining)} />
      </View>

      {summary?.next_due_date && (
        <View style={styles.dueBanner}>
          <Text style={styles.dueBannerText}>
            📅  Next payment due:{" "}
            <Text style={{ color: COLORS.spark, fontWeight: "700" }}>{formatDate(summary.next_due_date)}</Text>
          </Text>
        </View>
      )}

      <SectionHeader title="My Loans" />
      {loans.length === 0
        ? <View style={styles.empty}><Text style={styles.emptyText}>No loans yet.</Text></View>
        : loans.map((loan) => (
            <View key={loan.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardAmount}>{formatCurrency(loan.principal_amount)}</Text>
                <StatusBadge status={loan.status} />
              </View>
              <Text style={styles.cardNote}>{loan.loan_type_display || loan.loan_type || 'Loan'}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaItem}>Balance: <Text style={styles.metaValue}>{formatCurrency(loan.remaining_balance)}</Text></Text>
                <Text style={styles.metaItem}>Rate: <Text style={styles.metaValue}>{loan.interest_rate}%</Text></Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaItem}>Due: <Text style={styles.metaValue}>{formatDate(loan.maturity_date)}</Text></Text>
                <Text style={styles.metaItem}>Term: <Text style={styles.metaValue}>{loan.payment_term}</Text></Text>
              </View>
            </View>
          ))
      }

      <SectionHeader
        title="Upcoming Deadlines"
        onAction={() => navigation.navigate('Calendar')}
        actionLabel="View Calendar"
      />
      {calendarEvents.length === 0
        ? <View style={styles.empty}><Text style={styles.emptyText}>No calendar deadlines yet.</Text></View>
        : [...calendarEvents]
            .sort((left, right) => new Date(left.due_date) - new Date(right.due_date))
            .slice(0, 6)
            .map((event) => (
              <View key={event.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>{event.title}</Text>
                  <StatusBadge status={event.status} />
                </View>
                <Text style={styles.cardNote}>{event.loan_type}</Text>
                <Text style={styles.metaItem}>Due: <Text style={styles.metaValue}>{formatDate(event.due_date)}</Text></Text>
                <Text style={styles.metaItem}>Amount: <Text style={styles.metaValue}>{formatCurrency(event.amount_due)}</Text></Text>
                {event.paid_at ? (
                  <Text style={styles.metaItem}>Paid: <Text style={styles.metaValue}>{formatDate(event.paid_at)}</Text></Text>
                ) : null}
              </View>
            ))}

      <SectionHeader
        title="Recent Invoices"
        onAction={() => navigation.navigate('Invoices')}
        actionLabel="View All"
      />
      {invoices.length === 0
        ? <View style={styles.empty}><Text style={styles.emptyText}>No invoices issued yet.</Text></View>
        : invoices.slice(0, 6).map((invoice) => (
            <View key={invoice.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{invoice.invoice_number}</Text>
                <StatusBadge status={invoice.invoice_type === 'payment' ? 'paid' : 'pending'} />
              </View>
              <Text style={styles.cardNote}>
                {invoice.invoice_type === 'payment' ? 'Loan Payment Invoice' : 'Loan Application Invoice'}
              </Text>
              <Text style={styles.metaItem}>Amount: <Text style={styles.metaValue}>{formatCurrency(invoice.amount)}</Text></Text>
              <Text style={styles.metaItem}>Issued: <Text style={styles.metaValue}>{formatDate(invoice.issued_at)}</Text></Text>
            </View>
          ))}

      <SectionHeader
        title="Loan Requests"
        onAction={() => navigation.navigate("LoanRequest")}
        actionLabel="+ New Request"
      />
      {requests.length === 0
        ? <View style={styles.empty}><Text style={styles.emptyText}>No requests submitted.</Text></View>
        : requests.map((req) => (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardAmount}>{formatCurrency(req.amount)}</Text>
                <StatusBadge status={req.status} />
              </View>
              <Text style={styles.cardNote}>{req.loan_type_display || req.loan_type || 'Loan'}</Text>
              {req.purpose ? <Text style={styles.cardNote}>{req.purpose}</Text> : null}
              <Text style={styles.metaItem}>Submitted: <Text style={styles.metaValue}>{formatDate(req.created_at)}</Text></Text>
              {req.invoice?.invoice_number ? (
                <Text style={styles.metaItem}>Invoice: <Text style={styles.metaValue}>{req.invoice.invoice_number}</Text></Text>
              ) : null}
            </View>
          ))
      }
    </ScrollView>
  );
}

function AdminDashboard({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, requestsRes, loansRes] = await Promise.all([
        api.get("/reports/summary/"),
        api.get("/loan-requests/?status=pending"),
        api.get("/loans/"),
      ]);
      setSummary(summaryRes.data);
      setRequests(normalizeList(requestsRes.data));
      setLoans(normalizeList(loansRes.data).slice(0, 5));
    } catch {
      Alert.alert("Error", "Could not load admin data.");
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await fetchData(); setLoading(false); })();
  }, [fetchData]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const handleReview = (req, action) => {
    const isApprove = action === "approve";
    Alert.alert(
      isApprove ? "Approve Request" : "Reject Request",
      `${isApprove ? "Approve" : "Reject"} loan request of ${formatCurrency(req.amount)} from ${req.borrower_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isApprove ? "Approve" : "Reject",
          style: isApprove ? "default" : "destructive",
          onPress: async () => {
            try {
              await api.post(`/loan-requests/${req.id}/${action}/`);
              await fetchData();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.detail || "Action failed.");
            }
          },
        },
      ]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.accent} size="large" /></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
    >
      <View style={styles.statsGrid}>
        <StatCard icon="👥" label="Borrowers"  value={summary?.total_borrowers ?? "\u2014"} accentColor={COLORS.accent} />
        <StatCard icon="📊" label="Active"      value={summary?.active_loans ?? "\u2014"}    accentColor={COLORS.primary} />
        <StatCard icon="💰" label="Collected"   value={formatCurrency(summary?.total_collected)} />
        <StatCard icon="🧾" label="Remaining"   value={formatCurrency(summary?.total_remaining)} />
      </View>

      <SectionHeader title={`Pending Requests (${requests.length})`} />
      {requests.length === 0
        ? <View style={styles.empty}><Text style={styles.emptyText}>No pending requests.</Text></View>
        : requests.map((req) => (
            <View key={req.id} style={[styles.card, styles.pendingCard]}>
              <View style={styles.cardRow}>
                <Text style={styles.cardAmount}>{formatCurrency(req.amount)}</Text>
                <StatusBadge status={req.status} />
              </View>
              <Text style={styles.cardNote}>{req.borrower_name}</Text>
              {req.purpose ? <Text style={styles.metaItem}>{req.purpose}</Text> : null}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleReview(req, "approve")}>
                  <Text style={styles.approveBtnText}>✓ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReview(req, "reject")}>
                  <Text style={styles.rejectBtnText}>✕ Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
      }

      <SectionHeader title="Recent Loans" />
      {loans.length === 0
        ? <View style={styles.empty}><Text style={styles.emptyText}>No loans found.</Text></View>
        : loans.map((loan) => (
            <View key={loan.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{loan.borrower_name}</Text>
                <StatusBadge status={loan.status} />
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaItem}>Principal: <Text style={styles.metaValue}>{formatCurrency(loan.principal_amount)}</Text></Text>
                <Text style={styles.metaItem}>Balance: <Text style={styles.metaValue}>{formatCurrency(loan.remaining_balance)}</Text></Text>
              </View>
              <Text style={styles.metaItem}>Due: <Text style={styles.metaValue}>{formatDate(loan.maturity_date)}</Text></Text>
            </View>
          ))
      }
    </ScrollView>
  );
}

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  if (user?.role === "borrower") return <BorrowerDashboard navigation={navigation} />;
  return <AdminDashboard navigation={navigation} />;
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.bg },
  scroll:     { padding: 16, paddingBottom: 40 },
  center:     { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: {
    width: "47%",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon:  { fontSize: 20, marginBottom: 6 },
  statValue: { fontSize: 17, fontWeight: "700", color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },

  dueBanner: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  dueBannerText: { fontSize: 13, color: COLORS.textTertiary },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 6 },
  sectionTitle:  { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  sectionAction: { fontSize: 13, color: COLORS.accent, fontWeight: "600" },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pendingCard:  { borderColor: "rgba(251,191,36,0.25)" },
  cardRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardAmount:   { fontSize: 17, fontWeight: "700", color: COLORS.textPrimary },
  cardTitle:    { fontSize: 15, fontWeight: "600", color: COLORS.textPrimary },
  cardNote:     { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  metaRow:      { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  metaItem:     { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  metaValue:    { color: COLORS.textTertiary, fontWeight: "500" },

  actionRow:      { flexDirection: "row", gap: 10, marginTop: 12 },
  approveBtn:     { flex: 1, backgroundColor: "rgba(34,197,94,0.15)", borderWidth: 1, borderColor: "rgba(34,197,94,0.4)", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  approveBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 13 },
  rejectBtn:      { flex: 1, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  rejectBtnText:  { color: COLORS.error, fontWeight: "700", fontSize: 13 },

  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "600" },

  empty:     { alignItems: "center", paddingVertical: 20, marginBottom: 10 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
});
