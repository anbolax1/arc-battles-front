import Link from "next/link";
import type { LiveStanding, LiveState } from "@/lib/types";
import { Panel } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { TwitchIcon } from "@/components/icons";
import { pointsLabel } from "@/lib/format";
import { STREAM_URL } from "@/lib/links";

/* Полоса «сейчас в эфире». Матчап показываем VS-блоком из standings: две стороны
   разными цветами, состав 2×2 — в столбик, очки и отметка «в рейде» у активной. */

function Side({ s, tone, current }: { s: LiveStanding; tone: "primary" | "cyan"; current: boolean }) {
  const members = s.name.split(/\s*&\s*/).filter(Boolean);
  const nameColor = tone === "primary" ? "text-primary-2" : "text-accent";
  const edge =
    tone === "primary"
      ? "shadow-[inset_0_0_0_1px_rgba(255,106,26,0.4)]"
      : "shadow-[inset_0_0_0_1px_rgba(34,211,238,0.4)]";
  return (
    <div className={`min-w-0 flex-1 rounded-md bg-surface-2 p-3 ${edge}`}>
      <div className="space-y-0.5">
        {members.map((m, i) => (
          <div key={i} className={`truncate font-display uppercase leading-tight ${nameColor}`}>
            {m}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm text-muted tnum">{pointsLabel(s.points)}</span>
        {current && (
          <span className="pill pill-live">
            <span className="live-dot" />
            <span>В рейде</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function LiveBanner({ state }: { state: LiveState }) {
  const standings = (state.standings ?? []).slice(0, 2);
  const hasMatchup = standings.length >= 2;
  const matchup = hasMatchup ? standings.map((s) => s.name).join(" vs ") : "";
  // Название турнира показываем как заголовок, только если оно НЕ дублирует матчап.
  const title = state.tournamentName && state.tournamentName !== matchup ? state.tournamentName : "";

  return (
    <Panel glow className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status="live">В эфире</StatusPill>
          {state.mode && (
            <span className="chip">
              <span>{state.mode}</span>
            </span>
          )}
          <span className="text-sm text-muted">
            Раунд <span className="tnum text-fg">{state.currentRound}</span>
            {state.totalRounds ? ` / ${state.totalRounds}` : ""}
          </span>
        </div>

        {title &&
          (state.tournamentId ? (
            <Link href={`/tournament/${state.tournamentId}`} className="inline-block transition hover:text-primary-2">
              <h2 className="text-xl sm:text-2xl">{title}</h2>
            </Link>
          ) : (
            <h2 className="text-xl sm:text-2xl">{title}</h2>
          ))}

        {hasMatchup ? (
          <div className="flex items-stretch gap-3">
            <Side
              s={standings[0]}
              tone="primary"
              current={state.currentParticipantId === standings[0].participantId}
            />
            <div className="flex items-center">
              <span className="vs-glyph">
                <span>VS</span>
              </span>
            </div>
            <Side
              s={standings[1]}
              tone="cyan"
              current={state.currentParticipantId === standings[1].participantId}
            />
          </div>
        ) : (
          <h2 className="text-2xl sm:text-3xl">{state.tournamentName || "Матч в эфире"}</h2>
        )}
      </div>

      <div className="flex flex-none flex-wrap gap-3">
        {state.tournamentId && (
          <Link href={`/tournament/${state.tournamentId}`} className="btn btn-ghost btn-sm">
            <span>К турниру</span>
          </Link>
        )}
        <a href={STREAM_URL} target="_blank" rel="noreferrer" className="btn btn-twitch btn-sm">
          <TwitchIcon />
          <span>Смотреть эфир</span>
        </a>
      </div>
    </Panel>
  );
}
