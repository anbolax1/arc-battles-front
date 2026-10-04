"use client";

import * as React from "react";
import { Panel } from "@/components/ui/card";
import { CheckIcon } from "@/components/icons";
import {
  loadoutLabel,
  manualPoints,
  roundScore,
  taskDescription,
  taskKindLabel,
  taskTitle,
  totalScore,
} from "@/lib/match";
import type { CatalogLegendary, MatchState, Participant, RoundBonusTask } from "@/lib/types";

/** Ручные очки стороны: +3 - за нок другого рейдера, ±1 - поправка. */
const QUICK_POINTS: Array<{ delta: number; label: string; text: string }> = [
  { delta: -1, label: "−1", text: "поправка" },
  { delta: 1, label: "+1", text: "ручные очки" },
  { delta: 3, label: "+3 нок рейдера", text: "нок рейдера" },
];

const KIND_STYLE: Record<string, string> = {
  Задание: "bg-[rgba(255,106,26,0.16)] text-primary-2 shadow-[inset_0_0_0_1px_rgba(255,106,26,0.35)]",
  "На карту": "bg-[rgba(34,211,238,0.12)] text-accent shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]",
  Протокол: "bg-[rgba(192,38,211,0.14)] text-[#e070ff] shadow-[inset_0_0_0_1px_rgba(192,38,211,0.34)]",
};

function TaskRow({
  t,
  owner,
  opponent,
  busy,
  onMark,
  onReroll,
}: {
  t: RoundBonusTask;
  owner: Participant;
  opponent: Participant | null;
  busy: boolean;
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
            {byOwner ? `Выполнил ${owner.name} · +${t.points}` : `Выполнил соперник ${opponent?.name ?? ""} · +1 ему`}
          </span>
          <button
            type="button"
            className="ml-auto min-h-[44px] px-2 text-sm text-muted underline transition hover:text-fg"
            disabled={busy}
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
            disabled={busy}
            onClick={() => onMark(t.id, "owner")}
          >
            <CheckIcon />
            <span>Своё +{t.points}</span>
          </button>
          {t.category !== "protocol" && (
            <button type="button" className="btn btn-cyan btn-sm min-h-[44px]" disabled={busy} onClick={() => onMark(t.id, "opponent")}>
              <span>Соперник +1</span>
            </button>
          )}
          <button
            type="button"
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-md bg-surface text-muted transition hover:text-fg"
            disabled={busy}
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

export function RoundConsole({
  st,
  sides,
  legendary,
  focusId,
  busy,
  onFocus,
  onMark,
  onReroll,
  onPoints,
  onLegendary,
  onUndo,
}: {
  st: MatchState;
  sides: [Participant | null, Participant | null];
  legendary: CatalogLegendary[];
  focusId: string | null;
  busy: boolean;
  onFocus: (participantId: string) => void;
  onMark: (id: string, by: "owner" | "opponent" | "none") => void;
  onReroll: (id: string) => void;
  onPoints: (participantId: string, delta: number, label: string) => void;
  onLegendary: (legendaryId: string, participantId: string) => void;
  onUndo: () => void;
}) {
  const [legFor, setLegFor] = React.useState<string | null>(null);
  const round = st.currentRound || 1;
  const rounds = [...(st.tournament.rounds ?? [])].sort((a, b) => a.number - b.number);
  const [a, b] = sides;
  const available = legendary.filter((l) => l.status === "available");

  return (
    <div className="space-y-4">
      <Panel className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="truncate font-display text-xl uppercase text-primary-2">{a?.name}</span>
          </div>
          <div className="flex items-center gap-3 font-display text-5xl leading-none tnum" aria-label="Счёт матча">
            <span className="text-primary-2">{totalScore(st, a?.id)}</span>
            <span className="text-2xl text-muted">:</span>
            <span className="text-accent">{totalScore(st, b?.id)}</span>
          </div>
          <div className="flex min-w-0 flex-1 justify-end">
            <span className="truncate font-display text-xl uppercase text-accent">{b?.name}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rounds.map((r) => {
            const now = r.number === round;
            return (
              <div
                key={r.id}
                className={`flex flex-wrap items-center gap-x-2.5 gap-y-0.5 rounded-md px-3 py-2 ${
                  now ? "bg-[rgba(255,106,26,0.12)] shadow-[inset_0_0_0_1px_rgba(255,106,26,0.45)]" : "bg-surface-2 shadow-[inset_0_0_0_1px_var(--border)]"
                }`}
              >
                <span className={`font-display text-[0.68rem] uppercase ${now ? "text-primary-2" : "text-muted"}`}>
                  Раунд {r.number}
                  {now ? " · идёт" : r.status === "finished" ? " · сыгран" : ""}
                </span>
                <span className="text-sm">{r.map || "—"}</span>
                <span className="text-xs text-muted">{loadoutLabel(r.number)}</span>
                <span className="font-display text-sm tnum">
                  {r.status === "pending" ? "—" : `${roundScore(st, r.number, a?.id)} : ${roundScore(st, r.number, b?.id)}`}
                </span>
              </div>
            );
          })}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="field-label">В рейде</span>
            <div className="seg">
              {sides.map((p) =>
                p ? (
                  <button key={p.id} type="button" className="seg-btn" aria-pressed={focusId === p.id} disabled={busy} onClick={() => onFocus(p.id)}>
                    <span>{p.name}</span>
                  </button>
                ) : null,
              )}
            </div>
            <span className="text-xs text-muted">только для оверлея</span>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        {sides.map((p, i) => {
          if (!p) return null;
          const opp = sides[1 - i];
          const accent = i === 0 ? "border-t-[var(--primary)]" : "border-t-[var(--accent)]";
          const tasks = st.tasks.filter((t) => t.roundNumber === round && t.participantId === p.id);
          const score = roundScore(st, round, p.id);
          const manual = manualPoints(st, round, p.id);
          return (
            <Panel key={p.id} className={`space-y-3 border-t-[3px] p-4 ${accent}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg uppercase">
                  {p.name} <span className="text-sm text-muted">{i === 0 ? "A" : "B"}</span>
                </h3>
                <span className="text-sm text-muted">
                  в раунде: <span className={`font-display text-lg ${i === 0 ? "text-primary-2" : "text-accent"}`}>{score}</span>
                  {manual > 0 && <span className="ml-1 text-xs">(ручные {manual})</span>}
                </span>
              </div>
              {tasks.length ? (
                tasks.map((t) => (
                  <TaskRow key={t.id} t={t} owner={p} opponent={opp} busy={busy} onMark={onMark} onReroll={onReroll} />
                ))
              ) : (
                <p className="text-sm text-muted">Задания раунда не выданы — пул каталога пуст для этой карты и типа игроков.</p>
              )}
              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
                <span className="field-label mr-1">Ручные очки</span>
                {QUICK_POINTS.map((q) => (
                  <button
                    key={q.delta}
                    type="button"
                    className="btn btn-ghost btn-sm min-h-[44px]"
                    disabled={busy || (q.delta < 0 && manual <= 0)}
                    onClick={() => onPoints(p.id, q.delta, q.text)}
                  >
                    <span>{q.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-sm ml-auto min-h-[44px] text-gold [&::before]:bg-[rgba(255,197,61,0.08)] [&::before]:shadow-[inset_0_0_0_1px_rgba(255,197,61,0.45)]"
                  aria-expanded={legFor === p.id}
                  disabled={busy}
                  onClick={() => setLegFor((x) => (x === p.id ? null : p.id))}
                >
                  <span>Легендарка +10</span>
                </button>
              </div>
              {legFor === p.id && (
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
                            disabled={busy}
                            onClick={() => {
                              onLegendary(l.id, p.id);
                              setLegFor(null);
                            }}
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
              )}
            </Panel>
          );
        })}
      </div>

      <Panel className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base uppercase">Журнал матча</h3>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !st.log.length} onClick={onUndo}>
            <span>↶ Отменить последнее</span>
          </button>
        </div>
        {st.log.length ? (
          <ol className="space-y-1.5">
            {st.log.slice(0, 10).map((e) => (
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
    </div>
  );
}
