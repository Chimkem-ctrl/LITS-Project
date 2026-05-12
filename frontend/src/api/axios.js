import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const TOKEN_KEY = "lits_tokens";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

function getTokens() {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

function setTokens(tokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const tokens = getTokens();
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (error.response.status === 401) {
      const tokens = getTokens();
      if (!tokens?.refresh) {
        clearTokens();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/jwt/refresh/`,
          { refresh: tokens.refresh },
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        const updatedTokens = {
          ...tokens,
          access: refreshResponse.data.access,
        };

        setTokens(updatedTokens);
        originalRequest.headers.Authorization = `Bearer ${updatedTokens.access}`;

        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { api, getTokens, setTokens, clearTokens, TOKEN_KEY };
