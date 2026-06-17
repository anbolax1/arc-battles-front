import { complicationPenalty } from "@/lib/format";
import type { LiveStanding, LiveState } from "@/lib/types";

function Side({ s, focused, align }: { s: LiveStanding; focused: boolean; align: "left" | "right" }) {
  // 2×2: имя команды «Ник1 & Ник2» — в две строки; длинные ники обрезаются.
  const parts = (s.name || "—").split(/\s*&\s*/);
  return (
    <div
      className={[
        "flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5",
        align === "right" ? "flex-row-reverse text-right" : "",
        focused ? "shadow-[inset_0_-3px_0_var(--primary)]" : "",
      ].join(" ")}
    >
      <div className={`font-display text-4xl leading-none tnum sm:text-5xl ${focused ? "text-primary-2" : "text-fg"}`}>{s.points}</div>
      <div className="min-w-0">
        {parts.map((n, i) => (
          <div key={i} className={`truncate font-display text-base uppercase leading-tight sm:text-lg ${focused ? "" : "opacity-80"}`}>
            {n}
          </div>
        ))}
        {focused && <div className="text-[0.6rem] font-semibold uppercase tracking-widest text-primary-2">● в рейде</div>}
      </div>
    </div>
  );
}

/** Компактный скоребоард для стрима: счёт обеих сторон + ники, по центру номер раунда,
    снизу — узкая полоса усложнения текущей стороны. Плотно, без пустого пространства. */
export function OverlayWidget({ state }: { state: LiveState }) {
  const standings = state.standings ?? [];
  const focusedId = state.currentParticipantId ?? undefined;
  const a = standings[0];
  const b = standings[1];

  return (
    <div className="panel glow-edge w-full overflow-hidden">
      <div className="flex items-stretch">
        {a ? <Side s={a} focused={a.participantId === focusedId} align="left" /> : <div className="flex-1 px-4 py-2.5 font-display uppercase text-muted">{state.currentName || "—"}</div>}
        <div className="flex flex-col items-center justify-center gap-0.5 bg-surface-2 px-4 py-2">
          <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted">Раунд</span>
          <span className="font-display text-xl leading-none tnum">
            {state.currentRound}
            {state.totalRounds ? <span className="text-muted">/{state.totalRounds}</span> : null}
          </span>
        </div>
        {b ? <Side s={b} focused={b.participantId === focusedId} align="right" /> : <div className="flex-1" />}
      </div>

      {state.complication &&
        (() => {
          const c = state.complication;
          const t = c.times ?? 0;
          const violated = t > 0;
          const amount = c.valueType === "percent" ? `−${c.penalty * t}%` : `−${c.penalty * t}`;
          return (
            <div className={`flex items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-1.5 ${violated ? "bg-[rgba(255,107,107,0.16)]" : "bg-surface-2"}`}>
              <span className="flex min-w-0 items-center gap-2 text-sm">
                {violated ? (
                  <span className="flex-none bg-danger px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-black">
                    Штраф{t > 1 ? ` ×${t}` : ""}
                  </span>
                ) : (
                  <span className="flex-none text-muted">Усложнение:</span>
                )}
                <span className="truncate">{c.text}</span>
              </span>
              <span className={`pts pts-minus flex-none ${violated ? "" : "opacity-60"}`}>
                <span>{violated ? amount : complicationPenalty(c)}</span>
              </span>
            </div>
          );
        })()}
    </div>
  );
}
