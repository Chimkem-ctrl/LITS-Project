import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/theme';

const ROLE_OPTIONS = [
  { value: 'borrower', label: 'Borrower' },
  { value: 'officer', label: 'Lending Officer' },
  { value: 'admin', label: 'Admin' },
];

export default function SignupScreen({ navigation }) {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('borrower');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      Alert.alert('Missing fields', 'Please fill out every field.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({ firstName, lastName, email, password, confirmPassword, role });
      Alert.alert('Account created', 'Please check your email and activate your account before signing in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      const data = err.response?.data;
      const message =
        data?.detail ||
        data?.email?.[0] ||
        data?.password?.[0] ||
        data?.non_field_errors?.[0] ||
        'Could not create your account. Please try again.';
      Alert.alert('Sign up failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Text style={styles.brandName}>LITS</Text>
          <Text style={styles.brandTagline}>Create your borrower account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Register to track your loan requests.</Text>

          <View style={styles.row}>
            <View style={[styles.half, styles.leftHalf]}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                placeholder="John"
                placeholderTextColor={COLORS.textSecondary}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                placeholder="Doe"
                placeholderTextColor={COLORS.textSecondary}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>Role</Text>
          <View style={styles.roleRow}>
            {ROLE_OPTIONS.map((option) => {
              const isSelected = role === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.roleChip, isSelected && styles.roleChipActive]}
                  onPress={() => setRole(option.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.roleChipText, isSelected && styles.roleChipTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 8 characters"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            style={styles.input}
            placeholder="Repeat your password"
            placeholderTextColor={COLORS.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create account</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 4,
  },
  brandTagline: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(17,24,39,0.94)',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.28)',
    shadowColor: 'rgba(20,184,166,0.85)',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
  },
  half: {
    flex: 1,
  },
  leftHalf: {
    marginRight: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  roleChip: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(15,23,42,0.92)',
  },
  roleChipActive: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(45,212,191,0.18)',
  },
  roleChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: COLORS.accentSoft,
  },
  input: {
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  linkButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.accentSoft,
    fontSize: 14,
    fontWeight: '600',
  },
});