import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  auth as authApi,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
  type User,
} from "./api";

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  hasRole: (role: "admin" | "user") => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // If we have a token but stale user info, refresh.
    if (getToken() && !user) {
      setLoading(true);
      authApi
        .me()
        .then((u) => {
          setUser(u);
          setStoredUser(u);
        })
        .catch(() => {
          setToken(null);
          setStoredUser(null);
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const value: AuthState = {
    isAuthenticated: !!user,
    user,
    loading,
    hasRole: (role) => user?.role === role,
    login: async (email, password) => {
      const res = await authApi.login(email, password);
      setToken(res.token);
      setStoredUser(res.user);
      setUser(res.user);
    },
    register: async (data) => {
      const res = await authApi.register(data);
      setToken(res.token);
      setStoredUser(res.user);
      setUser(res.user);
    },
    logout: () => {
      setToken(null);
      setStoredUser(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
