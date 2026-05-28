import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Base URL ────────────────────────────────────────────────────────────────
// Android emulator:  10.0.2.2  (maps to host machine localhost)
// iOS simulator:     127.0.0.1
// Physical device:   your machine's LAN IP (shown in `expo start --lan` output)
//                    e.g. 192.168.1.102
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.137.30:8000/api/v1';

const REQUEST_TIMEOUT_MS = 10000;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = await AsyncStorage.getItem('refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(
          `${BASE_URL}/auth/jwt/refresh/`,
          { refresh },
          { timeout: REQUEST_TIMEOUT_MS }
        );
        await AsyncStorage.setItem('access_token', data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
