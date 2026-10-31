"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { NICK_MAX, NICK_RULES, validateSignup } from "@/lib/signup";
import { Panel } from "@/components/ui/card";
import type { User } from "@/lib/types";

/* Форма входа по нику и паролю. После успеха обновляем контекст авторизации (refresh)
   и SSR-данные (router.refresh) и уходим на target. */

const fieldCls =
  "w-full bg-surface-2 px-3.5 py-2.5 text-sm text-fg shadow-[inset_0_0_0_1px_var(--border)] outline-none transition focus:shadow-[inset_0_0_0_1px_var(--primary)]";

/** Вход: проверка полей, запрос и переход после успеха; общая для обоих дизайнов. */
export function useAuthForm(redirectTo?: string) {
  const router = useRouter();
  const { refresh } = useAuth();

  const [nick, setNick] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const l = nick.trim();

    if (!l || !password) {
      setError("Укажите ник и пароль.");
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

  return { nick, setNick, password, setPassword, sending, error, onSubmit };
}

/** Регистрация: ник, пароль и Embark ID. После успеха сервер сразу заводит сессию. */
export function useSignupForm() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [nick, setNick] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [embarkId, setEmbarkId] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const problem = validateSignup({ password, nick, embarkId });
    if (problem) {
      setError(problem);
      return;
    }

    setSending(true);
    try {
      await api.post<User>("/auth/register", {
        nick: nick.trim(),
        password,
        embarkId: embarkId.trim(),
      });
      await refresh();
      router.push("/profile");
      router.refresh();
    } catch (err) {
      setError(errorText(err, "Не удалось зарегистрироваться. Попробуйте ещё раз."));
      setSending(false);
    }
  }

  return { nick, setNick, password, setPassword, embarkId, setEmbarkId, sending, error, onSubmit };
}

export function SignupForm() {
  const f = useSignupForm();

  return (
    <Panel glow className="p-6">
      <form className="space-y-4" onSubmit={f.onSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="reg-nick" className="text-xs uppercase tracking-wide text-muted">
            Ник
          </label>
          <input
            id="reg-nick"
            name="username"
            className={fieldCls}
            autoComplete="username"
            autoCorrect="off"
            spellCheck={false}
            maxLength={NICK_MAX}
            value={f.nick}
            onChange={(e) => f.setNick(e.target.value)}
            required
          />
          <p className="text-xs text-muted">Он же имя на сайте и логин для входа.</p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted">
            {NICK_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-password" className="text-xs uppercase tracking-wide text-muted">
            Пароль
          </label>
          <input
            id="reg-password"
            name="password"
            type="password"
            className={fieldCls}
            autoComplete="new-password"
            maxLength={128}
            placeholder="минимум 8 символов"
            value={f.password}
            onChange={(e) => f.setPassword(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-embark" className="text-xs uppercase tracking-wide text-muted">
            Embark ID
          </label>
          <input
            id="reg-embark"
            name="embark-id"
            className={fieldCls}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={64}
            placeholder="Ник#1234"
            value={f.embarkId}
            onChange={(e) => f.setEmbarkId(e.target.value)}
            required
          />
        </div>

        {f.error && <p className="text-sm text-danger">{f.error}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={f.sending}>
          <span>{f.sending ? "Подождите…" : "Зарегистрироваться"}</span>
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-accent transition hover:underline">
          Войти
        </Link>
      </p>
    </Panel>
  );
}

export function AuthForm({ redirectTo }: { redirectTo?: string }) {
  const { nick, setNick, password, setPassword, sending, error, onSubmit } = useAuthForm(redirectTo);

  return (
    <Panel glow className="p-6">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="auth-nick" className="text-xs uppercase tracking-wide text-muted">
            Ник
          </label>
          <input
            id="auth-nick"
            name="username"
            className={fieldCls}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={32}
            placeholder="например, Raider07"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
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

      <p className="mt-4 text-center text-sm text-muted">
        Нет аккаунта?{" "}
        <Link href="/register" className="text-accent transition hover:underline">
          Регистрация
        </Link>
      </p>
    </Panel>
  );
}
