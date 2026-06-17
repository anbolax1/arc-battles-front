import Link from "next/link";
import type { LiveState } from "@/lib/types";
import { Panel } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { TwitchIcon } from "@/components/icons";
import { pointsLabel } from "@/lib/format";
import { STREAM_URL } from "@/lib/links";

/** Полоса «сейчас в эфире» из текущего состояния оверлея (LiveState). */
export function LiveBanner({ state }: { state: LiveState }) {
  return (
    <Panel glow className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
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
        {state.tournamentId ? (
          <Link
            href={`/tournament/${state.tournamentId}`}
            className="inline-block transition hover:text-primary-2"
          >
            <h2 className="text-2xl sm:text-3xl">{state.tournamentName || "Матч в эфире"}</h2>
          </Link>
        ) : (
          <h2 className="text-2xl sm:text-3xl">{state.tournamentName || "Матч в эфире"}</h2>
        )}
        {state.currentName && (
          <p className="text-sm text-muted">
            Сейчас ходит{" "}
            <span className="font-display uppercase text-fg">{state.currentName}</span>
            {" — "}
            <span className="tnum text-primary-2">{pointsLabel(state.currentPoints)}</span>
          </p>
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
