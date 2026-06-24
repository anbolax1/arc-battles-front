import { minutesLabel } from "@/lib/format";
import type { LiveComplication } from "@/lib/types";
import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

function Strip({ c, hideTitle, hidePenalty }: { c: LiveComplication; hideTitle: boolean; hidePenalty: boolean }) {
  // times = число нарушений = минуты штрафа в рейде (на очки НЕ влияет).
  const minutes = c.minutes ?? c.times ?? 0;
  const violated = minutes > 0; // факт нарушения: красная заливка + минуты в рейде
  const showBadge = violated && !hidePenalty; // плашка с минутами — отдельный тумблер
  return (
    <div className={`flex min-h-0 flex-1 items-center justify-between gap-3 px-4 py-2 ${violated ? "bg-[rgba(255,107,107,0.16)]" : ""}`}>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {!hideTitle && c.who ? <span className="flex-none font-display text-xs uppercase text-muted">{c.who}</span> : null}
        {showBadge ? (
          <span className="flex-none bg-danger px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-black">
            {minutesLabel(minutes)}
          </span>
        ) : (
          !hideTitle && <span className="flex-none text-muted">Протокол:</span>
        )}
        <span className="[overflow-wrap:anywhere]">{c.text}</span>
      </span>
      {violated ? (
        <span className="pts pts-minus flex-none">
          <span>−{minutesLabel(minutes)}</span>
        </span>
      ) : null}
    </div>
  );
}

/** Виджет «Протоколы»: одна или несколько полос протоколов (обе стороны). Полоса
    краснеет при нарушении и показывает минуты штрафа в рейде (на очки не влияет).
    Полосы тянутся на высоту виджета, текст переносится. Скрыт, если протоколов нет. */
export function ComplicationsWidget({ state, instance }: WidgetProps) {
  const list = state.complications?.length ? state.complications : state.complication ? [state.complication] : [];
  if (!list.length) return null;
  return (
    <WidgetFrame instance={instance}>
      <div className="flex h-full flex-col divide-y divide-[var(--border)]">
        {list.map((c, i) => (
          <Strip key={i} c={c} hideTitle={!!instance.hideTitle} hidePenalty={!!instance.hidePenalty} />
        ))}
      </div>
    </WidgetFrame>
  );
}
