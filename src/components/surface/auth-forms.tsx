"use client";

import Link from "next/link";
import type { User } from "@/lib/types";
import { useAuthForm, useSignupForm } from "@/components/domain/auth-form";
import { NICK_MAX, NICK_RULES } from "@/lib/signup";
import { useClaimForm } from "@/components/domain/claim-form";
import { useJoinRequest } from "@/components/domain/register-form";

/** Вход по нику и паролю в новом дизайне. */
export function SurfaceAuthForm({ redirectTo }: { redirectTo?: string }) {
  const f = useAuthForm(redirectTo);

  return (
    <form className="au-form" onSubmit={f.onSubmit}>
      <div className="sf-field">
        <label className="sf-field-label" htmlFor="au-nick">
          Ник
        </label>
        <input
          id="au-nick"
          name="username"
          className="sf-input"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={32}
          placeholder="например, Raider07"
          value={f.nick}
          onChange={(e) => f.setNick(e.target.value)}
          required
        />
      </div>
      <div className="sf-field">
        <label className="sf-field-label" htmlFor="au-password">
          Пароль
        </label>
        <input
          id="au-password"
          name="password"
          type="password"
          className="sf-input"
          autoComplete="current-password"
          maxLength={128}
          placeholder="••••••••"
          value={f.password}
          onChange={(e) => f.setPassword(e.target.value)}
          required
        />
      </div>
      {f.error && (
        <p className="sf-field-note bad" role="alert">
          {f.error}
        </p>
      )}
      <button type="submit" className="sf-btn sf-btn-amber au-submit" disabled={f.sending}>
        {f.sending ? "Подождите…" : "Войти"}
      </button>
      <p className="au-switch">
        Нет аккаунта? <Link href="/register">Регистрация</Link>
      </p>
    </form>
  );
}

/** Регистрация: ник, пароль и Embark ID в новом дизайне. */
export function SurfaceSignupForm() {
  const f = useSignupForm();

  return (
    <form className="au-form" onSubmit={f.onSubmit}>
      <div className="sf-field">
        <label className="sf-field-label" htmlFor="su-nick">
          Ник
        </label>
        <input
          id="su-nick"
          name="username"
          className="sf-input"
          autoComplete="username"
          autoCorrect="off"
          spellCheck={false}
          maxLength={NICK_MAX}
          value={f.nick}
          onChange={(e) => f.setNick(e.target.value)}
          required
        />
        <p className="sf-field-note">Он же имя на сайте и логин для входа</p>
        <ul className="au-rules">
          {NICK_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
      <div className="sf-field">
        <label className="sf-field-label" htmlFor="su-password">
          Пароль
        </label>
        <input
          id="su-password"
          name="password"
          type="password"
          className="sf-input"
          autoComplete="new-password"
          maxLength={128}
          placeholder="минимум 8 символов"
          value={f.password}
          onChange={(e) => f.setPassword(e.target.value)}
          required
        />
      </div>
      <div className="sf-field">
        <label className="sf-field-label" htmlFor="su-embark">
          Embark ID
        </label>
        <input
          id="su-embark"
          name="embark-id"
          className="sf-input au-embark"
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
      {f.error && (
        <p className="sf-field-note bad" role="alert">
          {f.error}
        </p>
      )}
      <button type="submit" className="sf-btn sf-btn-amber au-submit" disabled={f.sending}>
        {f.sending ? "Подождите…" : "Зарегистрироваться"}
      </button>
      <p className="au-switch">
        Уже есть аккаунт? <Link href="/login">Войти</Link>
      </p>
    </form>
  );
}

/** Пароль для аккаунта с историей матчей - по одноразовой ссылке от организатора. */
export function SurfaceClaimForm({ token, login }: { token: string; login: string }) {
  const f = useClaimForm(token);

  return (
    <form className="au-form" onSubmit={f.submit}>
      <div className="sf-field">
        <label className="sf-field-label" htmlFor="au-claim-pass">
          Новый пароль
        </label>
        <input
          id="au-claim-pass"
          type="password"
          className="sf-input"
          autoComplete="new-password"
          placeholder="не короче 8 символов"
          value={f.password}
          onChange={(e) => f.setPassword(e.target.value)}
        />
      </div>
      <div className="sf-field">
        <label className="sf-field-label" htmlFor="au-claim-pass2">
          Повтори пароль
        </label>
        <input id="au-claim-pass2" type="password" className="sf-input" autoComplete="new-password" value={f.confirm} onChange={(e) => f.setConfirm(e.target.value)} />
      </div>
      {f.error && (
        <p className="sf-field-note bad" role="alert">
          {f.error}
        </p>
      )}
      <button type="submit" className="sf-btn sf-btn-amber au-submit" disabled={f.busy}>
        {f.busy ? "Активируем…" : "Задать пароль и войти"}
      </button>
      <p className="au-switch">
        Ник для входа: <b>{login}</b>
      </p>
    </form>
  );
}

/** Заявка в общий пул: Embark ID берётся из профиля, здесь - только удобные даты. */
export function SurfaceJoinForm({ user }: { user: User }) {
  const embarkId = (user.embarkId ?? "").trim();
  const f = useJoinRequest();

  if (f.status === "ok") {
    return (
      <div className="au-done" role="status">
        <span className="au-ok" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="m5 12 5 5 9-10" />
          </svg>
        </span>
        <h2 className="sf-h-up">
          заявка в пуле<span className="sf-dot">.</span>
        </h2>
        <p className="au-text">Ты в общем списке участников. Организатор позовёт тебя на матч — статус появится в профиле.</p>
        <div className="au-actions">
          <Link className="sf-btn sf-btn-ink" href="/profile">
            В профиль
          </Link>
          <button type="button" className="sf-btn sf-btn-ink-line" onClick={() => f.setStatus("idle")}>
            Изменить заявку
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="au-form" onSubmit={f.onSubmit}>
      <p className="au-text">
        Вошёл как <b>{user.displayName || user.login}</b>
      </p>
      <div className="sf-field">
        <span className="sf-field-label">Embark ID</span>
        {embarkId ? (
          <p className="au-text">
            <b className="au-embark">{embarkId}</b> · <Link href="/profile">изменить в профиле</Link>
          </p>
        ) : (
          <p className="au-text">
            Не указан — заявку можно подать и так. Организатору он нужен для лобби в ARC Raiders: <Link href="/profile">добавь в профиле</Link>, и он сам подставится
            в заявку.
          </p>
        )}
      </div>
      <div className="sf-field">
        <label className="sf-field-label" htmlFor="au-note">
          Удобные даты и пожелания
        </label>
        <textarea
          id="au-note"
          className="sf-input"
          rows={3}
          placeholder="Например: могу по будням вечером и в выходные. Напарник — ник#0000."
          value={f.note}
          onChange={(e) => f.setNote(e.target.value)}
        />
      </div>
      {f.status === "error" && (
        <p className="sf-field-note bad" role="alert">
          {f.error}
        </p>
      )}
      <button type="submit" className="sf-btn sf-btn-amber au-submit" disabled={f.status === "sending"}>
        {f.status === "sending" ? "Отправляем…" : "Подать заявку"}
      </button>
    </form>
  );
}
