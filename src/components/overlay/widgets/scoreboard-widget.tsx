import type { LiveStanding } from "@/lib/types";
import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

type Tone = "a" | "b";

const TONE: Record<Tone, { text: string; bar: string; glow: string }> = {
  a: { text: "text-primary-2", bar: "bg-[var(--primary)]", glow: "shadow-[0_0_16px_2px_rgba(255,106,26,0.6)]" },
  b: { text: "text-accent", bar: "bg-[var(--accent)]", glow: "shadow-[0_0_16px_2px_rgba(34,211,238,0.55)]" },
};

function PlaceBadge({ place }: { place: number }) {
  const medal =
    place === 1
      ? "bg-[var(--gold)] text-[#2a1a00]"
      : place === 2
        ? "bg-[var(--silver)] text-[#1b1f24]"
        : place === 3
          ? "bg-[var(--bronze)] text-[#2a1200]"
          : "bg-white/12 text-fg";
  return (
    <span
      className={`inline-flex h-6 min-w-[2rem] flex-none items-center justify-center rounded px-1.5 font-display text-xs leading-none tnum [text-shadow:none] ${medal}`}
    >
      #{place}
    </span>
  );
}

function Side({
  s,
  tone,
  focused,
  showRound,
  showMmr,
  showPlace,
}: {
  s: LiveStanding;
  tone: Tone;
  focused: boolean;
  showRound: boolean;
  showMmr: boolean;
  showPlace: boolean;
}) {
  const right = tone === "b";
  // 2×2: имя команды «Ник1 & Ник2» - в две строки; длинные ники обрезаются.
  const parts = (s.name || "—").split(/\s*&\s*/);
  const rp = s.roundPoints ?? 0;
  const place = showPlace ? (s.place ?? 0) : 0;
  const mmr = showMmr ? (s.mmr ?? 0) : 0;
  const delta = showMmr ? (s.mmrDelta ?? 0) : 0;
  const t = TONE[tone];

  return (
    <div
      className={`relative flex min-w-0 flex-1 items-center gap-4 py-2.5 ${right ? "flex-row-reverse pl-4 pr-5 text-right" : "pl-5 pr-4"}`}
    >
      <span className={`absolute inset-y-0 w-1 ${right ? "right-0" : "left-0"} ${t.bar} ${focused ? t.glow : "opacity-50"}`} />
      <div className="min-w-0 flex-1">
        <div className={`flex items-center gap-2.5 ${right ? "flex-row-reverse" : ""}`}>
          {place > 0 && <PlaceBadge place={place} />}
          <div className="min-w-0">
            {parts.map((n, i) => (
              <div key={i} className="truncate font-display text-lg uppercase leading-tight sm:text-xl">
                {n}
              </div>
            ))}
          </div>
        </div>
        {(mmr > 0 || focused) && (
          <div
            className={`mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 font-semibold uppercase tracking-wider text-muted ${right ? "flex-row-reverse" : ""}`}
          >
            {mmr > 0 && (
              <span className="whitespace-nowrap text-sm tnum text-fg/85 sm:text-base">
                {mmr}
                {delta !== 0 && (
                  <span className={delta > 0 ? "text-ok" : "text-danger"}> {delta > 0 ? `▲${delta}` : `▼${-delta}`}</span>
                )}
              </span>
            )}
            {focused && <span className={`whitespace-nowrap text-[0.7rem] ${t.text}`}>● в рейде</span>}
          </div>
        )}
      </div>
      <div className={`flex flex-none items-baseline gap-1.5 font-display leading-none ${right ? "flex-row-reverse" : ""}`}>
        <span className={`text-4xl tnum sm:text-5xl ${t.text}`}>{s.points}</span>
        {showRound && <span className="text-base tnum text-muted sm:text-lg">({rp >= 0 ? `+${rp}` : rp})</span>}
      </div>
    </div>
  );
}

/** Виджет «Счёт»: табло двух сторон, раунд по центру; по настройкам - MMR и места в таблице сезона. */
export function ScoreboardWidget({ state, instance }: WidgetProps) {
  const standings = state.standings ?? [];
  const focusedId = state.currentParticipantId ?? undefined;
  const opts = {
    showRound: !!instance.showRoundScore,
    showMmr: !!instance.showMmr,
    showPlace: !!instance.showPlace,
  };
  const a = standings[0];
  const b = standings[1];
  // При единственном раунде счётчик «N/M» не нужен - по центру только «VS».
  const multiRound = (state.totalRounds ?? 1) > 1;
  const finished = state.stage === "finished";

  return (
    <WidgetFrame instance={instance}>
      <div className="flex h-full items-stretch">
        {a ? (
          <Side s={a} tone="a" focused={!finished && a.participantId === focusedId} {...opts} />
        ) : (
          <div className="flex flex-1 items-center px-5 py-2.5 font-display uppercase text-muted">{state.currentName || "—"}</div>
        )}
        <div className="ov-fill-2 flex min-w-[5.5rem] flex-col items-center justify-center gap-1 px-4 py-2">
          {finished ? (
            <span className="font-display text-lg uppercase leading-none tracking-wider text-gold">Итог</span>
          ) : multiRound ? (
            <>
              <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted">Раунд</span>
              <span className="font-display text-2xl leading-none tnum">
                {state.currentRound}
                <span className="text-muted">/{state.totalRounds}</span>
              </span>
            </>
          ) : (
            <span className="font-display text-xl leading-none text-muted">VS</span>
          )}
        </div>
        {b ? <Side s={b} tone="b" focused={!finished && b.participantId === focusedId} {...opts} /> : <div className="flex-1" />}
      </div>
    </WidgetFrame>
  );
}
