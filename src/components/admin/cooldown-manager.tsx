"use client";

import * as React from "react";
import Link from "next/link";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Panel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead } from "@/components/ui/section-head";
import { HISTORY_HINT, dayClock, durationLeft, historyLine, minutesLabel, untilLabel, useQueueChannel } from "@/lib/queue";
import type { CooldownLogEntry, CooldownOverview, CooldownPlayer } from "@/lib/types";

/* Кулдаун после матча: игрок снова встаёт в очередь только через это время - в 1×1 и 2×2, в любой сессии.
   Считает сервер от времени завершения последнего матча; здесь меняют правила и видят журнал правок. */

const MAX_MINUTES = 7 * 24 * 60; // как на сервере: дольше это уже отстранение
const SEARCH_DELAY_MS = 300;

/** Часы из поля ввода («1,5» тоже) в минуты; null - не число или вне пределов. */
function toMinutes(v: string, allowZero: boolean): number | null {
  const h = Number(v.trim().replace(",", "."));
  if (!Number.isFinite(h)) return null;
  const m = Math.round(h * 60);
  if (m < (allowZero ? 0 : 1) || m > MAX_MINUTES) return null;
  return m;
}

function hoursValue(min: number): string {
  return String(Math.round((min / 60) * 100) / 100).replace(".", ",");
}

function playerName(p: Pick<CooldownPlayer, "displayName" | "login">): string {
  return p.displayName || p.login;
}

/** Серверное «сейчас», которое тикает раз в секунду: «осталось» обновляется само. sync - запомнить серверное
    время из ответа: часы пользователя могут уходить. */
function useServerNow(): { now: number; sync: (serverTime: string) => void } {
  const offset = React.useRef(0);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset.current), 1000);
    return () => clearInterval(t);
  }, []);
  const sync = React.useCallback((serverTime: string) => {
    offset.current = Date.parse(serverTime) - Date.now();
    setNow(Date.now() + offset.current);
  }, []);
  return { now, sync };
}

function logText(l: CooldownLogEntry): string {
  const d = l.data ?? {};
  const mins = (v: unknown) => (typeof v === "number" ? minutesLabel(v) : "общая");
  switch (l.action) {
    case "default":
      return l.userId ? "длительность снова общая" : `общая длительность: ${mins(d.from)} → ${mins(d.to)}`;
    case "duration":
      return `своя длительность: ${mins(d.from)} → ${mins(d.to)}`;
    case "disable":
      return "кулдаун отключён";
    case "enable":
      return "кулдаун снова действует";
    case "clear":
      return "кулдаун снят";
    case "set":
      return `поставлен кулдаун на ${mins(d.minutes)}${typeof d.until === "string" ? ` (до ${dayClock(d.until)})` : ""}`;
    default:
      return l.action;
  }
}

/* ---------- Общая длительность ---------- */

function DefaultPanel({ minutes, canEdit, busy, onSave }: { minutes: number; canEdit: boolean; busy: boolean; onSave: (m: number) => void }) {
  const [value, setValue] = React.useState(hoursValue(minutes));
  const next = toMinutes(value, true);
  return (
    <Panel className="space-y-3 p-5">
      <h3 className="font-display text-lg uppercase">Общая длительность</h3>
      <p className="text-sm text-muted">
        Сейчас: <b className="text-fg">{minutesLabel(minutes)}</b>. Действует на всех, у кого нет своей, и сразу - в том числе на
        уже идущие кулдауны. 0 - кулдаун выключен для всех без своей длительности.
      </p>
      {canEdit ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (next !== null && next !== minutes) onSave(next);
          }}
        >
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted">Часов</span>
            <input className="input w-28" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={next === null} />
          </label>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy || next === null || next === minutes}>
            <span>Сохранить</span>
          </button>
          {next === null && <span className="text-xs text-danger">От 0 до 168 часов (неделя)</span>}
        </form>
      ) : (
        <p className="text-xs text-muted">Общую длительность меняет организатор.</p>
      )}
    </Panel>
  );
}

/* ---------- Игрок ---------- */

function PlayerRow({
  p,
  now,
  defaultMinutes,
  self,
  busy,
  act,
}: {
  p: CooldownPlayer;
  now: number;
  defaultMinutes: number;
  self: boolean;
  busy: boolean;
  act: (p: CooldownPlayer, action: string, minutes?: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [setFor, setSetFor] = React.useState(hoursValue(p.minutes ?? (defaultMinutes || 180)));
  const [own, setOwn] = React.useState(hoursValue(p.minutes ?? (defaultMinutes || 180)));
  const left = p.until ? Math.ceil((Date.parse(p.until) - now) / 1000) : 0;
  const active = !!p.until && left > 0;
  const hist = historyLine(p, now);
  const setMin = toMinutes(setFor, false);
  const ownMin = toMinutes(own, false);

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href={`/profile/${p.login}`} target="_blank" className="font-display text-lg uppercase hover:text-primary">
          {playerName(p)}
        </Link>
        {p.inQueue && <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary">в очереди</span>}
        <span className={`text-sm font-semibold ${active ? "text-danger" : "text-muted"}`}>
          {p.disabled
            ? "Кулдаун отключён"
            : active
              ? `Кулдаун до ${untilLabel(p.until!, now)} · осталось ${durationLeft(left)}`
              : "Кулдауна нет"}
        </span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {active && (
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || self} onClick={() => act(p, "clear")}>
              <span>Снять кулдаун</span>
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            <span>{open ? "Свернуть" : "Настроить"}</span>
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
        <span title={HISTORY_HINT[hist.kind]} className={hist.kind === "newbie" ? "font-semibold uppercase text-ok" : hist.kind === "today" ? "font-semibold text-primary" : ""}>
          {hist.text}
        </span>
        <span>матчей всего: {p.totalMatches}</span>
        <span>длительность: {p.minutes != null ? `своя, ${minutesLabel(p.minutes)}` : `общая, ${minutesLabel(defaultMinutes)}`}</span>
        {p.manualUntil && <span>поставлен вручную до {untilLabel(p.manualUntil, now)}</span>}
      </div>
      {self && <p className="text-xs text-muted">Свой кулдаун меняет организатор.</p>}
      {open && !self && (
        <div className="grid gap-3 border-t border-[var(--border)] pt-3 text-sm sm:grid-cols-3">
          <form
            className="space-y-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (setMin !== null) act(p, "set", setMin);
            }}
          >
            <span className="block text-xs uppercase tracking-wide text-muted">Поставить вручную, часов от сейчас</span>
            <div className="flex gap-1.5">
              <input className="input h-8 w-20" inputMode="decimal" value={setFor} onChange={(e) => setSetFor(e.target.value)} aria-invalid={setMin === null} />
              <button type="submit" className="btn btn-ghost btn-sm" disabled={busy || setMin === null}>
                <span>Поставить</span>
              </button>
            </div>
          </form>
          <form
            className="space-y-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (ownMin !== null) act(p, "duration", ownMin);
            }}
          >
            <span className="block text-xs uppercase tracking-wide text-muted">Своя длительность, часов</span>
            <div className="flex flex-wrap gap-1.5">
              <input className="input h-8 w-20" inputMode="decimal" value={own} onChange={(e) => setOwn(e.target.value)} aria-invalid={ownMin === null} />
              <button type="submit" className="btn btn-ghost btn-sm" disabled={busy || ownMin === null || ownMin === p.minutes}>
                <span>Сохранить</span>
              </button>
              {p.minutes != null && (
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(p, "default")}>
                  <span>Как у всех</span>
                </button>
              )}
            </div>
          </form>
          <div className="space-y-1">
            <span className="block text-xs uppercase tracking-wide text-muted">Совсем без кулдауна</span>
            <button type="button" className={`btn btn-sm ${p.disabled ? "btn-primary" : "btn-ghost"}`} disabled={busy} onClick={() => act(p, p.disabled ? "enable" : "disable")}>
              <span>{p.disabled ? "Включить кулдаун" : "Отключить кулдаун"}</span>
            </button>
            <span className="block text-xs text-muted">Записывается без ожидания, но в порядке очереди стоит как сыгравший.</span>
          </div>
        </div>
      )}
    </li>
  );
}

/* ---------- Раздел ---------- */

export function CooldownManager() {
  const { user, isSuperadmin } = useAuth();
  const [query, setQuery] = React.useState("");
  const [needle, setNeedle] = React.useState("");
  const [ov, setOv] = React.useState<CooldownOverview | null>(null);
  const [log, setLog] = React.useState<CooldownLogEntry[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const seq = React.useRef(0);

  React.useEffect(() => {
    const t = setTimeout(() => setNeedle(query.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [query]);

  const { now, sync } = useServerNow();
  const reload = React.useCallback(async () => {
    const mine = ++seq.current;
    try {
      const [next, entries] = await Promise.all([
        api.get<CooldownOverview>(`/cooldowns${needle ? `?q=${encodeURIComponent(needle)}` : ""}`),
        api.get<CooldownLogEntry[]>("/cooldowns/log"),
      ]);
      if (mine !== seq.current) return;
      sync(next.serverTime);
      setOv(next);
      setLog(entries);
    } catch (e) {
      if (mine === seq.current) setErr(errorText(e, "Не удалось загрузить кулдауны"));
    }
  }, [needle, sync]);

  // Матч завершился или кулдаун поменяли с другого устройства - сервер шлёт сообщение очереди.
  const live = useQueueChannel(reload);

  async function act(p: CooldownPlayer, action: string, minutes?: number) {
    setBusy(true);
    setErr("");
    try {
      await api.post<CooldownPlayer>(`/cooldowns/players/${p.userId}`, { action, minutes });
      await reload();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveDefault(minutes: number) {
    setBusy(true);
    setErr("");
    try {
      setOv(await api.put<CooldownOverview>("/cooldowns/default", { minutes }));
      await reload();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHead
        eyebrow="Кабинет"
        title="Кулдауны"
        action={
          <Link href="/admin/queue" className="btn btn-ghost btn-sm">
            <span>Очередь →</span>
          </Link>
        }
      />
      <p className="-mt-2 max-w-3xl text-sm text-muted">
        После завершённого матча игрок снова встаёт в очередь только через кулдаун - в 1×1 и 2×2, в любой сессии. Он идёт от времени
        завершения матча и не сбрасывается выходом из очереди; отменённый матч и пропуск вызова его не дают. Своя длительность важнее
        общей. Все правки остаются в журнале.{" "}
        <span className={live ? "text-ok" : ""}>{live ? "● обновляется сразу" : "○ обновляется по таймеру"}</span>
      </p>
      {err && (
        <p className="text-sm text-danger" role="alert">
          {err}
        </p>
      )}

      {ov && (
        // key: после сохранения поле начинает с нового значения
        <DefaultPanel key={ov.defaultMinutes} minutes={ov.defaultMinutes} canEdit={isSuperadmin} busy={busy} onSave={(m) => void saveDefault(m)} />
      )}

      <Panel className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="mr-auto font-display text-lg uppercase">{needle ? "Найденные игроки" : "На кулдауне и со своими правилами"}</h3>
          <input className="input max-w-xs" placeholder="Поиск по нику" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Поиск игрока по нику" />
        </div>
        {!ov ? (
          <p className="text-sm text-muted">Загружаем…</p>
        ) : ov.players.length === 0 ? (
          <EmptyState
            title={needle ? "Никого не нашли" : "Сейчас ни у кого нет кулдауна"}
            hint={needle ? "Проверьте ник." : "Найдите игрока по нику, чтобы поставить кулдаун вручную или задать свою длительность."}
          />
        ) : (
          <ul className="-mx-5 divide-y divide-[var(--border)]">
            {ov.players.map((p) => (
              <PlayerRow
                key={p.userId}
                p={p}
                now={now}
                defaultMinutes={ov.defaultMinutes}
                self={p.userId === user?.id && !isSuperadmin}
                busy={busy}
                act={(pl, action, minutes) => void act(pl, action, minutes)}
              />
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="space-y-3 p-5">
        <h3 className="font-display text-lg uppercase">Журнал правок</h3>
        {log === null ? (
          <p className="text-sm text-muted">Загружаем…</p>
        ) : log.length === 0 ? (
          <p className="text-sm text-muted">Правок пока не было.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-[var(--border)] overflow-y-auto">
            {log.map((l) => (
              <li key={l.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5 text-sm">
                <span className="w-24 font-mono text-xs text-muted">{dayClock(l.at)}</span>
                <span className="min-w-0 flex-1">
                  {l.label && <b>{l.label}: </b>}
                  {logText(l)}
                </span>
                {l.actor && <span className="text-xs text-muted">{l.actor}</span>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
