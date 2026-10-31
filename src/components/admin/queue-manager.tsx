"use client";

import * as React from "react";
import Link from "next/link";
import { api, errorText } from "@/lib/api";
import { Panel } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead } from "@/components/ui/section-head";
import {
  FORMAT_LABEL,
  STATE_LABEL,
  clock,
  dayClock,
  entryStatusLabel,
  mmss,
  num,
  plural,
  todayLabel,
  useQueue,
  useSecondsLeft,
  type UseQueue,
} from "@/lib/queue";
import type {
  MatchPlayer,
  MatchTeam,
  QueueEntry,
  QueueEvent,
  QueueFormat,
  QueueMatch,
  QueueMember,
  QueueSession,
  QueueSnapshot,
} from "@/lib/types";

const W_PEOPLE: [string, string, string] = ["запись", "записи", "записей"];

const EVENT_LABEL: Record<string, string> = {
  session_created: "Открыта сессия",
  session_updated: "Изменены настройки",
  session_finished: "Сессия завершена",
  queue_open: "Запись открыта",
  queue_close: "Запись закрыта",
  queue_pause: "Очередь приостановлена",
  queue_resume: "Очередь возобновлена",
  join: "Встал в очередь",
  add: "Добавлен организатором",
  leave: "Вышел из очереди",
  remove: "Удалён организатором",
  invite: "Вызван на матч",
  confirm: "Подтвердил готовность",
  confirm_part: "Подтвердил один из команды",
  skip: "Пропущен",
  no_show: "Неявка: пропущен после вызова",
  return: "Возвращён в очередь",
  move: "Переставлен",
  match_started: "Матч начался",
  match_finished: "Матч завершён",
  match_cancelled: "Матч отменён",
};

function Countdown({ until, serverNow }: { until: string; serverNow: () => number }) {
  const left = useSecondsLeft(until, serverNow);
  if (left === null) return null;
  return left > 0 ? (
    <span className="font-mono text-xs tabular-nums text-primary">{mmss(left)}</span>
  ) : (
    <span className="text-xs font-semibold text-danger">время вышло</span>
  );
}

const TONE: Record<string, string> = {
  waiting: "text-muted",
  skipped: "text-muted",
  invited: "text-accent",
  ready: "text-ok",
  performing: "text-danger",
};

function StatusText({ e }: { e: QueueEntry }) {
  return (
    <span className={`text-xs font-semibold uppercase tracking-wide ${e.isNext ? "text-primary" : (TONE[e.status] ?? "")}`}>
      {entryStatusLabel(e)}
    </span>
  );
}

/** Часы и ноки игрока, как их подтвердил модератор: ведущему видно, с кем он играет. */
function MemberStats({ m, named }: { m: QueueMember; named: boolean }) {
  const known = m.hours != null && m.knocks != null;
  return (
    <span className={known ? "" : "text-danger"}>
      {named && <b className="font-semibold">{m.displayName || m.login}: </b>}
      {m.hours != null ? `${num(m.hours)} ч` : "часы не подтверждены"} · {m.knocks != null ? `${num(m.knocks)} нок` : "ноки не подтверждены"}
    </span>
  );
}

/** Сколько матчей человек сыграл сегодня: сыгравшие стоят позади тех, кто ещё не играл. */
function TodayChip({ n }: { n: number }) {
  return <span className={n > 0 ? "font-semibold text-primary" : ""}>сегодня: {todayLabel(n)}</span>;
}

/* ---------- Создание и настройки сессии ---------- */

function SessionForm({
  format,
  session,
  canChangeFormat,
  busy,
  onSubmit,
  onCancel,
}: {
  format: QueueFormat;
  session?: QueueSession;
  canChangeFormat?: boolean;
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = React.useState(session?.title ?? "");
  const [timeout, setTimeoutSec] = React.useState(String(session?.confirmTimeoutSec ?? 60));
  const [fmt, setFmt] = React.useState<QueueFormat>(session?.format ?? format);
  const seconds = Number(timeout);
  const bad = !Number.isInteger(seconds) || seconds < 10 || seconds > 600;

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (bad) return;
        const body: Record<string, unknown> = { confirmTimeoutSec: seconds };
        if (title.trim()) body.title = title.trim();
        if (session) {
          body.title = title.trim() || session.title;
          if (canChangeFormat && fmt !== session.format) body.format = fmt;
        } else {
          body.format = format;
        }
        onSubmit(body);
      }}
    >
      <label className="space-y-1 sm:col-span-2">
        <span className="text-xs uppercase tracking-wide text-muted">Название</span>
        <input
          className="input"
          maxLength={100}
          placeholder="Очередь на выступления | дата"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs uppercase tracking-wide text-muted">Время на подтверждение, секунд</span>
        <input className="input" inputMode="numeric" value={timeout} onChange={(e) => setTimeoutSec(e.target.value)} aria-invalid={bad} />
        <span className={`block text-xs ${bad ? "text-danger" : "text-muted"}`}>От 10 до 600. Время только подсказка: никого не исключает.</span>
      </label>
      {session && canChangeFormat && (
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-muted">Формат</span>
          <select className="input" value={fmt} onChange={(e) => setFmt(e.target.value as QueueFormat)}>
            <option value="1x1">1×1</option>
            <option value="2x2">2×2</option>
          </select>
        </label>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || bad}>
          <span>{session ? "Сохранить" : `Открыть очередь ${FORMAT_LABEL[format]}`}</span>
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            <span>Отмена</span>
          </button>
        )}
      </div>
    </form>
  );
}

/* ---------- Текущий матч ---------- */

function MatchPanel({
  snap,
  q,
  busy,
  run,
}: {
  snap: QueueSnapshot;
  q: UseQueue;
  busy: boolean;
  run: (path: string, body?: unknown, method?: "POST" | "DELETE") => void;
}) {
  const s = snap.session!;
  const m = snap.match;
  const byId = new Map(snap.entries.map((e) => [e.id, e]));
  const [rounds, setRounds] = React.useState(2);
  const [playerType, setPlayerType] = React.useState("pvp");
  const full = !!m && m.sides.length >= 2;
  const allReady = !!m && full && m.sides.every((x) => byId.get(x.entryId)?.status === "ready");
  const base = `/queue/sessions/${s.id}`;

  return (
    <Panel className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg uppercase">
          Текущий матч{m ? ` №${m.number}` : ""}
          {m && <span className="ml-3 text-sm text-muted">{m.status === "live" ? "в эфире" : "подготовка"}</span>}
        </h3>
        <div className="flex flex-wrap gap-2">
          {(!m || m.status === "preparing") && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy || s.paused || full}
              title={s.paused ? "Очередь приостановлена" : full ? "Матч уже собран" : undefined}
              onClick={() => run(`${base}/call`)}
            >
              <span>Вызвать следующего</span>
            </button>
          )}
          {m?.status === "preparing" && (
            <button
              type="button"
              className={`btn btn-sm ${allReady ? "btn-primary" : "btn-ghost"}`}
              disabled={busy || s.paused || !full}
              onClick={() => run(`${base}/match/start`, { force: !allReady, rounds, playerType })}
              title={!full ? "Вызовите второго участника" : allReady ? undefined : "Не все подтвердили готовность - матч создастся, не дожидаясь их"}
            >
              <span>{allReady ? "Создать матч" : "Создать, не дожидаясь"}</span>
            </button>
          )}
          {m?.status === "live" && m.tournamentId && (
            <Link href="/admin/matches" className="btn btn-primary btn-sm">
              <span>Консоль матча →</span>
            </Link>
          )}
          {m?.status === "live" && !m.tournamentId && (
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => run(`${base}/match/finish`)}>
              <span>Завершить матч</span>
            </button>
          )}
          {m && !(m.status === "live" && m.tournamentId) && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(`${base}/match/cancel`)}>
              <span>{m.status === "preparing" ? "Отменить вызов" : "Отменить матч"}</span>
            </button>
          )}
        </div>
      </div>
      {m?.status === "preparing" && full && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-muted">Раундов</span>
            <select className="input h-8 py-0" value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-muted">Игроки</span>
            <select className="input h-8 py-0" value={playerType} onChange={(e) => setPlayerType(e.target.value)}>
              <option value="pvp">PvP</option>
              <option value="pve">PvE</option>
              <option value="pvpve">PvPvE</option>
            </select>
          </label>
          <span className="text-xs text-muted">«Создать матч» делает обычный матч сайта на этих двоих - он сразу становится текущим.</span>
        </div>
      )}
      {m?.status === "live" && m.tournamentId && (
        <p className="text-sm text-muted">Матч сайта идёт: пики-баны, раунды и завершение - в консоли матча. Завершите или отмените его там, очередь продвинется сама.</p>
      )}
      {m ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((n) => {
            const side = m.sides.find((x) => x.side === n);
            const e = side ? byId.get(side.entryId) : undefined;
            return (
              <div key={n} className="space-y-1 border-l-4 border-[var(--border-strong)] bg-surface-2/50 p-3">
                <div className="text-xs text-muted">Сторона {n === 1 ? "A" : "B"}</div>
                {side ? (
                  <>
                    <div className="font-display text-lg uppercase">{side.name}</div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {e && <StatusText e={e} />}
                      {e?.status === "invited" && e.inviteExpiresAt && <Countdown until={e.inviteExpiresAt} serverNow={q.serverNow} />}
                      {e?.status === "invited" && (
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(`${base}/entries/${e.id}/confirm`)}>
                          <span>Подтвердить за игроков</span>
                        </button>
                      )}
                    </div>
                    {e && e.members.length > 1 && (
                      <div className="text-xs text-muted">
                        {e.members.map((x) => `${x.displayName || x.login}${x.ready ? " ✓" : ""}`).join(" · ")}
                      </div>
                    )}
                    {e && (
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
                        {e.members.map((x) => (
                          <MemberStats key={x.userId} m={x} named={e.members.length > 1} />
                        ))}
                        <TodayChip n={e.todayMatches} />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted">ждём вызова</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Матча нет. «Вызвать следующего» приглашает первого в очереди; вызовите двоих, и когда оба подтвердят готовность, нажмите «Создать матч».
        </p>
      )}
    </Panel>
  );
}

/* ---------- Список записей ---------- */

function EntryRow({
  e,
  last,
  snap,
  q,
  busy,
  run,
  move,
}: {
  e: QueueEntry;
  last: number;
  snap: QueueSnapshot;
  q: UseQueue;
  busy: boolean;
  run: (path: string, body?: unknown, method?: "POST" | "DELETE") => void;
  move: (e: QueueEntry, position: number) => void;
}) {
  const s = snap.session!;
  const base = `/queue/sessions/${s.id}/entries/${e.id}`;
  const [pos, setPos] = React.useState("");
  const inMatch = e.status === "invited" || e.status === "ready" || e.status === "performing";
  const matchFull = !!snap.match && snap.match.sides.length >= 2;
  const canCall = (e.status === "waiting" || e.status === "skipped") && !s.paused && snap.match?.status !== "live" && !matchFull;
  const num = Number(pos);
  const posOk = Number.isInteger(num) && num >= 1 && num <= last && num !== e.position;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <span className="w-8 text-center font-display text-xl tabular-nums">{e.position}</span>
      <div className="min-w-0 flex-1 basis-48 space-y-0.5">
        <div className="truncate font-display text-lg uppercase">
          {e.name}
          {e.priority && <span className="ml-2 align-middle text-[0.65rem] normal-case text-primary">без очереди</span>}
          {e.addedByOrganizer && <span className="ml-2 align-middle text-[0.65rem] normal-case text-muted">добавлен вручную</span>}
        </div>
        <div className="flex flex-wrap gap-x-2 text-xs text-muted">
          {e.status === "invited" && e.members.length > 1 && (
            <span>{e.members.map((m) => `${m.displayName || m.login}${m.ready ? " ✓" : ""}`).join(" · ")}</span>
          )}
          <span>
            · MMR {e.mmr} · с {clock(e.joinedAt)}
            {e.performedCount > 0 ? ` · в сессии ${e.performedCount}` : ""}
            {e.skippedCount > 0 ? ` · пропусков ${e.skippedCount}` : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
          {e.members.map((m) => (
            <MemberStats key={m.userId} m={m} named={e.members.length > 1} />
          ))}
          <TodayChip n={e.todayMatches} />
        </div>
      </div>
      <div className="flex min-w-[8rem] flex-col items-start gap-0.5">
        <StatusText e={e} />
        {e.status === "invited" && e.inviteExpiresAt && <Countdown until={e.inviteExpiresAt} serverNow={q.serverNow} />}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {canCall && (
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => run(`/queue/sessions/${s.id}/call`, { entryId: e.id })}>
            <span>Вызвать</span>
          </button>
        )}
        {e.status === "skipped" && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(`${base}/return`, {})}>
            <span>Вернуть</span>
          </button>
        )}
        {e.status !== "performing" && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(`${base}/skip`, { mode: "end" })}>
            <span>{e.status === "invited" ? "Неявка" : "Пропустить"}</span>
          </button>
        )}
        {!inMatch && (
          <>
            <button type="button" className="btn btn-ghost btn-sm" aria-label="Выше" disabled={busy || e.position <= 1} onClick={() => move(e, e.position - 1)}>
              <span>↑</span>
            </button>
            <button type="button" className="btn btn-ghost btn-sm" aria-label="Ниже" disabled={busy || e.position >= last} onClick={() => move(e, e.position + 1)}>
              <span>↓</span>
            </button>
            <form
              className="flex items-center gap-1"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (posOk) {
                  move(e, num);
                  setPos("");
                }
              }}
            >
              <input
                className="input h-8 w-14 px-2 text-center"
                inputMode="numeric"
                placeholder="№"
                aria-label={`Позиция для ${e.name}`}
                value={pos}
                onChange={(ev) => setPos(ev.target.value)}
              />
              <button type="submit" className="btn btn-ghost btn-sm" disabled={busy || !posOk}>
                <span>→</span>
              </button>
            </form>
          </>
        )}
        {e.status !== "performing" && (
          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => run(base, undefined, "DELETE")}>
            <span>Удалить</span>
          </button>
        )}
      </div>
    </li>
  );
}

/* ---------- Добавить вручную ---------- */

function AddEntry({ session, busy, run }: { session: QueueSession; busy: boolean; run: (path: string, body?: unknown) => void }) {
  const [players, setPlayers] = React.useState<MatchPlayer[]>([]);
  const [teams, setTeams] = React.useState<MatchTeam[]>([]);
  const [query, setQuery] = React.useState("");
  const two = session.format === "2x2";

  React.useEffect(() => {
    if (two) api.get<MatchTeam[]>("/match-teams").then(setTeams).catch(() => setTeams([]));
    else api.get<MatchPlayer[]>("/match-players").then(setPlayers).catch(() => setPlayers([]));
  }, [two]);

  const needle = query.trim().toLowerCase();
  const found = two
    ? teams.filter((t) => !needle || t.name.toLowerCase().includes(needle) || t.members.some((m) => (m.displayName || m.login).toLowerCase().includes(needle)))
    : players.filter((p) => !needle || p.login.toLowerCase().includes(needle) || (p.displayName || "").toLowerCase().includes(needle));

  return (
    <Panel className="space-y-3 p-5">
      <h3 className="font-display text-lg uppercase">Добавить {two ? "команду" : "игрока"} вручную</h3>
      <input className="input max-w-sm" placeholder={two ? "Название или ник" : "Ник или логин"} value={query} onChange={(e) => setQuery(e.target.value)} />
      {needle && (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {found.slice(0, 8).map((x) => {
            const t = x as MatchTeam;
            const p = x as MatchPlayer;
            const key = two ? t.teamKey : p.id;
            return (
              <li key={key} className="flex items-center justify-between gap-3 bg-surface-2/50 px-3 py-2">
                <span className="min-w-0 truncate">{two ? t.name : p.displayName || p.login}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => {
                    run(`/queue/sessions/${session.id}/entries`, two ? { teamKey: t.teamKey } : { userId: p.id });
                    setQuery("");
                  }}
                >
                  <span>Добавить</span>
                </button>
              </li>
            );
          })}
          {found.length === 0 && <li className="text-sm text-muted">Никого не нашли.</li>}
        </ul>
      )}
      <p className="text-xs text-muted">Организатор добавляет и при закрытой записи или паузе. Игрок встаёт после тех, кто ещё не выступал.</p>
    </Panel>
  );
}

/* ---------- История ---------- */

function eventText(ev: QueueEvent): string {
  const d = ev.data ?? {};
  let t = EVENT_LABEL[ev.kind] ?? ev.kind;
  if (ev.kind === "move") t += ` с ${String(d.from)} на ${String(d.to)}`;
  if (ev.kind === "invite") t += ` (матч №${String(d.match)})`;
  if ((ev.kind === "skip" || ev.kind === "no_show") && d.mode === "remove") t += ", исключён из сессии";
  if (ev.kind === "match_cancelled" || ev.kind === "match_started" || ev.kind === "match_finished") t += ` №${String(d.match)}`;
  return t;
}

function HistoryPanel({ session, matches }: { session: QueueSession; matches: QueueMatch[] }) {
  const [tab, setTab] = React.useState<"matches" | "events">("matches");
  const [events, setEvents] = React.useState<QueueEvent[] | null>(null);
  const rev = session.rev;
  React.useEffect(() => {
    if (tab !== "events") return;
    api.get<QueueEvent[]>(`/queue/sessions/${session.id}/events`).then(setEvents).catch(() => setEvents([]));
  }, [tab, session.id, rev]);

  return (
    <Panel className="space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-display text-lg uppercase">История сессии</h3>
        <button type="button" className={`btn btn-sm ${tab === "matches" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("matches")}>
          <span>Матчи · {matches.length}</span>
        </button>
        <button type="button" className={`btn btn-sm ${tab === "events" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("events")}>
          <span>Журнал действий</span>
        </button>
      </div>
      {tab === "matches" ? (
        matches.length === 0 ? (
          <p className="text-sm text-muted">Матчей пока не было.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {matches.map((m) => (
              <li key={m.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2 text-sm">
                <b className="w-12">№{m.number}</b>
                <span className="min-w-0 flex-1">{m.sides.map((x) => x.name).join(" vs ") || "без участников"}</span>
                <span className="text-xs text-muted">
                  {m.status === "cancelled" ? "отменён" : "сыгран"} · {dayClock(m.finishedAt ?? m.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : events === null ? (
        <p className="text-sm text-muted">Загружаем…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted">Событий пока нет.</p>
      ) : (
        <ul className="max-h-96 divide-y divide-[var(--border)] overflow-y-auto">
          {events.map((ev) => (
            <li key={ev.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5 text-sm">
              <span className="w-24 font-mono text-xs text-muted">{dayClock(ev.at)}</span>
              <span className="min-w-0 flex-1">
                {ev.label && <b>{ev.label}: </b>}
                {eventText(ev)}
              </span>
              {ev.actor && <span className="text-xs text-muted">{ev.actor}</span>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- Раздел ---------- */

export function QueueManager() {
  const [format, setFormat] = React.useState<QueueFormat>("1x1");
  const q = useQueue({ format });
  const snap = q.snap;
  const s = snap?.session ?? null;
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [settings, setSettings] = React.useState(false);
  const [finishing, setFinishing] = React.useState(false);
  const [sessions, setSessions] = React.useState<QueueSession[]>([]);

  const rev = s?.rev;
  React.useEffect(() => {
    api.get<QueueSession[]>("/queue/sessions").then(setSessions).catch(() => setSessions([]));
  }, [rev, s?.id]);

  const call = React.useCallback(
    async (path: string, body?: unknown, method: "POST" | "PATCH" | "DELETE" = "POST") => {
      setBusy(true);
      setErr("");
      try {
        const next =
          method === "DELETE"
            ? await api.del<QueueSnapshot>(path)
            : method === "PATCH"
              ? await api.patch<QueueSnapshot>(path, body)
              : await api.post<QueueSnapshot>(path, body);
        q.apply(next);
        return true;
      } catch (e) {
        setErr(errorText(e));
        void q.reload(); // порядок мог измениться: показываем актуальный
        return false;
      } finally {
        setBusy(false);
      }
    },
    [q],
  );
  const run = (path: string, body?: unknown, method: "POST" | "DELETE" = "POST") => void call(path, body, method);
  const move = (e: QueueEntry, position: number) =>
    void call(`/queue/sessions/${s!.id}/entries/${e.id}/move`, { position, rev: s!.rev });

  const base = s ? `/queue/sessions/${s.id}` : "";
  const entries = snap?.entries ?? [];

  return (
    <div className="space-y-6">
      <SectionHead
        eyebrow="Кабинет"
        title="Очередь выступлений"
        action={
          <Link href={s ? `/queue?format=${s.format}` : "/queue"} target="_blank" className="btn btn-ghost btn-sm">
            <span>Публичная страница ↗</span>
          </Link>
        }
      />
      <p className="-mt-2 max-w-3xl text-sm text-muted">
        Игроки записываются сами, порядок считается на сервере и сразу виден всем. Первым выступает тот, кто записался раньше; новичок
        встаёт перед теми, кто сегодня уже играл, а сыгравшие матч уходят в конец. Очереди 1×1 и 2×2 идут отдельно.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {(["1x1", "2x2"] as QueueFormat[]).map((f) => {
          const live = snap?.active.find((a) => a.format === f);
          return (
            <button key={f} type="button" className={`btn btn-sm ${format === f ? "btn-primary" : "btn-ghost"}`} onClick={() => setFormat(f)}>
              <span>
                {FORMAT_LABEL[f]}
                {live ? " ●" : ""}
              </span>
            </button>
          );
        })}
        <span className={`ml-2 text-xs ${q.live ? "text-ok" : "text-muted"}`}>{q.live ? "● обновляется сразу" : "○ обновляется по таймеру"}</span>
      </div>

      {err && (
        <p className="text-sm text-danger" role="alert">
          {err}
        </p>
      )}
      {q.error && !snap && <p className="text-sm text-danger">{q.error}</p>}

      {snap && !s && (
        <Panel className="space-y-4 p-5">
          <h3 className="font-display text-lg uppercase">Очередь {FORMAT_LABEL[format]} не открыта</h3>
          <p className="text-sm text-muted">Откройте сессию на стрим: игроки смогут записаться, а вы вызывать их на матчи.</p>
          <SessionForm format={format} busy={busy} onSubmit={(b) => void call("/queue/sessions", b)} />
        </Panel>
      )}

      {snap && s && (
        <>
          <Panel className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-lg uppercase">{s.title}</h3>
                <p className="text-sm text-muted">
                  {FORMAT_LABEL[s.format]} · {STATE_LABEL[s.state]} · в очереди {entries.length} {plural(entries.length, W_PEOPLE)} · сыграно {s.played} · вызов на подтверждение: {s.confirmTimeoutSec} с
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => run(`${base}/mode`, { action: s.registrationOpen ? "close" : "open" })}
                >
                  <span>{s.registrationOpen ? "Закрыть запись" : "Открыть запись"}</span>
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${s.paused ? "btn-primary" : "btn-ghost"}`}
                  disabled={busy}
                  onClick={() => run(`${base}/mode`, { action: s.paused ? "resume" : "pause" })}
                >
                  <span>{s.paused ? "Возобновить" : "Приостановить"}</span>
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSettings((v) => !v)}>
                  <span>Настройки</span>
                </button>
                <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setFinishing(true)}>
                  <span>Завершить сессию</span>
                </button>
              </div>
            </div>
            {settings && (
              <div className="border-t border-[var(--border)] pt-4">
                <SessionForm
                  format={s.format}
                  session={s}
                  canChangeFormat={entries.length === 0 && !snap.match}
                  busy={busy}
                  onSubmit={async (b) => {
                    if (await call(base, b, "PATCH")) setSettings(false);
                  }}
                  onCancel={() => setSettings(false)}
                />
              </div>
            )}
          </Panel>

          <MatchPanel snap={snap} q={q} busy={busy} run={run} />

          {entries.length === 0 ? (
            <EmptyState title="В очереди пока никого" hint="Игроки запишутся на странице «Очередь», либо добавьте их вручную ниже." />
          ) : (
            <Panel className="divide-y divide-[var(--border)] overflow-visible">
              <ol className="divide-y divide-[var(--border)]">
                {entries.map((e) => (
                  <EntryRow key={e.id} e={e} last={entries.length} snap={snap} q={q} busy={busy} run={run} move={move} />
                ))}
              </ol>
            </Panel>
          )}

          <AddEntry session={s} busy={busy} run={(path, body) => void call(path, body)} />
          <HistoryPanel session={s} matches={snap.history} />
        </>
      )}

      {sessions.length > 0 && (
        <Panel className="space-y-3 p-5">
          <h3 className="font-display text-lg uppercase">Последние сессии</h3>
          <ul className="divide-y divide-[var(--border)]">
            {sessions.slice(0, 8).map((x) => (
              <li key={x.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2 text-sm">
                <Link href={x.state === "finished" ? `/queue?session=${x.id}` : `/queue?format=${x.format}`} target="_blank" className="min-w-0 flex-1 font-semibold hover:text-primary">
                  {x.title}
                </Link>
                <span className="text-xs text-muted">
                  {FORMAT_LABEL[x.format]} · {STATE_LABEL[x.state]} · матчей {x.played} · {dayClock(x.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <ConfirmDialog
        open={finishing}
        title="Завершить сессию?"
        message="Очередь закроется, история и порядок останутся для просмотра. Новая сессия начнётся с пустой очереди."
        confirmLabel="Завершить"
        danger
        busy={busy}
        onCancel={() => setFinishing(false)}
        onConfirm={async () => {
          setFinishing(false);
          await call(`${base}/finish`);
        }}
      />
    </div>
  );
}
