import Link from "next/link";
import type { CSSProperties } from "react";
import { hasScore, mapImage, matchSides, roundScore, taskTitle, totalScore } from "@/lib/match";
import type { MatchState, Participant } from "@/lib/types";
import { SecHead } from "@/components/surface/ui";
import { CountUp } from "@/components/surface/motion";
import { RoundCard, type RoundTaskView } from "@/components/surface/round-card";
import { MmrMove } from "@/components/surface/home-parts";
import { dayMonth } from "@/components/surface/fmt";

const ACT: Record<string, string> = { ban: "бан", pick: "пик", rest: "остаток" };

/** Задания раунда обеих сторон с итогом: выполнил сам, выполнил соперник или нет. */
export function roundTasks(st: MatchState, round: number, sides: [Participant | null, Participant | null]): RoundTaskView[] {
  const name = (id?: string | null) => sides.find((p) => p?.id === id)?.name ?? "";
  return st.tasks
    .filter((t) => t.roundNumber === round)
    .sort((x, y) => (x.participantId === sides[0]?.id ? 0 : 1) - (y.participantId === sides[0]?.id ? 0 : 1))
    .map((t) => ({
      id: t.id,
      who: name(t.participantId),
      name: taskTitle(t),
      points: t.points,
      result: !t.completedBy ? "miss" : t.completedBy === t.participantId ? "own" : "cross",
      by: t.completedBy && t.completedBy !== t.participantId ? name(t.completedBy) : undefined,
    }));
}

/** Последний сыгранный матч: табло, раунды с заданиями и пики-баны. */
export function LastMatch({ st }: { st: MatchState }) {
  const t = st.tournament;
  const sides = matchSides(st);
  const [a, b] = sides;
  const sa = totalScore(st, a?.id);
  const sb = totalScore(st, b?.id);
  const scored = hasScore(st);
  const winner = (t.participants ?? []).find((p) => p.id === t.winnerParticipantId);
  const changes = new Map((t.mmrChanges ?? []).map((c) => [c.participantId, c]));
  const rounds = [...(t.rounds ?? [])].filter((r) => r.status !== "pending" || r.map).sort((x, y) => x.number - y.number);
  const ca = a ? changes.get(a.id) : undefined;
  const cb = b ? changes.get(b.id) : undefined;
  const eyebrow = ["Последний матч", dayMonth(t.startsAt), t.ratingMultiplier > 1 ? `рейтинг ×${t.ratingMultiplier}` : ""].filter(Boolean).join(" · ");

  return (
    <section className="sf-sec sf-paper sf-grain" aria-labelledby="last-t">
      <div className="sf-wrap">
        <SecHead
          id="last-t"
          eyebrow={eyebrow}
          title="последний рейд"
          action={winner ? <span className="sf-stamp win">Победа {winner.name}</span> : <span className="sf-stamp">Ничья</span>}
        />
        <div className="sf-board">
          <div className="sf-side">
            <span className="sf-corner" style={{ background: "var(--sf-a)" }} />
            <span className="sf-side-name">{a?.name ?? "—"}</span>
            {ca && (
              <span className="sf-side-mmr sf-tnum">
                <MmrMove {...ca} />
              </span>
            )}
          </div>
          <div className="sf-score" aria-label={scored ? `Счёт ${sa}:${sb}` : "Счёт не вёлся"}>
            {scored ? (
              <>
                <b className={sa >= sb ? "w" : "l"}>
                  <CountUp value={sa} />
                </b>
                <i>:</i>
                <b className={sb >= sa ? "w" : "l"}>
                  <CountUp value={sb} />
                </b>
              </>
            ) : (
              <b className="w">VS</b>
            )}
          </div>
          <div className="sf-side b">
            <span className="sf-corner" style={{ background: "var(--sf-b)" }} />
            <span className="sf-side-name">{b?.name ?? "—"}</span>
            {cb && (
              <span className="sf-side-mmr sf-tnum">
                <MmrMove {...cb} />
              </span>
            )}
          </div>
        </div>
        {rounds.length > 0 && (
          <div className="sf-rounds" style={{ "--n": Math.min(rounds.length, 3) } as CSSProperties}>
            {rounds.map((r) => (
              <RoundCard
                key={r.id}
                n={r.number}
                map={r.map}
                image={mapImage(r.mapCode)}
                scoreA={roundScore(st, r.number, a?.id)}
                scoreB={roundScore(st, r.number, b?.id)}
                scored={scored && r.status !== "pending"}
                tasks={roundTasks(st, r.number, sides)}
              />
            ))}
          </div>
        )}
        {st.veto.length > 0 && (
          <ol className="sf-veto-chips" aria-label="Пики и баны">
            {st.veto.map((v) => (
              <li key={v.seq}>
                <span className={`sf-k ${v.action}`}>
                  {ACT[v.action]}
                  {v.side ? ` ${v.side}` : ""}
                </span>
                {v.action === "ban" ? <s>{v.mapName}</s> : <span>{v.mapName}</span>}
                {v.roundNumber ? <span className="s">→ Р{v.roundNumber}</span> : null}
              </li>
            ))}
          </ol>
        )}
        <div className="sf-last-foot">
          <span className="sf-mono">{st.tasks.length ? "Нажми на раунд, чтобы увидеть задания" : ""}</span>
          <Link className="sf-btn sf-btn-ink" href={`/tournament/${t.id}`}>
            Разбор матча
          </Link>
        </div>
      </div>
    </section>
  );
}
