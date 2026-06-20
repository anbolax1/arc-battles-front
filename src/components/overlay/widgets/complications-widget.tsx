import { complicationPenalty } from "@/lib/format";
import type { LiveComplication } from "@/lib/types";
import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

function Strip({ c, hideTitle, hidePenalty }: { c: LiveComplication; hideTitle: boolean; hidePenalty: boolean }) {
  const t = c.times ?? 0;
  const violated = t > 0; // факт нарушения: красная заливка + умноженный минус
  const showBadge = violated && !hidePenalty; // плашка «ШТРАФ ×N» — отдельный тумблер
  const amount = c.valueType === "percent" ? `−${c.penalty * t}%` : `−${c.penalty * t}`;
  return (
    <div className={`flex min-h-0 flex-1 items-center justify-between gap-3 px-4 py-2 ${violated ? "bg-[rgba(255,107,107,0.16)]" : ""}`}>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {!hideTitle && c.who ? <span className="flex-none font-display text-xs uppercase text-muted">{c.who}</span> : null}
        {showBadge ? (
          <span className="flex-none bg-danger px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-black">
            Штраф{t > 1 ? ` ×${t}` : ""}
          </span>
        ) : (
          !hideTitle && <span className="flex-none text-muted">Усложнение:</span>
        )}
        <span className="[overflow-wrap:anywhere]">{c.text}</span>
      </span>
      <span className={`pts pts-minus flex-none ${violated ? "" : "opacity-60"}`}>
        <span>{violated ? amount : complicationPenalty(c)}</span>
      </span>
    </div>
  );
}

/** Виджет «Усложнения»: одна или несколько полос усложнений (обе стороны). Полоса
    краснеет при штрафе и показывает «ШТРАФ ×N». Полосы тянутся на высоту виджета
    (можно сделать квадратным), текст переносится. Скрыт, если усложнений нет. */
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
