import { minutesLabel } from "@/lib/format";
import type { LiveComplication } from "@/lib/types";
import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

/** Протокол 3 сезона: задание до 15-й минуты за +1. Ник не нужен: это протокол стороны в рейде. */
function RewardStrip({ c }: { c: LiveComplication }) {
  return (
    <div className={`flex min-h-0 flex-1 items-center justify-between gap-3 px-4 py-2 ${c.done ? "bg-[rgba(52,211,153,0.14)]" : ""}`}>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {c.done && <span className="flex-none font-bold text-ok">✓</span>}
        <span className={`[overflow-wrap:anywhere] ${c.done ? "font-semibold text-ok" : ""}`}>{c.text}</span>
      </span>
      <span className="pts pts-cyan flex-none">
        <span>+{c.reward}</span>
      </span>
    </div>
  );
}

function Strip({ c, hideTitle }: { c: LiveComplication; hideTitle: boolean }) {
  // times = число нарушений = минуты штрафа в рейде (на очки НЕ влияет).
  const minutes = c.minutes ?? c.times ?? 0;
  const violated = minutes > 0; // факт нарушения: красная заливка + минуты в рейде
  return (
    <div className={`flex min-h-0 flex-1 items-center justify-between gap-3 px-4 py-2 ${violated ? "bg-[rgba(255,107,107,0.16)]" : ""}`}>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {!hideTitle && c.who ? <span className="flex-none font-display text-xs uppercase text-muted">{c.who}</span> : null}
        {violated && (
          <span className="flex-none bg-danger px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-black">
            {minutesLabel(minutes)}
          </span>
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

/** Виджет «Протоколы»: протокол стороны в рейде, в старом пульте - протоколы обеих сторон с минутами штрафа.
    Скрыт, если протоколов нет. */
export function ComplicationsWidget({ state, instance }: WidgetProps) {
  const list = state.complications?.length ? state.complications : state.complication ? [state.complication] : [];
  if (!list.length) return null;
  const hideTitle = !!instance.hideTitle;
  return (
    <WidgetFrame instance={instance}>
      <div className="flex h-full flex-col">
        {!hideTitle && (
          <div className="ov-fill-2 px-4 py-1.5 font-display text-xs uppercase tracking-[0.2em] text-muted">
            {list.length > 1 ? "Протоколы" : "Протокол"}
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col divide-y divide-[var(--border)]">
          {list.map((c, i) => (c.reward ? <RewardStrip key={i} c={c} /> : <Strip key={i} c={c} hideTitle={hideTitle} />))}
        </div>
      </div>
    </WidgetFrame>
  );
}
