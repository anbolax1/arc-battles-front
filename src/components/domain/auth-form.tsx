"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Panel } from "@/components/ui/card";
import type { User } from "@/lib/types";

/* Форма входа/регистрации по логину и паролю. mode переключает заголовки, набор полей
   (подтверждение пароля только при регистрации) и эндпоинт. После успеха обновляем
   контекст авторизации (refresh) и SSR-данные (router.refresh) и уходим на target. */

const fieldCls =
  "w-full bg-surface-2 px-3.5 py-2.5 text-sm text-fg shadow-[inset_0_0_0_1px_var(--border)] outline-none transition focus:shadow-[inset_0_0_0_1px_var(--primary)]";

const LOGIN_RE = /^[A-Za-z0-9_]{3,32}$/;
const MIN_PASSWORD = 8;

export function AuthForm({
  mode,
  redirectTo,
}: {
  mode: "login" | "register";
  redirectTo?: string;
}) {
  const isRegister = mode === "register";
  const router = useRouter();
  const { refresh } = useAuth();

  const [login, setLogin] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const l = login.trim();

    if (isRegister) {
      if (!LOGIN_RE.test(l)) {
        setError("Логин: 3–32 символа, латиница, цифры и подчёркивание.");
        return;
      }
      if (password.length < MIN_PASSWORD) {
        setError("Пароль должен быть не короче 8 символов.");
        return;
      }
      // Лимит bcrypt — 72 байта (для не-ASCII символ может быть >1 байта).
      if (new TextEncoder().encode(password).length > 72) {
        setError("Пароль слишком длинный (не более 72 байт).");
        return;
      }
      if (password !== confirm) {
        setError("Пароли не совпадают.");
        return;
      }
    } else if (!l || !password) {
      setError("Укажите логин и пароль.");
      return;
    }

    setSending(true);
    try {
      await api.post<User>(isRegister ? "/auth/register" : "/auth/login", {
        login: l,
        password,
      });
      await refresh();
      router.push(redirectTo || (isRegister ? "/profile" : "/"));
      router.refresh();
    } catch (err) {
      setError(errorText(err, "Не удалось выполнить вход. Попробуйте ещё раз."));
      setSending(false);
    }
  }

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
            autoComplete={isRegister ? "new-password" : "current-password"}
            maxLength={128}
            placeholder={isRegister ? "минимум 8 символов" : "••••••••"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {isRegister && (
          <div className="space-y-1.5">
            <label htmlFor="auth-confirm" className="text-xs uppercase tracking-wide text-muted">
              Повтори пароль
            </label>
            <input
              id="auth-confirm"
              name="confirm-password"
              type="password"
              className={fieldCls}
              autoComplete="new-password"
              maxLength={128}
              placeholder="ещё раз"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={sending}>
          <span>{sending ? "Подождите…" : isRegister ? "Зарегистрироваться" : "Войти"}</span>
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        {isRegister ? (
          <>
            Уже есть аккаунт?{" "}
            <Link href="/login" className="text-accent transition hover:underline">
              Войти
            </Link>
          </>
        ) : (
          <>
            Нет аккаунта?{" "}
            <Link href="/register" className="text-accent transition hover:underline">
              Регистрация
            </Link>
          </>
        )}
      </p>
    </Panel>
  );
}
