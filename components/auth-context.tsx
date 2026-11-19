"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, type LoginResult } from "@/lib/api-client";

type User = { id_usuario: string; usuario: string; rol: string };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (usuario: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    api.auth.me()
      .then((data) => {
        if (cancelled) return;
        if (data.authenticated && data.session) {
          setUser(data.session);
        } else {
          router.replace("/login");
        }
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  const login = useCallback(async (usuario: string, password: string) => {
    const result = await api.auth.login(usuario, password);
    setUser({ id_usuario: result.id_usuario, usuario: result.usuario, rol: result.rol });
    return result;
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext value={{ user, loading, login, logout }}>
      {children}
    </AuthContext>
  );
}
