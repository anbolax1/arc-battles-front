import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

const MAX_ROWS = 8;

/** Виджет «Задания»: задания стороны в рейде. По опции показываются и задания соперника,
    за которые можно получить +1. Выполненные выделяются галочкой и фоном. */
export function BonusTasksWidget({ state, instance }: WidgetProps) {
  const all = (state.bonusTasks ?? []).filter((b) => instance.showOpponentContracts || !b.opponent);
  const rows = all.slice(0, MAX_ROWS);
  const rest = all.length - rows.length;
  if (!all.length) return null;
  return (
    <WidgetFrame instance={instance}>
      <div className="flex h-full flex-col">
        {!instance.hideTitle && <div className="ov-fill-2 px-4 py-1.5 font-display text-xs uppercase tracking-[0.2em] text-muted">Задания</div>}
        <ul className="flex flex-1 flex-col gap-1 px-3 py-2">
          {rows.map((b, i) => {
            const done = b.times > 0;
            return (
              <li
                key={i}
                className={`flex items-center justify-between gap-2 rounded px-2 py-0.5 text-sm ${
                  done ? "ov-fill-2 shadow-[inset_3px_0_0_var(--primary)]" : ""
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {done && <span className="flex-none font-bold text-primary-2">✓</span>}
                  {b.opponent && (
                    <span className="flex-none rounded bg-[var(--surface-2)] px-1 text-[0.6rem] uppercase tracking-wide text-accent">противник</span>
                  )}
                  {b.category === "map" && (
                    <span className="flex-none rounded bg-[var(--surface-2)] px-1 text-[0.6rem] uppercase tracking-wide text-primary-2">карта</span>
                  )}
                  {b.who ? <span className="flex-none font-display text-xs uppercase text-muted">{b.who}</span> : null}
                  <span className={`[overflow-wrap:anywhere] ${done ? "font-semibold text-primary-2" : ""}`}>{b.text}</span>
                </span>
                <span className={`pts flex-none ${b.opponent ? "pts-cyan" : "pts-orange"}`}>
                  <span>+{b.points}</span>
                </span>
              </li>
            );
          })}
        </ul>
        {rest > 0 && <div className="px-4 pb-2 text-xs text-muted">+{rest} ещё</div>}
      </div>
    </WidgetFrame>
  );
}
