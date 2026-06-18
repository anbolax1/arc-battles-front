"use client";

/* Клиентский контекст авторизации. Начальное значение приходит с сервера
   (SSR getMe() в (site)/layout.tsx) — без мигания «гость → вошёл». refresh()
   перечитывает /api/auth/me после входа/выхода (Фаза 2). Токен в httpOnly-cookie
   rsp_session, JS его не читает — статус узнаём только по /auth/me. */

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { roleAtLeast } from "@/lib/roles";
import type { User } from "@/lib/types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  /** Доступ к кабинету организатора (роль superadmin или выше). */
  isSuperadmin: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  const [user, setUser] = React.useState<User | null>(initialUser);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setUser(await api.get<User>("/auth/me"));
    } catch (e) {
      // 401/403 — точно не вошёл; прочие ошибки (бэк недоступен) не сбрасывают стейт.
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const value: AuthValue = {
    user,
    loading,
    isSuperadmin: roleAtLeast(user?.role, "superadmin"),
    refresh,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен использоваться внутри <AuthProvider>");
  return ctx;
}

export function useUser(): User | null {
  return useAuth().user;
}
