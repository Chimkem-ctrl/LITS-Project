import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../api/axios';
import { COLORS } from '../styles/theme';

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function formatCurrency(value) {
  const num = parseFloat(value ?? 0);
  return Number.isNaN(num)
    ? 'PHP 0.00'
    : `PHP ${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function InvoicesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [invoices, setInvoices] = useState([]);

  const fetchInvoices = useCallback(async () => {
    const response = await api.get('/borrower/invoices/');
    setInvoices(normalizeList(response.data));
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await fetchInvoices();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchInvoices]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchInvoices();
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return invoices;
    return invoices.filter((item) => item.invoice_type === filter);
  }, [invoices, filter]);

  const totalApplication = useMemo(
    () => invoices
      .filter((item) => item.invoice_type === 'application')
      .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0),
    [invoices]
  );

  const totalPayment = useMemo(
    () => invoices
      .filter((item) => item.invoice_type === 'payment')
      .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0),
    [invoices]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
    >
      <Text style={styles.title}>Invoices</Text>
      <Text style={styles.subtitle}>Track application and payment invoices in one place.</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Application</Text>
          <Text style={styles.statValue}>{formatCurrency(totalApplication)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Payments</Text>
          <Text style={styles.statValue}>{formatCurrency(totalPayment)}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'All' },
          { key: 'application', label: 'Application' },
          { key: 'payment', label: 'Payment' },
        ].map((option) => {
          const active = filter === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(option.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No invoices found for this filter.</Text>
        </View>
      ) : (
        filtered.map((invoice) => (
          <View key={invoice.id} style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
              <View
                style={[
                  styles.typePill,
                  invoice.invoice_type === 'payment' ? styles.paymentPill : styles.applicationPill,
                ]}
              >
                <Text style={styles.typePillText}>
                  {invoice.invoice_type === 'payment' ? 'Payment' : 'Application'}
                </Text>
              </View>
            </View>
            <Text style={styles.amount}>{formatCurrency(invoice.amount)}</Text>
            <Text style={styles.meta}>
              Issued: <Text style={styles.metaValue}>{formatDate(invoice.issued_at)}</Text>
            </Text>
            {invoice.due_date ? (
              <Text style={styles.meta}>
                Due: <Text style={styles.metaValue}>{formatDate(invoice.due_date)}</Text>
              </Text>
            ) : null}
            {invoice.notes ? <Text style={styles.note}>{invoice.notes}</Text> : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 28 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  title: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  subtitle: { color: COLORS.textSecondary, marginTop: 6, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  statLabel: { color: COLORS.textSecondary, fontSize: 12 },
  statValue: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(45,212,191,0.14)',
  },
  filterText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 12 },
  filterTextActive: { color: COLORS.accent },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  emptyText: { color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceNumber: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 13, flex: 1, marginRight: 8 },
  typePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  paymentPill: { backgroundColor: 'rgba(34,197,94,0.2)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.45)' },
  applicationPill: { backgroundColor: 'rgba(245,158,11,0.2)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.45)' },
  typePillText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 11 },
  amount: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  meta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  metaValue: { color: COLORS.textPrimary, fontWeight: '600' },
  note: { color: COLORS.textTertiary, fontSize: 12, marginTop: 8 },
});
