"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser } from "./auth-validation";
import { useStore } from "./store";

export class AuthRequestError extends Error {
  constructor(public code: string) { super(code); }
}

type Credentials = { email: string; password: string };
type Signup = Credentials & { name: string; phone: string };
type AuthContextValue = {
  user: AuthUser | null; loading: boolean; error: boolean;
  refresh: () => Promise<void>;
  signup: (input: Signup) => Promise<AuthUser>;
  login: (input: Credentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
};
const Context = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { lang } = useStore();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) { setUser(null); setError(false); return; }
      if (!response.ok) throw new Error();
      setUser((await response.json()).user);
      setError(false);
    } catch { setUser(null); setError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  const post = async (path: string, body?: unknown) => {
    let response: Response;
    try {
      response = await fetch(`/api/auth/${path}`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Accept-Language": lang },
        body: JSON.stringify(body ?? {}),
      });
    } catch { throw new AuthRequestError("serverError"); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new AuthRequestError(data.code ?? "serverError");
    return data;
  };
  const signup = async (input: Signup) => (await post("signup", input)).user as AuthUser;
  const login = async (input: Credentials) => {
    const data = await post("login", input);
    setUser(data.user);
    setError(false);
    return data.user as AuthUser;
  };
  const logout = async () => {
    await post("logout");
    setUser(null);
    setError(false);
  };
  return <Context.Provider value={{ user, loading, error, refresh, signup, login, logout }}>{children}</Context.Provider>;
}
export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error("useAuth must be inside AuthProvider");
  return context;
}
