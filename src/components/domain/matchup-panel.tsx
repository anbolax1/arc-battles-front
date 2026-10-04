import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/card";
import { PublicTags } from "@/components/ui/tag-badge";
import { TrophyIcon } from "@/components/icons";
import { fmtDate } from "@/lib/format";
import { hasScore, matchSides, totalScore } from "@/lib/match";
import type { MatchState, Matchup, MatchupSide, Participant, ParticipantMmr } from "@/lib/types";

/** Цвета сторон как на табло и в оверлее: A - оранжевая, B - циановая. */
const SIDE_TEXT = ["text-primary-2", "text-accent"] as const;

function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0";
}

/** Имя стороны: игрок ведёт в профиль, команда - на свою страницу. */
function SideName({ p, side, solo }: { p: Participant; side?: MatchupSide; solo: boolean }) {
  const login = side?.players[0]?.login;
  const href = solo ? (login ? `/profile/${login}` : "") : side?.teamKey ? `/teams/${encodeURIComponent(side.teamKey)}` : "";
  if (!href) return <>{p.name}</>;
  return (
    <Link href={href} className="transition hover:opacity-80">
      {p.name}
    </Link>
  );
}

/** Рейтинг стороны: у сыгранного матча - как он изменился, у остальных - место в сезоне и ставка. */
function RatingLine({ side, change, finished }: { side?: MatchupSide; change?: ParticipantMmr; finished: boolean }) {
  if (finished) {
    if (!change) return <div className="text-sm text-muted">Рейтинг не менялся</div>;
    return (
      <div className="text-sm tnum text-muted">
        MMR {change.before} → <span className="text-fg">{change.after}</span>{" "}
        <span className={change.delta >= 0 ? "text-ok" : "text-danger"}>{signed(change.delta)}</span>
      </div>
    );
  }
  if (!side?.mmr) return null;
  return (
    <div className="space-y-0.5 text-sm tnum text-muted">
      <div>
        MMR <span className="font-display text-fg">{side.mmr}</span>
        {side.place ? ` · ${side.place} место` : ""}
        {side.isNew ? " · новичок сезона" : ` · ${side.wins}–${side.losses} в сезоне`}
      </div>
      {side.winGain ? (
        <div>
          На кону: <span className="text-ok">+{side.winGain}</span> за победу,{" "}
          <span className="text-danger">−{side.lossDrop}</span> за поражение
        </div>
      ) : null}
    </div>
  );
}

function SideBlock({
  p,
  i,
  side,
  change,
  solo,
  finished,
  winner,
}: {
  p: Participant;
  i: number;
  side?: MatchupSide;
  change?: ParticipantMmr;
  solo: boolean;
  finished: boolean;
  winner: boolean;
}) {
  const right = i === 1;
  const players = side?.players ?? [];
  return (
    <div className={`flex min-w-0 items-start gap-4 ${right ? "md:flex-row-reverse md:text-right" : ""}`}>
      <Avatar name={p.name} src={solo ? players[0]?.avatarUrl : undefined} tone={i === 0 ? "lead" : "cyan"} />
      <div className="min-w-0 space-y-1.5">
        <div className={`truncate font-display text-xl uppercase ${SIDE_TEXT[i]}`}>
          <SideName p={p} side={side} solo={solo} />
          {winner && <TrophyIcon className="ml-2 inline h-5 w-5 text-gold" />}
        </div>
        {solo ? (
          players[0]?.tags?.length ? (
            <div className={`flex flex-wrap gap-1.5 ${right ? "md:justify-end" : ""}`}>
              <PublicTags tags={players[0].tags} />
            </div>
          ) : null
        ) : players.length ? (
          <div className={`flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted ${right ? "md:justify-end" : ""}`}>
            {players.map((pl) => (
              <span key={pl.userId} className="inline-flex items-center gap-1.5">
                <Link href={`/profile/${pl.login}`} className="transition hover:text-fg">
                  {pl.displayName || pl.login}
                </Link>
                <PublicTags tags={pl.tags} />
              </span>
            ))}
          </div>
        ) : p.members?.length ? (
          <div className="text-xs text-muted">{p.members.map((m) => m.name).join(" · ")}</div>
        ) : null}
        <RatingLine side={side} change={change} finished={finished} />
      </div>
    </div>
  );
}

/** Шансы сторон по Эло: полоса в цветах сторон. */
export function ChanceBar({ a, b, before = false }: { a: number; b: number; before?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 tnum">
        <span className="font-display text-lg text-primary-2">{a}%</span>
        <span className="text-xs uppercase tracking-wide text-muted">{before ? "Шансы перед матчем" : "Шансы по MMR"}</span>
        <span className="font-display text-lg text-accent">{b}%</span>
      </div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-sm" aria-hidden>
        <span className="basis-0 bg-[var(--primary)]" style={{ flexGrow: a }} />
        <span className="basis-0 bg-[var(--accent)]" style={{ flexGrow: b }} />
      </div>
    </div>
  );
}

/** Стороны матча: кто играет, их рейтинг, шансы и сколько MMR стоит на кону. */
export function MatchupPanel({ st, matchup }: { st: MatchState; matchup: Matchup | null }) {
  const t = st.tournament;
  const sides = matchSides(st);
  const info = new Map((matchup?.sides ?? []).map((s) => [s.participantId, s]));
  const changes = new Map((t.mmrChanges ?? []).map((c) => [c.participantId, c]));
  const finished = t.status === "finished";
  const played = (finished || t.status === "live") && hasScore(st);
  const solo = t.mode !== "2x2";
  const [ia, ib] = sides.map((p) => (p ? info.get(p.id) : undefined));
  const chance = ia?.winChance != null && ib?.winChance != null ? ([ia.winChance, ib.winChance] as const) : null;

  const block = (i: number) => {
    const p = sides[i];
    if (!p) return <div />;
    return (
      <SideBlock
        p={p}
        i={i}
        side={info.get(p.id)}
        change={changes.get(p.id)}
        solo={solo}
        finished={finished}
        winner={t.winnerParticipantId === p.id}
      />
    );
  };

  return (
    <Panel className="space-y-6 p-6">
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        {block(0)}
        {played ? (
          <div className="text-center font-display text-5xl leading-none tnum" aria-label="Счёт матча">
            <span className="text-primary-2">{totalScore(st, sides[0]?.id)}</span>
            <span className="mx-3 text-2xl text-muted">:</span>
            <span className="text-accent">{totalScore(st, sides[1]?.id)}</span>
          </div>
        ) : (
          <div className="text-center font-display text-3xl text-muted">VS</div>
        )}
        {block(1)}
      </div>
      {chance && <ChanceBar a={chance[0]} b={chance[1]} before={finished} />}
    </Panel>
  );
}

/** Другие сыгранные матчи этих же сторон друг против друга. */
export function HeadToHead({ st, matchup }: { st: MatchState; matchup: Matchup | null }) {
  const h = matchup?.headToHead;
  if (!h || h.wins[0] + h.wins[1] + h.draws === 0) return null;
  const [a, b] = matchSides(st);
  const winnerName = (w: number) => (w === 0 ? a?.name : b?.name);

  return (
    <section className="space-y-4">
      <h2 className="text-xl">Личные встречи</h2>
      <Panel className="grid gap-5 p-5 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:items-center">
        <div className="space-y-1.5 text-center">
          <div className="font-display text-4xl leading-none tnum">
            <span className="text-primary-2">{h.wins[0]}</span>
            <span className="mx-2 text-2xl text-muted">:</span>
            <span className="text-accent">{h.wins[1]}</span>
          </div>
          <div className="truncate font-display text-xs uppercase">
            <span className={SIDE_TEXT[0]}>{a?.name}</span>
            <span className="mx-1.5 text-muted">·</span>
            <span className={SIDE_TEXT[1]}>{b?.name}</span>
          </div>
          {h.draws > 0 && <div className="text-xs text-muted">ничьих: {h.draws}</div>}
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {h.matches.map((m) => (
            <li key={m.tournamentId}>
              <Link
                href={`/tournament/${m.tournamentId}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm transition hover:opacity-80"
              >
                <span className="w-32 text-muted tnum">{fmtDate(m.date)}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{m.map || "Карта не указана"}</span>
                <span className={`font-display uppercase ${m.winner === 0 ? SIDE_TEXT[0] : m.winner === 1 ? SIDE_TEXT[1] : "text-muted"}`}>
                  {m.winner < 0 ? "Ничья" : `Победа ${winnerName(m.winner)}`}
                  {m.games > 1 ? " ×2" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </section>
  );
}
