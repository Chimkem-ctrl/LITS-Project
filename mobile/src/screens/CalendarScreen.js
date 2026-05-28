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

function toKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function monthLabel(date) {
  return date.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

function dateLabel(value) {
  if (!value) return '--';
  const parsed = parseDate(value);
  if (!parsed) return '--';
  return parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(value) {
  const num = parseFloat(value ?? 0);
  return Number.isNaN(num)
    ? 'PHP 0.00'
    : `PHP ${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildMonthCells(cursorMonth) {
  const firstDay = new Date(cursorMonth.getFullYear(), cursorMonth.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startOffset);

  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);
    cells.push({
      date: current,
      key: toKey(current),
      inMonth: current.getMonth() === cursorMonth.getMonth(),
    });
  }

  return cells;
}

function eventStatus(event) {
  if (event.status === 'paid') return 'paid';
  const today = toKey(new Date());
  if (event.status === 'pending' && event.due_date < today) return 'overdue';
  return 'pending';
}

function DayCell({ item, selected, hasPaid, hasPending, hasOverdue, onPress }) {
  return (
    <TouchableOpacity
      style={[
        styles.dayCell,
        !item.inMonth && styles.dayCellMuted,
        selected && styles.dayCellSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.dayText, !item.inMonth && styles.dayTextMuted, selected && styles.dayTextSelected]}>
        {item.date.getDate()}
      </Text>
      <View style={styles.dotRow}>
        {hasPaid ? <View style={[styles.dot, styles.dotPaid]} /> : null}
        {hasPending ? <View style={[styles.dot, styles.dotPending]} /> : null}
        {hasOverdue ? <View style={[styles.dot, styles.dotOverdue]} /> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function CalendarScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState([]);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState(() => toKey(new Date()));

  const fetchCalendar = useCallback(async () => {
    const response = await api.get('/borrower/calendar/');
    setEvents(normalizeList(response.data));
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await fetchCalendar();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchCalendar]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCalendar();
    } finally {
      setRefreshing(false);
    }
  };

  const eventsByDate = useMemo(() => {
    const grouped = {};
    events.forEach((item) => {
      if (!grouped[item.due_date]) grouped[item.due_date] = [];
      grouped[item.due_date].push(item);
    });
    return grouped;
  }, [events]);

  const monthCells = useMemo(() => buildMonthCells(monthCursor), [monthCursor]);
  const selectedEvents = eventsByDate[selectedKey] || [];
  const monthTimeline = useMemo(() => {
    const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const monthEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);

    const grouped = {};
    events.forEach((event) => {
      const dueDate = parseDate(event.due_date);
      if (!dueDate || dueDate < monthStart || dueDate > monthEnd) return;

      if (!grouped[event.due_date]) {
        grouped[event.due_date] = {
          dueDate: event.due_date,
          amountDue: 0,
          amountPaid: 0,
          items: [],
        };
      }

      grouped[event.due_date].amountDue += parseFloat(event.amount_due || 0);
      grouped[event.due_date].amountPaid += parseFloat(event.amount_paid || 0);
      grouped[event.due_date].items.push(event);
    });

    return Object.values(grouped)
      .map((row) => {
        const statuses = row.items.map(eventStatus);
        const status = statuses.includes('overdue')
          ? 'overdue'
          : statuses.includes('pending')
            ? 'pending'
            : 'paid';

        return {
          ...row,
          status,
        };
      })
      .sort((left, right) => new Date(left.dueDate) - new Date(right.dueDate));
  }, [events, monthCursor]);

  const goMonth = (direction) => {
    const next = new Date(monthCursor);
    next.setMonth(next.getMonth() + direction);
    next.setDate(1);
    setMonthCursor(next);
    setSelectedKey(toKey(next));
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
      <Text style={styles.title}>Loan Calendar</Text>
      <Text style={styles.subtitle}>Deadlines and payment status by month.</Text>

      <View style={styles.monthHeader}>
        <TouchableOpacity style={styles.monthBtn} onPress={() => goMonth(-1)}>
          <Text style={styles.monthBtnText}>Prev</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthLabel(monthCursor)}</Text>
        <TouchableOpacity style={styles.monthBtn} onPress={() => goMonth(1)}>
          <Text style={styles.monthBtnText}>Next</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekHeader}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
          <Text key={label} style={styles.weekLabel}>{label}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {monthCells.map((item) => {
          const dayEvents = eventsByDate[item.key] || [];
          const statuses = dayEvents.map(eventStatus);
          return (
            <DayCell
              key={item.key}
              item={item}
              selected={selectedKey === item.key}
              hasPaid={statuses.includes('paid')}
              hasPending={statuses.includes('pending')}
              hasOverdue={statuses.includes('overdue')}
              onPress={() => setSelectedKey(item.key)}
            />
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}><View style={[styles.dot, styles.dotPaid]} /><Text style={styles.legendText}>Paid</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, styles.dotPending]} /><Text style={styles.legendText}>Pending</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, styles.dotOverdue]} /><Text style={styles.legendText}>Overdue</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Monthly Deadline Timeline</Text>
      {monthTimeline.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No installment deadlines in this month.</Text>
        </View>
      ) : (
        monthTimeline.map((entry) => (
          <TouchableOpacity key={entry.dueDate} style={styles.card} onPress={() => setSelectedKey(entry.dueDate)} activeOpacity={0.86}>
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>Deadline {dateLabel(entry.dueDate)}</Text>
              <View
                style={[
                  styles.statusPill,
                  entry.status === 'paid' && styles.statusPaid,
                  entry.status === 'pending' && styles.statusPending,
                  entry.status === 'overdue' && styles.statusOverdue,
                ]}
              >
                <Text style={styles.statusText}>{entry.status}</Text>
              </View>
            </View>
            <Text style={styles.meta}>Installments: <Text style={styles.metaValue}>{entry.items.length}</Text></Text>
            <Text style={styles.meta}>Expected payment: <Text style={styles.metaValue}>{formatCurrency(entry.amountDue)}</Text></Text>
            <Text style={styles.meta}>Paid so far: <Text style={styles.metaValue}>{formatCurrency(entry.amountPaid)}</Text></Text>
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.sectionTitle}>Details for {dateLabel(selectedKey)}</Text>
      {selectedEvents.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No installment entries on this date.</Text>
        </View>
      ) : (
        selectedEvents.map((event) => {
          const derivedStatus = eventStatus(event);
          return (
            <View key={event.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{event.title}</Text>
                <View
                  style={[
                    styles.statusPill,
                    derivedStatus === 'paid' && styles.statusPaid,
                    derivedStatus === 'pending' && styles.statusPending,
                    derivedStatus === 'overdue' && styles.statusOverdue,
                  ]}
                >
                  <Text style={styles.statusText}>{derivedStatus}</Text>
                </View>
              </View>
              <Text style={styles.meta}>Loan Type: <Text style={styles.metaValue}>{event.loan_type}</Text></Text>
              <Text style={styles.meta}>Amount: <Text style={styles.metaValue}>{formatCurrency(event.amount_due)}</Text></Text>
              <Text style={styles.meta}>Due Date: <Text style={styles.metaValue}>{dateLabel(event.due_date)}</Text></Text>
              {event.paid_at ? (
                <Text style={styles.meta}>Paid At: <Text style={styles.metaValue}>{dateLabel(event.paid_at)}</Text></Text>
              ) : null}
            </View>
          );
        })
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
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  monthBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  monthTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  weekHeader: { flexDirection: 'row', marginBottom: 8 },
  weekLabel: { flex: 1, textAlign: 'center', color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellMuted: { opacity: 0.45 },
  dayCellSelected: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(45,212,191,0.14)',
  },
  dayText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' },
  dayTextMuted: { color: COLORS.textSecondary },
  dayTextSelected: { color: COLORS.accent },
  dotRow: { flexDirection: 'row', gap: 3, marginTop: 4, minHeight: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotPaid: { backgroundColor: COLORS.primary },
  dotPending: { backgroundColor: COLORS.spark },
  dotOverdue: { backgroundColor: COLORS.error },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { color: COLORS.textSecondary, fontSize: 12 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 8 },
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
  cardTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusPaid: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: 'rgba(34,197,94,0.45)' },
  statusPending: { backgroundColor: 'rgba(245,158,11,0.2)', borderColor: 'rgba(245,158,11,0.45)' },
  statusOverdue: { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.45)' },
  statusText: { color: COLORS.textPrimary, textTransform: 'capitalize', fontWeight: '600', fontSize: 11 },
  meta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  metaValue: { color: COLORS.textPrimary, fontWeight: '600' },
});
