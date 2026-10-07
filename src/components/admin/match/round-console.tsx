"use client";

import * as React from "react";
import { Panel } from "@/components/ui/card";
import { CheckIcon } from "@/components/icons";
import {
  CROSS_POINTS,
  KNOCK_POINTS,
  loadoutLabel,
  roundBreakdown,
  roundScore,
  taskDescription,
  taskKindLabel,
  taskTitle,
  totalScore,
  type RoundBreakdown,
} from "@/lib/match";
import type { CatalogLegendary, MatchLogEntry, MatchState, Participant, Round, RoundBonusTask } from "@/lib/types";

/** Цвета сторон как на табло: A - оранжевая, B - бирюзовая. */
const SIDE_STYLE = [
  {
    letter: "A",
    text: "text-primary-2",
    edge: "border-t-[var(--primary)]",
    tag: "pts-orange",
    knock: "text-primary-2 [&::before]:bg-[rgba(255,106,26,0.1)] [&::before]:shadow-[inset_0_0_0_1px_rgba(255,106,26,0.55)]",
  },
  {
    letter: "B",
    text: "text-accent",
    edge: "border-t-[var(--accent)]",
    tag: "pts-cyan",
    knock: "text-accent [&::before]:bg-[rgba(34,211,238,0.08)] [&::before]:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.55)]",
  },
] as const;

const KIND_STYLE: Record<string, string> = {
  Задание: "bg-[rgba(255,106,26,0.16)] text-primary-2 shadow-[inset_0_0_0_1px_rgba(255,106,26,0.35)]",
  "На карту": "bg-[rgba(34,211,238,0.12)] text-accent shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]",
  Протокол: "bg-[rgba(192,38,211,0.14)] text-[#e070ff] shadow-[inset_0_0_0_1px_rgba(192,38,211,0.34)]",
};

function SideTag({ i }: { i: 0 | 1 }) {
  return (
    <span className={`pts ${SIDE_STYLE[i].tag}`}>
      <span>{SIDE_STYLE[i].letter}</span>
    </span>
  );
}

/** Связь с оверлеем: без неё зрители не видят того, что меняется в пульте. */
export function OverlayStatus({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className={`h-2 w-2 flex-none rounded-full ${online ? "bg-ok" : "bg-danger"}`} aria-hidden />
      {online ? "Оверлей на связи" : "Оверлей не на связи"}
    </span>
  );
}

function RoundCard({ st, r, now, sides }: { st: MatchState; r: Round; now: boolean; sides: [Participant | null, Participant | null] }) {
  const [a, b] = sides;
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-md px-3.5 py-2.5 ${
        now ? "bg-[rgba(255,106,26,0.12)] shadow-[inset_0_0_0_1px_rgba(255,106,26,0.45)]" : "bg-surface-2 shadow-[inset_0_0_0_1px_var(--border)]"
      }`}
    >
      <div className="min-w-0">
        <div className={`font-display text-[0.68rem] uppercase ${now ? "text-primary-2" : "text-muted"}`}>
          Раунд {r.number}
          {now ? " · идёт" : r.status === "finished" ? " · сыгран" : " · впереди"}
        </div>
        <div className="truncate text-sm">
          {r.map || "—"} <span className="text-xs text-muted">· {loadoutLabel(r.number)}</span>
        </div>
      </div>
      <span className={`flex-none font-display text-lg tnum ${r.status === "pending" ? "text-muted" : ""}`}>
        {r.status === "pending" ? "—" : `${roundScore(st, r.number, a?.id)} : ${roundScore(st, r.number, b?.id)}`}
      </span>
    </div>
  );
}

function TaskRow({
  t,
  owner,
  opponent,
  onMark,
  onReroll,
}: {
  t: RoundBonusTask;
  owner: Participant;
  opponent: Participant | null;
  onMark: (id: string, by: "owner" | "opponent" | "none") => void;
  onReroll: (id: string) => void;
}) {
  const kind = taskKindLabel(t);
  const byOwner = t.completedBy === t.participantId;
  const byOpp = !!t.completedBy && !byOwner;
  const desc = taskDescription(t);
  return (
    <div
      className={`space-y-2.5 rounded-md p-3 ${
        byOwner
          ? "bg-[rgba(52,211,153,0.08)] shadow-[inset_0_0_0_1px_rgba(52,211,153,0.4)]"
          : byOpp
            ? "bg-[rgba(34,211,238,0.07)] shadow-[inset_0_0_0_1px_rgba(34,211,238,0.4)]"
            : "bg-surface-2 shadow-[inset_0_0_0_1px_var(--border)]"
      }`}
    >
      <div className="flex flex-wrap items-start gap-x-2.5 gap-y-1.5">
        <span className={`badge ${KIND_STYLE[kind]}`}>
          <span>
            {kind} · {t.points}
            {t.category === "protocol" ? " · до 15:00" : ""}
          </span>
        </span>
        <div className="min-w-[200px] flex-1">
          <div className="text-[0.95rem] font-semibold leading-snug">«{taskTitle(t)}»</div>
          {desc && <div className="text-sm text-muted">{desc}</div>}
        </div>
      </div>
      {t.completedBy ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${byOwner ? "text-ok" : "text-accent"}`}>
            <CheckIcon className="h-4 w-4" />
            {byOwner ? `Выполнил ${owner.name} · +${t.points}` : `Выполнил соперник ${opponent?.name ?? ""} · +${CROSS_POINTS} ему`}
          </span>
          <button
            type="button"
            className="ml-auto min-h-[44px] px-2 text-sm text-muted underline transition hover:text-fg"
            onClick={() => onMark(t.id, "none")}
          >
            Отменить
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-sm min-h-[44px] text-ok [&::before]:bg-[rgba(52,211,153,0.12)] [&::before]:shadow-[inset_0_0_0_1px_rgba(52,211,153,0.5)]"
            onClick={() => onMark(t.id, "owner")}
          >
            <CheckIcon />
            <span>Своё +{t.points}</span>
          </button>
          {t.category !== "protocol" && (
            <button type="button" className="btn btn-cyan btn-sm min-h-[44px]" onClick={() => onMark(t.id, "opponent")}>
              <span>Соперник +{CROSS_POINTS}</span>
            </button>
          )}
          <button
            type="button"
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-md bg-surface text-muted transition hover:text-fg"
            onClick={() => onReroll(t.id)}
            title="Перебросить задание"
            aria-label={`Перебросить задание «${taskTitle(t)}»`}
          >
            ↻
          </button>
        </div>
      )}
    </div>
  );
}

/** Из чего сложились очки стороны в раунде, кроме ноков; ручные правятся прямо здесь, на месте своего числа. */
function ScoreParts({
  parts,
  onManual,
}: {
  parts: RoundBreakdown;
  onManual: (delta: number, label: string) => void;
}) {
  const num = (v: number) => <span className={`font-display text-xl leading-none tnum ${v ? "" : "text-muted"}`}>{v}</span>;
  const step =
    "flex h-8 w-8 items-center justify-center rounded-md bg-surface text-lg leading-none text-muted transition hover:text-fg disabled:cursor-not-allowed disabled:opacity-30";
  const cells: Array<{ label: string; hint?: string; value: React.ReactNode }> = [
    { label: "Задания", hint: "Свои задания стороны", value: num(parts.tasks) },
    { label: "Чужие", hint: `Задания соперника, которые выполнила эта сторона: +${CROSS_POINTS} за каждое`, value: num(parts.cross) },
    {
      label: "Ручные",
      value: (
        <span className="flex items-center gap-1" role="group" aria-label="Поправка ручных очков">
          <button
            type="button"
            className={step}
            disabled={parts.manual <= 0}
            onClick={() => onManual(-1, "поправка")}
            title={parts.manual > 0 ? "Убрать 1 ручное очко" : "Ручных очков нет - убирать нечего"}
            aria-label="Убрать 1 ручное очко"
          >
            −
          </button>
          <span className="w-7 text-center">{num(parts.manual)}</span>
          <button type="button" className={step} onClick={() => onManual(1, "ручные очки")} aria-label="Добавить 1 ручное очко">
            +
          </button>
        </span>
      ),
    },
    { label: "Легендарка", hint: "Легендарные контракты в этом раунде", value: num(parts.legendary) },
  ];

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className="flex flex-col items-center rounded-md bg-surface-2 px-1 py-2 shadow-[inset_0_0_0_1px_var(--border)]" title={c.hint}>
          <span className="field-label">{c.label}</span>
          <span className="flex h-8 items-center">{c.value}</span>
        </div>
      ))}
    </div>
  );
}

function LegendaryPicker({
  available,
  onPick,
}: {
  available: CatalogLegendary[];
  onPick: (legendaryId: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-md bg-[rgba(255,197,61,0.06)] p-3 shadow-[inset_0_0_0_1px_rgba(255,197,61,0.25)]">
      <span className="field-label text-gold">Легендарные — +10, один раз навсегда</span>
      {available.length ? (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {available.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2">
              <span className="min-w-[200px] flex-1 text-sm">{l.text}</span>
              <button
                type="button"
                className="btn btn-sm text-gold [&::before]:shadow-[inset_0_0_0_1px_rgba(255,197,61,0.45)]"
                onClick={() => onPick(l.id)}
              >
                <span>Засчитать</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Доступных легендарок не осталось.</p>
      )}
    </div>
  );
}

/** Журнал матча: последние действия ведущего, последнее можно отменить. */
export function MatchLog({ log, onUndo }: { log: MatchLogEntry[]; onUndo: () => void }) {
  return (
    <Panel className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-base uppercase">Журнал матча</h3>
        <button type="button" className="btn btn-ghost btn-sm" disabled={!log.length} onClick={onUndo}>
          <span>↶ Отменить последнее</span>
        </button>
      </div>
      {log.length ? (
        <ol className="space-y-1.5">
          {log.slice(0, 10).map((e) => (
            <li key={e.id} className="flex items-center gap-3 text-sm">
              <span className="chip py-0.5 text-[0.68rem]">Р{e.roundNumber}</span>
              <span className="min-w-0 flex-1">{e.text}</span>
              <span className={`font-display tnum ${e.delta > 0 ? "text-ok" : e.delta < 0 ? "text-danger" : "text-muted"}`}>
                {e.delta > 0 ? `+${e.delta}` : e.delta < 0 ? `−${Math.abs(e.delta)}` : "·"}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">Пока пусто — здесь появятся зачёты, ручные очки и легендарки.</p>
      )}
    </Panel>
  );
}

/** Идущий раунд: табло с ходом матча и панели сторон с очками и заданиями. */
export function RoundConsole({
  st,
  sides,
  legendary,
  focusId,
  online,
  saving,
  actions,
  onFocus,
  onMark,
  onReroll,
  onKnock,
  onPoints,
  onLegendary,
}: {
  st: MatchState;
  sides: [Participant | null, Participant | null];
  legendary: CatalogLegendary[];
  focusId: string | null;
  online: boolean;
  /** Есть запросы, на которые сервер ещё не ответил. */
  saving: boolean;
  /** Кнопки хода матча: следующий раунд, завершение, отмена. */
  actions: React.ReactNode;
  onFocus: (participantId: string) => void;
  onMark: (id: string, by: "owner" | "opponent" | "none") => void;
  onReroll: (id: string) => void;
  onKnock: (participantId: string, delta: 1 | -1) => void;
  onPoints: (participantId: string, delta: number, label: string) => void;
  onLegendary: (legendaryId: string, participantId: string) => void;
}) {
  const [legFor, setLegFor] = React.useState<string | null>(null);
  const round = st.currentRound || 1;
  const rounds = [...(st.tournament.rounds ?? [])].sort((a, b) => a.number - b.number);
  const [a, b] = sides;
  const available = legendary.filter((l) => l.status === "available");

  return (
    <div className="space-y-4">
      <Panel>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-5 pb-4 pt-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <SideTag i={0} />
            <span className="truncate font-display text-xl uppercase text-primary-2 sm:text-2xl">{a?.name ?? "—"}</span>
          </div>
          <div className="flex items-center gap-3 font-display text-5xl leading-none tnum" aria-label="Счёт матча">
            <span className="text-primary-2">{totalScore(st, a?.id)}</span>
            <span className="text-2xl text-muted">:</span>
            <span className="text-accent">{totalScore(st, b?.id)}</span>
          </div>
          <div className="flex min-w-0 flex-row-reverse items-center gap-2.5">
            <SideTag i={1} />
            <span className="truncate font-display text-xl uppercase text-accent sm:text-2xl">{b?.name ?? "—"}</span>
          </div>
        </div>

        <div className={`grid gap-2 px-5 pb-5 ${rounds.length > 2 ? "md:grid-cols-3" : "sm:grid-cols-2"}`}>
          {rounds.map((r) => (
            <RoundCard key={r.id} st={st} r={r} now={r.number === round} sides={sides} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[var(--border)] bg-surface-2/50 px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="field-label">Оверлей показывает рейд</span>
            <div className="seg">
              {sides.map((p) =>
                p ? (
                  <button key={p.id} type="button" className="seg-btn" aria-pressed={focusId === p.id} onClick={() => onFocus(p.id)}>
                    <span>{p.name}</span>
                  </button>
                ) : null,
              )}
            </div>
            <OverlayStatus online={online} />
            {/* Проявляется с задержкой: быстрый ответ сервера её не покажет, и панель не мигает на каждый клик. */}
            <span
              aria-hidden
              className={`text-xs text-muted transition-opacity ${saving ? "opacity-100 delay-500 duration-300" : "opacity-0 duration-0"}`}
            >
              Сохраняем…
            </span>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{actions}</div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        {sides.map((p, i) => {
          if (!p) return null;
          const side = i === 0 ? 0 : 1;
          const style = SIDE_STYLE[side];
          const opp = sides[1 - i];
          const tasks = st.tasks.filter((t) => t.roundNumber === round && t.participantId === p.id);
          const done = tasks.filter((t) => t.completedBy === p.id).length;
          const parts = roundBreakdown(st, round, p.id);
          return (
            <Panel key={p.id} className={`flex flex-col border-t-[3px] ${style.edge}`}>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5 pt-1">
                    <SideTag i={side} />
                    <h3 className="truncate font-display text-lg uppercase">{p.name}</h3>
                  </div>
                  <div className="flex-none text-right">
                    <span className="field-label">Раунд {round}</span>
                    <div className={`font-display text-4xl leading-none tnum ${style.text}`}>{roundScore(st, round, p.id)}</div>
                  </div>
                </div>
                <ScoreParts parts={parts} onManual={(delta, label) => onPoints(p.id, delta, label)} />
                {/* Отступ справа - под скос кнопки, чтобы её угол не вылезал за край плиток с очками. */}
                <div className="flex items-center gap-3 pr-1.5">
                  <button
                    type="button"
                    className="flex h-11 w-11 flex-none items-center justify-center rounded-md bg-surface-2 text-lg text-muted shadow-[inset_0_0_0_1px_var(--border)] transition hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                    disabled={parts.knocks <= 0}
                    onClick={() => onKnock(p.id, -1)}
                    title={parts.knocks > 0 ? "Снять ошибочный нок" : "Ноков нет - снимать нечего"}
                    aria-label="Снять нок"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className={`btn min-h-[44px] flex-1 ${style.knock}`}
                    onClick={() => onKnock(p.id, 1)}
                    title={`Нок рейдера: +${KNOCK_POINTS} очка`}
                  >
                    <span>Нок{parts.knocks > 0 ? ` · ${parts.knocks}` : ""}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 border-t border-[var(--border)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="field-label">Задания раунда</span>
                  {tasks.length > 0 && (
                    <span className="text-xs text-muted tnum">
                      выполнено {done} из {tasks.length}
                    </span>
                  )}
                </div>
                {tasks.length ? (
                  tasks.map((t) => (
                    <TaskRow key={t.id} t={t} owner={p} opponent={opp} onMark={onMark} onReroll={onReroll} />
                  ))
                ) : (
                  <p className="text-sm text-muted">Задания раунда не выданы — пул каталога пуст для этой карты и типа игроков.</p>
                )}
              </div>

              <div className="mt-auto space-y-3 border-t border-[var(--border)] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="btn btn-sm min-h-[44px] text-gold [&::before]:bg-[rgba(255,197,61,0.08)] [&::before]:shadow-[inset_0_0_0_1px_rgba(255,197,61,0.45)]"
                    aria-expanded={legFor === p.id}
                    onClick={() => setLegFor((x) => (x === p.id ? null : p.id))}
                  >
                    <span>Легендарка +10</span>
                  </button>
                  <span className="text-xs text-muted">легендарный контракт: один раз за всё время</span>
                </div>
                {legFor === p.id && (
                  <LegendaryPicker
                    available={available}
                    onPick={(id) => {
                      onLegendary(id, p.id);
                      setLegFor(null);
                    }}
                  />
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
