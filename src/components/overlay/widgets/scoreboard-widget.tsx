import type { LiveBelt, LiveStanding } from "@/lib/types";
import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

type Tone = "a" | "b";

const TONE: Record<Tone, { text: string; bar: string; glow: string }> = {
  a: { text: "text-primary-2", bar: "bg-[var(--primary)]", glow: "shadow-[0_0_16px_2px_var(--primary-glow)]" },
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
      className={`inline-flex h-6 min-w-[2rem] flex-none items-center justify-center self-center rounded px-1.5 font-display text-xs leading-none tnum [text-shadow:none] ${medal}`}
    >
      #{place}
    </span>
  );
}

/** Носитель пояса лиги: мини-пояс под ником и звёзды защит. После матча значок уже у нового носителя и светится чаще. */
function BeltMark({ belt }: { belt: LiveBelt }) {
  const fresh = belt.result === "take" || belt.result === "pick";
  return (
    <span className={`ov-belt flex flex-none items-center gap-1 self-center ${fresh ? "fresh" : ""}`}>
      <svg viewBox="0 0 44 22" className="h-[18px] w-[36px]" role="img" aria-label="носитель пояса лиги">
        <path d="M1 8.5 Q22 11.5 43 8.5 L43 14.5 Q22 17.5 1 14.5 Z" fill="#3b2408" stroke="#c98a0c" strokeWidth="0.8" />
        <circle cx="5.5" cy="12" r="1.3" fill="#f1aa1c" />
        <circle cx="38.5" cy="12" r="1.3" fill="#f1aa1c" />
        <path d="M22 1 L29.2 4 L32.2 11 L29.2 18 L22 21 L14.8 18 L11.8 11 L14.8 4 Z" fill="#e9a21a" stroke="#6b4300" strokeWidth="1.2" />
        <path d="M15.6 5 L22 2.4 L28.4 5 L29.6 7.6 L14.4 7.6 Z" fill="#ffe7a3" opacity="0.6" />
        <rect x="16" y="7.8" width="12" height="6.6" rx="1" fill="#1a0e1e" />
        <rect x="17.4" y="9" width="2" height="4.2" fill="#7fede6" />
        <rect x="20.2" y="9" width="2" height="4.2" fill="#2bef83" />
        <rect x="23" y="9" width="2" height="4.2" fill="#f9cf0a" />
        <rect x="25.8" y="9" width="2" height="4.2" fill="#f2271c" />
      </svg>
      {belt.defenses > 0 && <span className="font-display text-sm leading-none tnum text-gold">★{belt.defenses}</span>}
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
  showBelt,
  belt,
}: {
  s: LiveStanding;
  tone: Tone;
  focused: boolean;
  showRound: boolean;
  showMmr: boolean;
  showPlace: boolean;
  showBelt: boolean;
  belt?: LiveBelt | null;
}) {
  const right = tone === "b";
  // 2×2: имя команды «Ник1 & Ник2» - в две строки; длинные ники обрезаются.
  const parts = (s.name || "—").split(/\s*&\s*/);
  const rp = s.roundPoints ?? 0;
  const place = showPlace ? (s.place ?? 0) : 0;
  // Места в таблице ещё нет: игрок в сезоне не играл - так и пишем, как на сайте.
  const fresh = showPlace && !place && !!s.isNew;
  const mmr = showMmr ? (s.mmr ?? 0) : 0;
  const delta = showMmr ? (s.mmrDelta ?? 0) : 0;
  const t = TONE[tone];
  const holder = showBelt && !!belt && belt.holderParticipantId === s.participantId;

  return (
    <div
      className={`relative flex min-w-0 flex-1 items-center gap-4 py-2.5 ${right ? "flex-row-reverse pl-4 pr-5 text-right" : "pl-5 pr-4"}`}
    >
      <span className={`absolute inset-y-0 w-1 ${right ? "right-0" : "left-0"} ${t.bar} ${focused ? t.glow : "opacity-50"}`} />
      <div className="min-w-0 flex-1">
        {/* Ник - отдельной строкой: значки ниже, чтобы в узком табло он не обрезался. */}
        {parts.map((n, i) => (
          <div key={i} className="truncate font-display text-lg uppercase leading-tight sm:text-xl">
            {n}
          </div>
        ))}
        {(mmr > 0 || focused || fresh || holder || place > 0) && (
          <div
            className={`mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-semibold uppercase tracking-wider text-muted ${right ? "flex-row-reverse" : ""}`}
          >
            {place > 0 && <PlaceBadge place={place} />}
            {holder && belt && <BeltMark belt={belt} />}
            {mmr > 0 && (
              <span className="whitespace-nowrap text-sm tnum text-fg/85 sm:text-base">
                {mmr}
                {delta !== 0 && (
                  <span className={delta > 0 ? "text-ok" : "text-danger"}> {delta > 0 ? `▲${delta}` : `▼${-delta}`}</span>
                )}
              </span>
            )}
            {fresh && <span className="whitespace-nowrap text-[0.7rem]">новичок сезона</span>}
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

/** Виджет «Счёт»: табло двух сторон, раунд по центру; по настройкам - MMR, места в таблице сезона и пояс лиги. */
export function ScoreboardWidget({ state, instance }: WidgetProps) {
  const standings = state.standings ?? [];
  const focusedId = state.currentParticipantId ?? undefined;
  const opts = {
    showRound: !!instance.showRoundScore,
    showMmr: !!instance.showMmr,
    showPlace: !!instance.showPlace,
    showBelt: !!instance.showBelt,
  };
  const a = standings[0];
  const b = standings[1];
  // При единственном раунде счётчик «N/M» не нужен - по центру только «VS».
  const multiRound = (state.totalRounds ?? 1) > 1;
  const finished = state.stage === "finished";
  const belt = state.belt ?? null;
  const beltCaption =
    !belt || !opts.showBelt
      ? ""
      : !finished
        ? "за пояс"
        : belt.result === "take" || belt.result === "pick"
          ? "новый носитель"
          : belt.result === "defense"
            ? `защита №${belt.defenses}`
            : "";

  return (
    <WidgetFrame instance={instance}>
      <div className="flex h-full items-stretch">
        {a ? (
          <Side s={a} tone="a" focused={!finished && a.participantId === focusedId} belt={belt} {...opts} />
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
          {beltCaption && <span className="max-w-[5.5rem] text-center text-[0.6rem] uppercase leading-tight tracking-[0.14em] text-gold">{beltCaption}</span>}
        </div>
        {b ? <Side s={b} tone="b" focused={!finished && b.participantId === focusedId} belt={belt} {...opts} /> : <div className="flex-1" />}
      </div>
    </WidgetFrame>
  );
}
