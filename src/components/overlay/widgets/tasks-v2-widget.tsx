import * as React from "react";
import type { LiveBonus } from "@/lib/types";
import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";
import "./tasks-v2-widget.css";

const MAX_ROWS = 8;

type Row = { kind: string; points: number; done: boolean; protocol?: boolean; text: string };

function taskKind(b: LiveBonus, mapTag: boolean): string {
  if (b.opponent) return "Чужое";
  return mapTag && b.category === "map" ? "На карту" : "Обычное";
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden>
      <path d="M2.5 8.5l4 4 7-8.5" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

/** Виджет «Задания V2»: протокол и задания стороны в рейде одним блоком, по опции - и задания соперника за +1. */
export function TasksV2Widget({ state, instance }: WidgetProps) {
  const protocols: Row[] = (state.complications ?? [])
    .filter((c) => c.reward) // протокол-штраф старого пульта остаётся в виджете «Протоколы»
    .map((c) => ({ kind: "На время", points: c.reward ?? 0, done: !!c.done, protocol: true, text: c.text }));
  const tasks: Row[] = (state.bonusTasks ?? [])
    .filter((b) => instance.showOpponentContracts || !b.opponent)
    .map((b) => ({ kind: taskKind(b, !!instance.showTags), points: b.points, done: b.times > 0, text: b.text }));
  const all = [...protocols, ...tasks];
  if (!all.length) return null;
  const rows = all.slice(0, MAX_ROWS);
  const rest = all.length - rows.length;
  return (
    <WidgetFrame instance={instance} className="tw-panel">
      <div className="tw-list">
        {rows.map((r, i) => (
          <React.Fragment key={i}>
            <span className="tw-kind">{r.kind}</span>
            <span className={`tw-pts ${r.protocol ? "tw-pts-protocol" : ""}`}>{r.done ? <Check /> : `+${r.points}`}</span>
            <span className="tw-text">{r.text}</span>
          </React.Fragment>
        ))}
        {rest > 0 && <span className="tw-more">+{rest} ещё</span>}
      </div>
    </WidgetFrame>
  );
}
