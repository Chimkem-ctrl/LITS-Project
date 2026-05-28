import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';

const getExpoHost = () => {
  const debuggerHost = Constants.manifest?.debuggerHost || Constants.manifest2?.debuggerHost;
  if (!debuggerHost) return null;
  const host = debuggerHost.split(':')[0];
  if (!host || host === 'localhost') return null;
  return host;
};

const defaultBaseURL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000'
  : 'http://127.0.0.1:8000';

const hostOverride = getExpoHost();
const baseURL = hostOverride ? `http://${hostOverride}:8000` : defaultBaseURL;

const instance = axios.create({
  baseURL,
  timeout: 10000,
});

export const setAuthHeader = (token) => {
  if (token) {
    instance.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete instance.defaults.headers.common.Authorization;
  }
};

export const setBaseURL = (url) => {
  if (url) {
    instance.defaults.baseURL = url;
  }
};
export default instance;
