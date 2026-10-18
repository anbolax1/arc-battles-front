import * as React from "react";
import type { LiveBonus, TaskTag } from "@/lib/types";
import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";
import "./tasks-v2-widget.css";

const MAX_ROWS = 8;

const TAG_LABELS: Record<TaskTag, string> = { normal: "Обычное", timed: "На время" };

type Row = { label: string; tag: TaskTag; points: number; done: boolean; text: string };

/** Строка блока; задание без тега или с тегом, которого виджет ещё не знает, - «обычное». */
function toRow(r: { tag?: string; label?: string; points: number; done: boolean; text: string }): Row {
  const tag: TaskTag = r.tag === "timed" ? "timed" : "normal";
  return { ...r, tag, label: r.label ?? TAG_LABELS[tag] };
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden>
      <path d="M2.5 8.5l4 4 7-8.5" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

/** Виджет «Задания V2»: протоколы, задания и основные задания стороны в рейде одним блоком, у каждого свой тег.
    По опции показываются и задания соперника за +1. */
export function TasksV2Widget({ state, instance }: WidgetProps) {
  const bonus = (b: LiveBonus) => toRow({ tag: b.tag, label: b.opponent ? "Чужое" : undefined, points: b.points, done: b.times > 0, text: b.text });
  const all: Row[] = [
    ...(state.complications ?? [])
      .filter((c) => c.reward) // протокол-штраф старого пульта остаётся в виджете «Протоколы»
      .map((c) => toRow({ tag: c.tag, points: c.reward ?? 0, done: !!c.done, text: c.text })),
    ...(state.bonusTasks ?? []).filter((b) => !b.opponent).map(bonus),
    ...(state.roundTasks ?? []).map((t) => toRow({ points: t.points, done: t.completed, text: t.text })),
    // задания соперника - после всего, что выполняет сторона в рейде
    ...(instance.showOpponentContracts ? (state.bonusTasks ?? []).filter((b) => b.opponent).map(bonus) : []),
  ];
  if (!all.length) return null;
  const rows = all.slice(0, MAX_ROWS);
  const rest = all.length - rows.length;
  return (
    <WidgetFrame instance={instance} className="tw-panel">
      <div className="tw-list">
        {rows.map((r, i) => (
          <React.Fragment key={i}>
            <span className="tw-kind">{r.label}</span>
            <span className={`tw-pts tw-pts-${r.tag}`}>{r.done ? <Check /> : `+${r.points}`}</span>
            <span className="tw-text">{r.text}</span>
          </React.Fragment>
        ))}
        {rest > 0 && <span className="tw-more">+{rest} ещё</span>}
      </div>
    </WidgetFrame>
  );
}
