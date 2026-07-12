"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

/** Форма активации аккаунта по одноразовой ссылке: игрок задаёт пароль и сразу входит. */
export function ClaimForm({ token, login }: { token: string; login: string }) {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Пароль должен быть не короче 8 символов.");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post(`/claim/${encodeURIComponent(token)}`, { password });
      router.push("/profile");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.body || err.message : "Не удалось активировать аккаунт.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="field-label" htmlFor="claim-pass">Новый пароль</label>
        <input id="claim-pass" type="password" autoComplete="new-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="не короче 8 символов" />
      </div>
      <div className="space-y-1.5">
        <label className="field-label" htmlFor="claim-pass2">Повтори пароль</label>
        <input id="claim-pass2" type="password" autoComplete="new-password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        <span>{busy ? "Активируем…" : "Задать пароль и войти"}</span>
      </button>
      <p className="text-xs text-muted">Логин для входа: <span className="text-fg">@{login}</span></p>
    </form>
  );
}
