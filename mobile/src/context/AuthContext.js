import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Re-hydrate from storage on app start
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        try {
          const { data } = await api.get('/users/me/');
          setUser(data);
        } catch {
          await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data } = await api.post('/auth/jwt/create/', {
      email: normalizedEmail,
      password,
    });
    await AsyncStorage.setItem('access_token', data.access);
    await AsyncStorage.setItem('refresh_token', data.refresh);
    const me = await api.get('/users/me/');
    setUser(me.data);
    return me.data;
  };

  const register = async ({ firstName, lastName, email, password, confirmPassword, role = 'borrower' }) => {
    const normalizedEmail = email.trim().toLowerCase();
    await api.post('/auth/users/', {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: normalizedEmail,
      password,
      re_password: confirmPassword,
      role,
    });
  };

  const activateAccount = async (uid, token) => {
    await api.post('/auth/users/activation/', { uid, token });
  };

  const logout = async () => {
    setUser(null);
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    } catch {
      // User is already signed out in memory; ignore storage cleanup errors.
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, activateAccount, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
