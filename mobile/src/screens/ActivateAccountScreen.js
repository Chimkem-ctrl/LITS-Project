import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/theme';

export default function ActivateAccountScreen({ route, navigation }) {
  const { activateAccount } = useAuth();
  const { uid, token } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('Verifying your activation link...');

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!uid || !token) {
        if (mounted) {
          setMessage('Invalid activation link.');
          setSuccess(false);
          setLoading(false);
        }
        return;
      }

      try {
        await activateAccount(uid, token);
        if (!mounted) return;
        setSuccess(true);
        setMessage('Account activated. You can now sign in.');
      } catch (error) {
        if (!mounted) return;
        const data = error?.response?.data;
        const detail =
          data?.detail ||
          data?.token?.[0] ||
          data?.uid?.[0] ||
          'Activation link is invalid or expired.';

        if (typeof detail === 'string' && detail.toLowerCase().includes('stale token')) {
          setSuccess(true);
          setMessage('Account is already activated. You can now sign in.');
        } else {
          setSuccess(false);
          setMessage(detail);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [uid, token, activateAccount]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Account Activation</Text>
        <Text style={styles.message}>{message}</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.accent} style={styles.loader} />
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{success ? 'Continue to Login' : 'Go to Login'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(17,24,39,0.94)',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.28)',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  loader: {
    marginTop: 20,
  },
  button: {
    marginTop: 20,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
