import * as React from "react";
import type { LiveBonus, TaskTag } from "@/lib/types";
import { taskBadge } from "@/lib/task-meta";
import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";
import "./tasks-v2-widget.css";

const MAX_ROWS = 8;

type Row = { label: string; color: string; ink: string; tag: TaskTag; points: number; done: boolean; text: string };

/** Строка блока: плашка - «На время» или редкость своим цветом. Задание без тега и редкости - «Обычное». */
function toRow(r: { tag?: string; rarity?: string; points: number; done: boolean; text: string }): Row {
  const tag: TaskTag = r.tag === "timed" ? "timed" : "normal";
  const badge = taskBadge(r);
  return { label: badge.label, color: badge.color, ink: badge.ink, tag, points: r.points, done: r.done, text: r.text };
}

/** Знак в квадрате слева: плюс - задание выполнено, минус - ещё нет. Знак 13px в поле 14px:
    чётный размер браузер ставит точно по центру квадрата, нечётный сдвигает на полпикселя. */
function Mark({ done }: { done: boolean }) {
  return (
    <span className="tw-mark">
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden>
        <path d={done ? "M4.5.5h5v4h4v5h-4v4h-5v-4h-4v-5h4z" : "M.5 5h13v4H.5z"} fill="currentColor" />
      </svg>
    </span>
  );
}

/** Виджет «Задания V2»: задания стороны в рейде одним блоком, у каждого плашка - «На время» или редкость.
    Задания соперника не показываются: выполнить их нельзя. */
export function TasksV2Widget({ state, instance }: WidgetProps) {
  const bonus = (b: LiveBonus) => toRow({ tag: b.tag, rarity: b.rarity, points: b.points, done: b.times > 0, text: b.text });
  const all: Row[] = [
    ...(state.complications ?? [])
      .filter((c) => c.reward) // протокол-штраф старого пульта остаётся в виджете «Протоколы»
      .map((c) => toRow({ tag: c.tag, rarity: c.rarity, points: c.reward ?? 0, done: !!c.done, text: c.text })),
    // Задания на карту пока отключены: в виджете их нет
    ...(state.bonusTasks ?? []).filter((b) => !b.opponent && b.category !== "map").map(bonus),
    ...(state.roundTasks ?? []).map((t) => toRow({ points: t.points, done: t.completed, text: t.text })),
  ];
  if (!all.length) return null;
  const rows = all.slice(0, MAX_ROWS);
  const rest = all.length - rows.length;
  const theme = instance.props?.theme === "light" ? "light" : "dark";
  return (
    <WidgetFrame instance={instance} className={`tw-panel tw-${theme}`}>
      {!instance.hideTitle && (
        <div className="tw-head">
          <span>Задания раунда</span>
        </div>
      )}
      <div className="tw-box">
        <div className="tw-list">
          {rows.map((r, i) => (
            <React.Fragment key={i}>
              <Mark done={r.done} />
              <span className="tw-kind" style={{ background: r.color, color: r.ink }}>
                {r.label}
              </span>
              <span className={`tw-pts tw-pts-${r.tag}`}>+{r.points}</span>
              <span className="tw-text">{r.text}</span>
            </React.Fragment>
          ))}
          {rest > 0 && <span className="tw-more">+{rest} ещё</span>}
        </div>
      </div>
    </WidgetFrame>
  );
}
