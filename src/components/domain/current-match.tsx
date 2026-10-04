import Link from "next/link";
import { Panel } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { PrizeBanner, ShowFrame, showNameSize } from "@/components/domain/show-frame";
import { StreamButtons } from "@/components/domain/stream-buttons";
import { TrophyIcon } from "@/components/icons";
import { isShowMatch, mapImage, matchSides, roundScore, roundsLabel, stageLabel, totalScore } from "@/lib/match";
import type { MatchState, Participant, Round } from "@/lib/types";

type Sides = [Participant | null, Participant | null];

/** Пики-баны, пока они идут, потом - раунды с картами и счётом. */
function MatchMaps({ st, rounds, sides }: { st: MatchState; rounds: Round[]; sides: Sides }) {
  const [a, b] = sides;
  if (st.stage === "veto" && st.veto.length > 0) {
    return (
      <div className="flex flex-wrap gap-2">
        {st.veto.map((v) => (
          <span key={v.seq} className={`chip ${v.action === "ban" ? "opacity-60" : "chip-cyan"}`}>
            <span>
              {v.action === "ban" ? "бан" : `раунд ${v.roundNumber}`} · {v.mapName}
            </span>
          </span>
        ))}
      </div>
    );
  }
  if (!rounds.some((r) => r.map)) return null;
  // В три колонки названию карты не хватает места рядом со счётом: счёт уходит в строку с номером раунда.
  const compact = rounds.length > 2;
  return (
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {rounds.map((r) => {
        const label = (
          <div className="font-display text-xs uppercase text-primary-2">
            Раунд {r.number}
            {r.status === "live" ? " · идёт" : ""}
          </div>
        );
        const score = r.status === "pending" ? "—" : `${roundScore(st, r.number, a?.id)} : ${roundScore(st, r.number, b?.id)}`;
        return (
          <div key={r.id} className="relative h-24 overflow-hidden rounded-md">
            {r.mapCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mapImage(r.mapCode)} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <span className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20" />
            {compact ? (
              <div className="absolute inset-0 flex flex-col justify-center gap-1 px-4">
                <div className="flex items-baseline justify-between gap-2">
                  {label}
                  <span className="font-display text-lg tnum">{score}</span>
                </div>
                <div className="line-clamp-2 font-display uppercase leading-tight">{r.map || "—"}</div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-between gap-3 px-4">
                <div className="min-w-0">
                  {label}
                  <div className="truncate font-display uppercase">{r.map || "—"}</div>
                </div>
                <span className="flex-none font-display text-2xl tnum">{score}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Ники прижаты к счёту с одинаковым отступом, как бы ни отличались по длине. Рядом с постером строка
    стоит слева с небольшим отступом: по центру между постером и первым ником остаётся пустота. */
function ScoreLine({ st, sides, big }: { st: MatchState; sides: Sides; big?: boolean }) {
  const [a, b] = sides;
  const name = big ? showNameSize(a?.name, b?.name) : "text-2xl sm:text-3xl";
  const row = big
    ? "flex flex-col items-center gap-x-6 gap-y-1 text-center sm:flex-row sm:pl-6"
    : "grid items-center gap-x-6 gap-y-1 text-center sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]";
  return (
    <div className={row}>
      <div className={`min-w-0 max-w-full truncate font-display uppercase text-primary-2 ${big ? "" : "sm:text-right"} ${name}`}>
        {a?.name ?? "—"}
      </div>
      <div
        className={`flex flex-none items-center justify-center gap-3 font-display leading-none tnum ${big ? "text-5xl sm:text-6xl" : "text-5xl"}`}
        aria-label="Счёт матча"
      >
        <span className="text-primary-2">{totalScore(st, a?.id)}</span>
        <span className="text-2xl text-muted">:</span>
        <span className="text-accent">{totalScore(st, b?.id)}</span>
      </div>
      <div className={`min-w-0 max-w-full truncate font-display uppercase text-accent ${big ? "" : "sm:text-left"} ${name}`}>
        {b?.name ?? "—"}
      </div>
    </div>
  );
}

function MatchButtons({ id, live, organizer }: { id: string; live: boolean; organizer: boolean }) {
  return (
    <div className="flex flex-wrap gap-3">
      {organizer && live && (
        <Link href={`/admin/matches/${id}`} className="btn btn-primary">
          <span>Открыть пульт</span>
        </Link>
      )}
      <Link href={`/tournament/${id}`} className="btn btn-ghost btn-sm">
        <span>Страница матча</span>
      </Link>
      {live && <StreamButtons small />}
    </div>
  );
}

/** Идущий или последний шоу-матч - в той же рамке с постером и призом, что и его анонс. */
function ShowMatchNow({ st, live, organizer }: { st: MatchState; live: boolean; organizer: boolean }) {
  const t = st.tournament;
  const sides = matchSides(st);
  const rounds = [...(t.rounds ?? [])].sort((x, y) => x.number - y.number);
  const winner = (t.participants ?? []).find((p) => p.id === t.winnerParticipantId);

  return (
    <ShowFrame previewUrl={t.previewUrl} title={t.title} label={live ? "Шоу-матч в эфире" : "Последний шоу-матч"}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="pill pill-announce">
          <span>Шоу-матч</span>
        </span>
        {live ? <StatusPill status="live">В эфире</StatusPill> : <StatusPill status="done">Сыгран</StatusPill>}
        <span className="text-sm text-muted">
          {stageLabel(st.stage, st.currentRound || 1, rounds.length)} · {t.mode} · {roundsLabel(rounds.length || t.totalRounds)}
          {t.ratingMultiplier === 2 ? " · рейтинг ×2" : ""}
        </span>
      </div>

      <ScoreLine st={st} sides={sides} big />

      {!live && winner && (
        <div className="flex items-center gap-2 font-display uppercase text-gold">
          <TrophyIcon className="h-5 w-5" /> Победа {winner.name}
        </div>
      )}

      <MatchMaps st={st} rounds={rounds} sides={sides} />

      {t.prize && <PrizeBanner prize={t.prize} />}

      <MatchButtons id={t.id} live={live} organizer={organizer} />
    </ShowFrame>
  );
}

/** Блок матча на главной: идущий (со ссылкой на пульт для организатора) или последний сыгранный. */
export function CurrentMatch({ st, live, organizer }: { st: MatchState; live: boolean; organizer: boolean }) {
  const t = st.tournament;
  if (isShowMatch(t)) return <ShowMatchNow st={st} live={live} organizer={organizer} />;

  const sides = matchSides(st);
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

      <ScoreLine st={st} sides={sides} />

      <MatchMaps st={st} rounds={rounds} sides={sides} />

      <MatchButtons id={t.id} live={live} organizer={organizer} />
    </Panel>
  );
}
