import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

/** Виджет «Раунд»: отдельная плашка с номером текущего раунда (можно повесить
    куда угодно отдельно от табло). */
export function RoundWidget({ state, instance }: WidgetProps) {
  return (
    <WidgetFrame instance={instance}>
      <div className="ov-fill-2 flex flex-col items-center justify-center gap-0.5 px-6 py-3">
        {!instance.hideTitle && <span className="text-[0.6rem] uppercase tracking-[0.25em] text-muted">Раунд</span>}
        <span className="font-display text-3xl leading-none tnum">
          {state.currentRound}
          {state.totalRounds ? <span className="text-muted">/{state.totalRounds}</span> : null}
        </span>
      </div>
    </WidgetFrame>
  );
}
