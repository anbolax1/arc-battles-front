import Link from "next/link";
import { Panel } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { TwitchIcon } from "@/components/icons";
import { STREAM_URL } from "@/lib/links";
import { mapImage, matchSides, roundScore, stageLabel, totalScore } from "@/lib/match";
import type { MatchState } from "@/lib/types";

/** Блок матча на главной: идущий (со ссылкой на пульт для организатора) или последний сыгранный. */
export function CurrentMatch({ st, live, organizer }: { st: MatchState; live: boolean; organizer: boolean }) {
  const t = st.tournament;
  const [a, b] = matchSides(st);
  const rounds = [...(t.rounds ?? [])].sort((x, y) => x.number - y.number);
  const winner = (t.participants ?? []).find((p) => p.id === t.winnerParticipantId);

  return (
    <Panel glow className="space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        {live ? <StatusPill status="live">Сейчас</StatusPill> : <StatusPill status="done">Последний матч</StatusPill>}
        <span className="text-sm text-muted">{stageLabel(st.stage, st.currentRound || 1, rounds.length)}</span>
        <span className="chip"><span>{t.mode}</span></span>
        {t.ratingMultiplier === 2 && <span className="chip chip-cyan"><span>рейтинг ×2</span></span>}
        {!live && winner && <span className="text-sm text-muted">· победа {winner.name}</span>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="min-w-0 flex-1 truncate font-display text-2xl uppercase text-primary-2 sm:text-3xl">{a?.name ?? "—"}</span>
        <span className="flex items-center gap-3 font-display text-5xl leading-none tnum">
          <span className="text-primary-2">{totalScore(st, a?.id)}</span>
          <span className="text-2xl text-muted">:</span>
          <span className="text-accent">{totalScore(st, b?.id)}</span>
        </span>
        <span className="min-w-0 flex-1 truncate text-right font-display text-2xl uppercase text-accent sm:text-3xl">{b?.name ?? "—"}</span>
      </div>

      {st.stage === "veto" && st.veto.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {st.veto.map((v) => (
            <span key={v.seq} className={`chip ${v.action === "ban" ? "opacity-60" : "chip-cyan"}`}>
              <span>
                {v.action === "ban" ? "бан" : `раунд ${v.roundNumber}`} · {v.mapName}
              </span>
            </span>
          ))}
        </div>
      ) : (
        rounds.some((r) => r.map) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {rounds.map((r) => (
              <div key={r.id} className="relative h-24 overflow-hidden rounded-md">
                {r.mapCode ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mapImage(r.mapCode)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : null}
                <span className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20" />
                <div className="absolute inset-0 flex items-center justify-between gap-3 px-4">
                  <div>
                    <div className="font-display text-xs uppercase text-primary-2">
                      Раунд {r.number}
                      {r.status === "live" ? " · идёт" : ""}
                    </div>
                    <div className="font-display uppercase">{r.map || "—"}</div>
                  </div>
                  <span className="font-display text-2xl tnum">
                    {r.status === "pending" ? "—" : `${roundScore(st, r.number, a?.id)} : ${roundScore(st, r.number, b?.id)}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <div className="flex flex-wrap gap-3">
        {organizer && live && (
          <Link href={`/admin/matches/${t.id}`} className="btn btn-primary">
            <span>Открыть пульт</span>
          </Link>
        )}
        <Link href={`/tournament/${t.id}`} className="btn btn-ghost btn-sm">
          <span>Страница матча</span>
        </Link>
        {live && (
          <a href={STREAM_URL} target="_blank" rel="noreferrer" className="btn btn-twitch btn-sm">
            <TwitchIcon />
            <span>Смотреть эфир</span>
          </a>
        )}
      </div>
    </Panel>
  );
}
