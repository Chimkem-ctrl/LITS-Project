import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, clearTokens, getTokens, setTokens } from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tokens, setTokensState] = useState(getTokens());
  const [authLoading, setAuthLoading] = useState(true);

  const isAuthenticated = Boolean(tokens?.access && user);

  async function fetchMe() {
    const response = await api.get("/users/me/");
    setUser(response.data);
    return response.data;
  }

  async function updateProfile(payload) {
    const response = await api.patch("/users/me/", payload);
    setUser(response.data);
    return response.data;
  }

  async function changePassword(payload) {
    await api.post("/auth/users/set_password/", payload);
  }

  async function login(email, password) {
    const response = await api.post("/auth/jwt/create/", { email, password });
    setTokens(response.data);
    setTokensState(response.data);
    await fetchMe();
  }

  async function register(payload) {
    const body = {
      email: payload.email,
      first_name: payload.firstName,
      last_name: payload.lastName,
      password: payload.password,
      re_password: payload.confirmPassword,
      role: payload.role,
    };

    await api.post("/auth/users/", body);
  }

  async function activateAccount(uid, token) {
    await api.post("/auth/users/activation/", { uid, token });
  }

  function logout() {
    clearTokens();
    setTokensState(null);
    setUser(null);
  }

  useEffect(() => {
    async function initializeAuth() {
      const existingTokens = getTokens();

      if (!existingTokens?.access) {
        setAuthLoading(false);
        return;
      }

      try {
        setTokensState(existingTokens);
        await fetchMe();
      } catch {
        logout();
      } finally {
        setAuthLoading(false);
      }
    }

    initializeAuth();
  }, []);

  const value = useMemo(
    () => ({
      user,
      tokens,
      authLoading,
      isAuthenticated,
      login,
      register,
      activateAccount,
      fetchMe,
      updateProfile,
      changePassword,
      logout,
    }),
    [user, tokens, authLoading, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
