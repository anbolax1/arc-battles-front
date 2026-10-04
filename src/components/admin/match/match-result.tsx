import Link from "next/link";
import { Panel } from "@/components/ui/card";
import { TrophyIcon } from "@/components/icons";
import { loadoutLabel, roundScore, totalScore } from "@/lib/match";
import type { MatchState, Participant } from "@/lib/types";

/** Итог матча: победитель, счёт по раундам и изменение MMR. */
export function MatchResult({ st, sides }: { st: MatchState; sides: [Participant | null, Participant | null] }) {
  const t = st.tournament;
  const [a, b] = sides;
  const winner = (t.participants ?? []).find((p) => p.id === t.winnerParticipantId) ?? null;
  const rounds = [...(t.rounds ?? [])].sort((x, y) => x.number - y.number);
  const mmr = new Map((t.mmrChanges ?? []).map((c) => [c.participantId, c]));

  return (
    <div className="space-y-4">
      <Panel glow className="flex flex-wrap items-center gap-x-8 gap-y-4 p-6">
        <span className="flex h-16 w-16 flex-none items-center justify-center bg-[image:var(--grad-warm)] text-[#1a0c02] [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]">
          <TrophyIcon className="h-8 w-8" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <span className="field-label text-accent">{winner ? "Победа" : "Ничья"}</span>
          <div className="truncate font-display text-3xl uppercase">{winner ? winner.name : "Ничья — MMR не меняется"}</div>
          <div className="text-sm text-muted">
            {t.mode} · {t.playerType.toUpperCase()} · {rounds.length} раунда{t.ratingMultiplier === 2 ? " · рейтинг ×2" : ""}
          </div>
        </div>
        <div className="flex items-center gap-3 font-display text-5xl leading-none tnum">
          <span className="text-primary-2">{totalScore(st, a?.id)}</span>
          <span className="text-2xl text-muted">:</span>
          <span className="text-accent">{totalScore(st, b?.id)}</span>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="space-y-2.5 p-5">
          <h3 className="font-display text-base uppercase">Раунды</h3>
          {rounds.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-md bg-surface-2 px-3 py-2.5">
              <span className="font-display text-[0.68rem] uppercase text-primary-2">Раунд {r.number}</span>
              <span className="min-w-0 flex-1 text-sm">
                {r.map || "—"} <span className="text-xs text-muted">· {loadoutLabel(r.number)}</span>
              </span>
              <span className="font-display tnum">
                {r.status === "pending" ? "не сыгран" : `${roundScore(st, r.number, a?.id)} : ${roundScore(st, r.number, b?.id)}`}
              </span>
            </div>
          ))}
        </Panel>
        <Panel className="space-y-2.5 p-5">
          <h3 className="font-display text-base uppercase">Рейтинг (MMR)</h3>
          {sides.map((p) => {
            if (!p) return null;
            const c = mmr.get(p.id);
            return (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-2.5">
                <span className="font-display uppercase">{p.name}</span>
                {c ? (
                  <>
                    <span className="text-sm tnum text-muted">
                      {c.before} → {c.after}
                    </span>
                    <span className={`font-display text-lg tnum ${c.delta >= 0 ? "text-ok" : "text-danger"}`}>
                      {c.delta >= 0 ? `+${c.delta}` : `−${Math.abs(c.delta)}`}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted">без изменений</span>
                )}
              </div>
            );
          })}
          <p className="text-xs text-muted">Итог виден в оверлее, пока не начнётся следующий матч.</p>
        </Panel>
      </div>

      <Panel className="flex flex-wrap items-center gap-3 p-4">
        <Link href={`/tournament/${t.id}`} className="btn btn-ghost btn-sm">
          <span>Страница матча</span>
        </Link>
        <Link href="/admin/matches" className="btn btn-primary ml-auto">
          <span>Новый матч</span>
        </Link>
      </Panel>
    </div>
  );
}
