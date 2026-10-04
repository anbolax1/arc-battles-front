"use client";

import * as React from "react";
import { Panel } from "@/components/ui/card";
import { fmtDate, fmtTime } from "@/lib/format";
import { roundsLabel } from "@/lib/match";
import type { MatchState, Participant, VetoStep } from "@/lib/types";

/** Время матча в формате поля datetime-local (по часам ведущего). */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function stepText(s: VetoStep): string {
  if (s.action === "ban") return `бан ${s.side}`;
  if (s.action === "pick") return `пик ${s.side}`;
  return "остаток";
}

/** Запланированный шоу-матч: когда начнётся, кто играет; отсюда его выводят в эфир или переносят. */
export function ScheduledPanel({
  st,
  sides,
  busy,
  onStart,
  onReschedule,
  onCancel,
}: {
  st: MatchState;
  sides: [Participant | null, Participant | null];
  busy: boolean;
  onStart: () => void;
  onReschedule: (iso: string) => void;
  onCancel: () => void;
}) {
  const t = st.tournament;
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(() => toLocalInput(t.startsAt));
  const [a, b] = sides;

  return (
    <Panel glow className="space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <span className="field-label">Начало</span>
          <div className="font-display text-2xl uppercase">
            {fmtDate(t.startsAt)} · <span className="tnum">{fmtTime(t.startsAt)}</span> МСК
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => {
              setValue(toLocalInput(t.startsAt));
              setEditing(true);
            }}
          >
            <span>Перенести</span>
          </button>
        )}
      </div>

      {editing && (
        <div className="flex flex-wrap items-center gap-3">
          <input type="datetime-local" className="input" value={value} onChange={(e) => setValue(e.target.value)} />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy || !value}
            onClick={() => {
              onReschedule(new Date(value).toISOString());
              setEditing(false);
            }}
          >
            <span>Сохранить</span>
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
            <span>Отмена</span>
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {[a, b].map((p, i) => (
          <div key={i} className="rounded-md bg-surface-2 px-4 py-3 shadow-[inset_0_0_0_1px_var(--border)]">
            <div className={`font-display text-xs uppercase ${i === 0 ? "text-primary-2" : "text-accent"}`}>
              Сторона {i === 0 ? "A" : "B"}
            </div>
            <div className="truncate font-display text-xl uppercase">{p?.name ?? "—"}</div>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted">
        {roundsLabel(t.rounds?.length ?? t.totalRounds)}. Пики-баны: {st.vetoOrder.map(stepText).join(" → ")}. В расписании
        на сайте матч уже виден.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={onStart}>
          <span>Начать шоу-матч →</span>
        </button>
        <span className="min-w-0 flex-1 text-xs text-muted">Матч станет текущим: появится на главной и в оверлее.</span>
        <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={onCancel}>
          <span>Отменить матч</span>
        </button>
      </div>
    </Panel>
  );
}
