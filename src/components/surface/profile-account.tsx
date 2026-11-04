"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import type { User } from "@/lib/types";

// Ник - от 3 до 12 символов, как при регистрации; точные правила проверяет сервер.
const NICK_MAX = 12;

/** Подтверждение действия: сначала кнопка, потом «Да» и «Отмена» - чтобы не нажать случайно. */
function Confirm({
  label,
  question,
  doing,
  danger,
  onYes,
}: {
  label: string;
  question: string;
  doing: boolean;
  danger?: boolean;
  onYes: () => void;
}) {
  const [ask, setAsk] = React.useState(false);
  if (!ask) {
    return (
      <button type="button" className="sf-btn sf-btn-line sf-btn-sm" disabled={doing} onClick={() => setAsk(true)}>
        {label}
      </button>
    );
  }
  return (
    <span className="pf-mod-step">
      <button
        type="button"
        className={`sf-btn sf-btn-sm ${danger ? "sf-btn-amber" : "sf-btn-line"}`}
        disabled={doing}
        onClick={() => {
          setAsk(false);
          onYes();
        }}
      >
        Да, {label.toLowerCase()}
      </button>
      <button type="button" className="sf-btn sf-btn-line sf-btn-sm" onClick={() => setAsk(false)}>
        Отмена
      </button>
      <small className="pf-mod-warn">{question}</small>
    </span>
  );
}

/** Аккаунт игрока на его странице: ссылка на пароль, сброс пароля, принудительная смена ника
    и удаление пустого профиля. Что из этого доступно, решает страница; окончательно - сервер. */
export function ProfileAccount({
  user,
  noPassword,
  canRename,
  canDelete,
}: {
  user: Pick<User, "id" | "login" | "displayName">;
  noPassword: boolean;
  canRename: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const name = user.displayName || user.login;
  const [busy, setBusy] = React.useState("");
  const [err, setErr] = React.useState("");
  const [done, setDone] = React.useState("");
  const [noPass, setNoPass] = React.useState(noPassword);
  const [link, setLink] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [nick, setNick] = React.useState("");

  async function run(key: string, task: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    setErr("");
    setDone("");
    try {
      await task();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy("");
    }
  }

  const showLink = (token: string) => {
    setLink(`${window.location.origin}/claim/${token}`);
    setCopied(false);
    setNoPass(true);
  };
  const reset = () =>
    run("reset", async () => {
      showLink((await api.post<{ token: string }>(`/users/${user.id}/reset-password`, {})).token);
      setDone("Пароль сброшен, старые сессии закрыты. Передайте игроку ссылку: по ней он задаст новый пароль.");
    });
  const issue = (regenerate: boolean) =>
    run("link", async () => {
      showLink((await api.post<{ token: string }>(`/users/${user.id}/claim-link${regenerate ? "?regenerate=1" : ""}`, {})).token);
    });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setErr("Не удалось скопировать - выделите ссылку и скопируйте вручную.");
    }
  };
  const rename = () =>
    run("nick", async () => {
      const u = await api.patch<User>(`/users/${user.id}/nick`, { nick: nick.trim() });
      // Адрес профиля - это ник, поэтому страница переезжает на новый.
      router.replace(`/profile/${encodeURIComponent(u.login)}`);
      router.refresh();
    });
  const remove = () =>
    run("delete", async () => {
      await api.del(`/users/${user.id}`);
      router.replace("/rating");
      router.refresh();
    });

  const nickReady = nick.trim().length > 0 && nick.trim() !== user.login;

  return (
    <div className="pf-mod-account" role="group" aria-label={`Аккаунт: ${name}`}>
      <p className="sf-field-label">Аккаунт · пароль, ник, удаление</p>
      {err && (
        <p className="sf-field-note bad" role="alert">
          {err}
        </p>
      )}
      {done && <p className="sf-field-note">{done}</p>}

      <div className="pf-mod-sub">
        <span className="pf-mod-name">Пароль</span>
        {noPass ? (
          <>
            <button type="button" className="sf-btn sf-btn-amber sf-btn-sm" disabled={!!busy} onClick={() => issue(false)}>
              {link ? "Ссылка выдана" : "Выдать ссылку на пароль"}
            </button>
            {link && (
              <button type="button" className="sf-btn sf-btn-line sf-btn-sm" disabled={!!busy} onClick={() => issue(true)}>
                Новая ссылка
              </button>
            )}
          </>
        ) : (
          <Confirm label="Сбросить пароль" question="Старый пароль перестанет работать, игрока выкинет из аккаунта." doing={!!busy} danger onYes={reset} />
        )}
      </div>
      {link && (
        <div className="pf-mod-link">
          <input className="sf-input" readOnly value={link} aria-label="Ссылка на установку пароля" onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="sf-btn sf-btn-line sf-btn-sm" onClick={copy}>
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>
      )}
      {noPass && <p className="sf-field-note">Одноразовая: игрок задаёт пароль и сразу входит. Пока он этого не сделал, по паролю войти нельзя.</p>}

      {canRename && (
        <form
          className="pf-mod-sub"
          onSubmit={(e) => {
            e.preventDefault();
            if (nickReady) void rename();
          }}
        >
          <label className="pf-mod-name" htmlFor="pf-mod-nick">
            Ник
          </label>
          <input
            id="pf-mod-nick"
            className="sf-input"
            maxLength={NICK_MAX}
            placeholder={user.login}
            autoComplete="off"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
          />
          <button type="submit" className="sf-btn sf-btn-line sf-btn-sm" disabled={!!busy || !nickReady}>
            {busy === "nick" ? "Меняем…" : "Сменить ник"}
          </button>
          <small className="pf-mod-warn">
            Ник станет и логином, и именем на сайте, по нему идёт поиск; адрес профиля изменится. Войти можно и по прежнему нику, и по новому.
          </small>
        </form>
      )}

      {canDelete && (
        <div className="pf-mod-sub">
          <span className="pf-mod-name">Профиль</span>
          <Confirm label="Удалить профиль" question="Только пустой: без матчей, команд, жетонов и клипов. Это не отменить." doing={!!busy} danger onYes={remove} />
        </div>
      )}
    </div>
  );
}
