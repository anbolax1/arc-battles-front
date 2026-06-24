import type { LiveStanding } from "@/lib/types";
import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

function Side({ s, focused, align, showRound }: { s: LiveStanding; focused: boolean; align: "left" | "right"; showRound: boolean }) {
  // 2×2: имя команды «Ник1 & Ник2» — в две строки; длинные ники обрезаются.
  const parts = (s.name || "—").split(/\s*&\s*/);
  const rp = s.roundPoints ?? 0;
  return (
    <div
      className={[
        "flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5",
        align === "right" ? "flex-row-reverse text-right" : "",
        focused ? "shadow-[inset_0_-3px_0_var(--primary)]" : "",
      ].join(" ")}
    >
      <div className={`flex items-baseline gap-1.5 font-display leading-none ${focused ? "text-primary-2" : "text-fg"}`}>
        <span className="text-4xl tnum sm:text-5xl">{s.points}</span>
        {showRound && <span className="text-base tnum text-muted sm:text-lg">({rp >= 0 ? `+${rp}` : rp})</span>}
      </div>
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

/** Виджет «Счёт»: VS-табло двух сторон + номер раунда по центру. Фокусная сторона
    подсвечена. Извлечён из прежнего единого OverlayWidget. */
export function ScoreboardWidget({ state, instance }: WidgetProps) {
  const standings = state.standings ?? [];
  const focusedId = state.currentParticipantId ?? undefined;
  const showRound = !!instance.showRoundScore;
  const a = standings[0];
  const b = standings[1];
  // Ровно 1 раунд на турнир — счётчик «N/M» бессмысленен, показываем только «VS».
  const multiRound = (state.totalRounds ?? 1) > 1;

  return (
    <WidgetFrame instance={instance}>
      <div className="flex items-stretch">
        {a ? (
          <Side s={a} focused={a.participantId === focusedId} align="left" showRound={showRound} />
        ) : (
          <div className="flex-1 px-4 py-2.5 font-display uppercase text-muted">{state.currentName || "—"}</div>
        )}
        <div className="ov-fill-2 flex flex-col items-center justify-center gap-0.5 px-4 py-2">
          {multiRound ? (
            <>
              <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted">Раунд</span>
              <span className="font-display text-xl leading-none tnum">
                {state.currentRound}
                <span className="text-muted">/{state.totalRounds}</span>
              </span>
            </>
          ) : (
            <span className="font-display text-xl leading-none text-muted">VS</span>
          )}
        </div>
        {b ? <Side s={b} focused={b.participantId === focusedId} align="right" showRound={showRound} /> : <div className="flex-1" />}
      </div>
    </WidgetFrame>
  );
}
