import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

const MAX_ROWS = 8;

/** Виджет «Таблица мест»: все стороны по убыванию очков (фокусная подсвечена). */
export function StandingsWidget({ state, instance }: WidgetProps) {
  const rows = [...(state.standings ?? [])].sort((a, b) => b.points - a.points).slice(0, MAX_ROWS);
  const focusedId = state.currentParticipantId ?? undefined;
  if (!rows.length) return null;
  return (
    <WidgetFrame instance={instance}>
      <div className="flex h-full flex-col">
        {!instance.hideTitle && <div className="ov-fill-2 px-4 py-1.5 font-display text-xs uppercase tracking-[0.2em] text-muted">Таблица</div>}
        <ul className="flex flex-1 flex-col">
          {rows.map((s, i) => {
            const focused = s.participantId === focusedId;
            const name = (s.name || "—").split(/\s*&\s*/).join(" & ");
            return (
              <li
                key={s.participantId ?? i}
                className={`flex items-center gap-3 px-4 py-1.5 ${focused ? "shadow-[inset_3px_0_0_var(--primary)]" : ""}`}
              >
                <span className="w-5 flex-none font-display text-sm text-muted tnum">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-display text-sm uppercase">{name}</span>
                <span className={`font-display tnum ${focused ? "text-primary-2" : "text-fg"}`}>{s.points}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </WidgetFrame>
  );
}
