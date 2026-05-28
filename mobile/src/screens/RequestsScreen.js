import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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

export default function RequestsScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState([]);

  const fetchRequests = useCallback(async () => {
    const endpoint = user?.role === 'borrower' ? '/borrower/loan-requests/' : '/loan-requests/';
    const response = await api.get(endpoint);
    setRequests(normalizeList(response.data));
  }, [user?.role]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await fetchRequests();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchRequests]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchRequests();
    } finally {
      setRefreshing(false);
    }
  };

  const reviewRequest = async (requestId, action) => {
    try {
      await api.post(`/loan-requests/${requestId}/${action}/`);
      await fetchRequests();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Unable to review request.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  const isBorrower = user?.role === 'borrower';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{isBorrower ? 'My Requests' : 'Loan Requests'}</Text>
        {isBorrower ? (
          <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('LoanRequest')}>
            <Text style={styles.newBtnText}>New Request</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No requests available.</Text>
        </View>
      ) : (
        requests.map((request) => (
          <View key={request.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.amount}>{formatCurrency(request.amount)}</Text>
              <Text style={styles.status}>{request.status}</Text>
            </View>
            <Text style={styles.meta}>
              Type: <Text style={styles.metaValue}>{request.loan_type_display || request.loan_type || '--'}</Text>
            </Text>
            <Text style={styles.meta}>
              Submitted: <Text style={styles.metaValue}>{formatDate(request.created_at)}</Text>
            </Text>
            {request.invoice?.invoice_number ? (
              <Text style={styles.meta}>
                Invoice: <Text style={styles.metaValue}>{request.invoice.invoice_number}</Text>
              </Text>
            ) : null}
            {request.borrower_name ? (
              <Text style={styles.meta}>
                Borrower: <Text style={styles.metaValue}>{request.borrower_name}</Text>
              </Text>
            ) : null}
            {request.purpose ? <Text style={styles.purpose}>{request.purpose}</Text> : null}

            {!isBorrower && request.status === 'pending' ? (
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => reviewRequest(request.id, 'approve')}>
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => reviewRequest(request.id, 'reject')}>
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            ) : null}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  newBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
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
  purpose: { color: COLORS.textTertiary, marginTop: 6, fontSize: 13 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveBtn: {
    flex: 1,
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderColor: COLORS.primary,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtnText: { color: COLORS.primary, fontWeight: '700' },
  rejectBtn: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderColor: COLORS.error,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectBtnText: { color: COLORS.error, fontWeight: '700' },
});
