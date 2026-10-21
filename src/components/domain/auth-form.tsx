"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Panel } from "@/components/ui/card";
import type { User } from "@/lib/types";

/* Форма входа по логину и паролю. После успеха обновляем контекст авторизации (refresh)
   и SSR-данные (router.refresh) и уходим на target. */

const fieldCls =
  "w-full bg-surface-2 px-3.5 py-2.5 text-sm text-fg shadow-[inset_0_0_0_1px_var(--border)] outline-none transition focus:shadow-[inset_0_0_0_1px_var(--primary)]";

/** Вход: проверка полей, запрос и переход после успеха; общая для обоих дизайнов. */
export function useAuthForm(redirectTo?: string) {
  const router = useRouter();
  const { refresh } = useAuth();

  const [login, setLogin] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const l = login.trim();

    if (!l || !password) {
      setError("Укажите логин и пароль.");
      return;
    }

    setSending(true);
    try {
      await api.post<User>("/auth/login", {
        login: l,
        password,
      });
      await refresh();
      router.push(redirectTo || "/");
      router.refresh();
    } catch (err) {
      setError(errorText(err, "Не удалось выполнить вход. Попробуйте ещё раз."));
      setSending(false);
    }
  }

  return { login, setLogin, password, setPassword, sending, error, onSubmit };
}

export function AuthForm({ redirectTo }: { redirectTo?: string }) {
  const { login, setLogin, password, setPassword, sending, error, onSubmit } = useAuthForm(redirectTo);

  return (
    <Panel glow className="p-6">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="auth-login" className="text-xs uppercase tracking-wide text-muted">
            Логин
          </label>
          <input
            id="auth-login"
            name="username"
            className={fieldCls}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={32}
            placeholder="например, raider_07"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="auth-password" className="text-xs uppercase tracking-wide text-muted">
            Пароль
          </label>
          <input
            id="auth-password"
            name="password"
            type="password"
            className={fieldCls}
            autoComplete="current-password"
            maxLength={128}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={sending}>
          <span>{sending ? "Подождите…" : "Войти"}</span>
        </button>
      </form>
    </Panel>
  );
}
