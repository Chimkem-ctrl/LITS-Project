import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import api from '../api/axios';
import { COLORS } from '../styles/theme';

const LOAN_TYPES = [
  { value: 'personal', label: 'Personal Loan' },
  { value: 'student', label: 'Student Loan' },
];

export default function LoanRequestScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [loanType, setLoanType] = useState('personal');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid loan amount.');
      return;
    }
    if (!purpose.trim()) {
      Alert.alert('Purpose required', 'Please describe the purpose of this loan.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/borrower/loan-requests/', {
        amount: parsed,
        loan_type: loanType,
        purpose: purpose.trim(),
        notes: notes.trim() || undefined,
      });
      const invoiceNumber = response?.data?.invoice?.invoice_number;
      Alert.alert(
        'Request submitted!',
        invoiceNumber
          ? `Your loan request has been sent for review. Invoice: ${invoiceNumber}`
          : 'Your loan request has been sent for review.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        Object.values(err.response?.data ?? {})[0]?.[0] ||
        'Failed to submit request.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>New Loan Request</Text>
        <Text style={styles.subheading}>Fill in the details and we'll review your request.</Text>

        <Text style={styles.label}>Loan Type</Text>
        <View style={styles.typeRow}>
          {LOAN_TYPES.map((type) => {
            const selected = loanType === type.value;
            return (
              <TouchableOpacity
                key={type.value}
                style={[styles.typeChip, selected && styles.typeChipActive]}
                onPress={() => setLoanType(type.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeChipText, selected && styles.typeChipTextActive]}>{type.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Requested Amount ($)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 5000"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <Text style={styles.label}>Purpose</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Home renovation"
          placeholderTextColor={COLORS.textSecondary}
          value={purpose}
          onChangeText={setPurpose}
        />

        <Text style={styles.label}>Additional Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any additional information..."
          placeholderTextColor={COLORS.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit Request</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  subheading: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 28 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeChip: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
  },
  typeChipActive: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(45,212,191,0.16)',
  },
  typeChipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  typeChipTextActive: { color: COLORS.accentSoft },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 18,
  },
  textArea: { height: 100, paddingTop: 12 },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: COLORS.textSecondary, fontSize: 14 },
});
