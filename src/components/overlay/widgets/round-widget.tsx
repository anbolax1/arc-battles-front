import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

/** Виджет «Раунд»: номер текущего раунда и его карта. При единственном раунде
    счётчик «N/M» не показываем. */
export function RoundWidget({ state, instance }: WidgetProps) {
  const multiRound = (state.totalRounds ?? 1) > 1;
  return (
    <WidgetFrame instance={instance}>
      <div className="ov-fill-2 flex flex-col items-center justify-center gap-0.5 px-6 py-3">
        {!instance.hideTitle && <span className="text-[0.6rem] uppercase tracking-[0.25em] text-muted">Раунд</span>}
        <span className="font-display text-3xl leading-none tnum">
          {state.currentRound}
          {multiRound ? <span className="text-muted">/{state.totalRounds}</span> : null}
        </span>
        {state.currentMap ? <span className="pt-1 text-xs uppercase tracking-wide text-accent">{state.currentMap}</span> : null}
      </div>
    </WidgetFrame>
  );
}
