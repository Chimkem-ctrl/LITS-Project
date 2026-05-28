import React from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const confirmLogout = async () => {
    if (Platform.OS === 'web') {
      await logout();
      return;
    }

    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || '-'}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email || '-'}</Text>

        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{user?.role || '-'}</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  value: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  logoutBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderColor: COLORS.error,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: COLORS.error,
    fontWeight: '700',
  },
});
