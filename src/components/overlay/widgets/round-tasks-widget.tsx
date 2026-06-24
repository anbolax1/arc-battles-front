import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

const MAX_ROWS = 6;

/** Виджет «Основные задания»: основные задания раунда (text + награда). Одинаковы
    у обеих сторон, в оверлее показан зачёт фокусной стороны (completed).
    Данные приходят в state.roundTasks. Скрыт, если заданий нет. */
export function RoundTasksWidget({ state, instance }: WidgetProps) {
  const all = state.roundTasks ?? [];
  const rows = all.slice(0, MAX_ROWS);
  const rest = all.length - rows.length;
  if (!all.length) return null;
  return (
    <WidgetFrame instance={instance}>
      <div className="flex h-full flex-col">
        {!instance.hideTitle && <div className="ov-fill-2 px-4 py-1.5 font-display text-xs uppercase tracking-[0.2em] text-muted">Основные задания</div>}
        <ul className="flex flex-1 flex-col gap-1 px-4 py-2">
          {rows.map((t) => (
            <li
              key={t.id}
              className={`flex items-center justify-between gap-2 pl-2 text-sm ${t.completed ? "shadow-[inset_3px_0_0_var(--accent)]" : ""}`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {t.completed && <span className="flex-none font-bold text-accent">✓</span>}
                <span className={`[overflow-wrap:anywhere] ${t.completed ? "font-semibold text-accent" : ""}`}>{t.text}</span>
              </span>
              <span className="pts pts-cyan flex-none">
                <span>+{t.points}</span>
              </span>
            </li>
          ))}
        </ul>
        {rest > 0 && <div className="px-4 pb-2 text-xs text-muted">+{rest} ещё</div>}
      </div>
    </WidgetFrame>
  );
}
