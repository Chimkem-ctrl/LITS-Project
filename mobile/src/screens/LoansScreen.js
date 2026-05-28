import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/theme';

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function formatCurrency(value) {
  const num = parseFloat(value ?? 0);
  return isNaN(num)
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

function summarizeInstallments(installments) {
  if (!Array.isArray(installments) || installments.length === 0) {
    return {
      paidCount: 0,
      totalCount: 0,
      nextPending: null,
    };
  }

  const paidCount = installments.filter((item) => item.status === 'paid').length;
  const pending = installments
    .filter((item) => item.status !== 'paid')
    .sort((left, right) => new Date(left.due_date) - new Date(right.due_date));

  return {
    paidCount,
    totalCount: installments.length,
    nextPending: pending[0] || null,
  };
}

export default function LoansScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loans, setLoans] = useState([]);

  const fetchLoans = useCallback(async () => {
    const endpoint = user?.role === 'borrower' ? '/borrower/loans/' : '/loans/';
    const response = await api.get(endpoint);
    setLoans(normalizeList(response.data));
  }, [user?.role]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await fetchLoans();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchLoans]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchLoans();
    } finally {
      setRefreshing(false);
    }
  };

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
      <Text style={styles.title}>{user?.role === 'borrower' ? 'My Loans' : 'All Loans'}</Text>
      {loans.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No loans found.</Text>
        </View>
      ) : (
        loans.map((loan) => (
          (() => {
            const schedule = summarizeInstallments(loan.installments);
            return (
              <View key={loan.id} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.amount}>{formatCurrency(loan.principal_amount)}</Text>
                  <Text style={styles.status}>{loan.status}</Text>
                </View>
                <Text style={styles.meta}>
                  Type: <Text style={styles.metaValue}>{loan.loan_type_display || loan.loan_type || '--'}</Text>
                </Text>
                <Text style={styles.meta}>
                  Balance: <Text style={styles.metaValue}>{formatCurrency(loan.remaining_balance)}</Text>
                </Text>
                <Text style={styles.meta}>
                  Interest: <Text style={styles.metaValue}>{loan.interest_rate}%</Text>
                </Text>
                <Text style={styles.meta}>
                  Due: <Text style={styles.metaValue}>{formatDate(loan.maturity_date)}</Text>
                </Text>
                <Text style={styles.meta}>
                  Schedule: <Text style={styles.metaValue}>{schedule.paidCount}/{schedule.totalCount} paid</Text>
                </Text>
                {schedule.nextPending ? (
                  <Text style={styles.meta}>
                    Next Deadline: <Text style={styles.metaValue}>{formatDate(schedule.nextPending.due_date)}</Text>
                  </Text>
                ) : (
                  <Text style={styles.meta}>
                    Next Deadline: <Text style={styles.metaValue}>Completed</Text>
                  </Text>
                )}
                {loan.borrower_name ? (
                  <Text style={styles.meta}>
                    Borrower: <Text style={styles.metaValue}>{loan.borrower_name}</Text>
                  </Text>
                ) : null}
              </View>
            );
          })()
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 28 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  title: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 12 },
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
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  amount: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  status: { color: COLORS.spark, fontWeight: '600', textTransform: 'capitalize' },
  meta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  metaValue: { color: COLORS.textPrimary, fontWeight: '600' },
});
