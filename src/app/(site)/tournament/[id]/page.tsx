import Link from "next/link";
import { notFound } from "next/navigation";
import { getHighlights, getMatch, getMatchup } from "@/lib/queries";
import { tournamentName } from "@/lib/display";
import { HighlightsGrid } from "@/components/domain/highlights-grid";
import { HeadToHead, MatchupPanel } from "@/components/domain/matchup-panel";
import { TournamentStatusPill } from "@/components/domain/tournament-status-pill";
import { Panel } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ArrowLeftIcon, CheckIcon, TrophyIcon } from "@/components/icons";
import { StreamButtons } from "@/components/domain/stream-buttons";
import { fmtDate, fmtTime } from "@/lib/format";
import {
  breakdownParts,
  CROSS_POINTS,
  hasScore,
  isShowMatch,
  loadoutLabel,
  mapImage,
  matchSides,
  roundBreakdown,
  roundScore,
  roundsLabel,
  taskDescription,
  taskKindLabel,
  taskTitle,
} from "@/lib/match";
import type { MatchState, Participant } from "@/lib/types";
import { getDesign } from "@/lib/design";
import { SurfaceMatch } from "@/components/surface/pages/match";

/** Что сторона набрала в раунде: из чего сложились очки, задания с наградой и легендарки. */
function RoundSide({ st, round, p, i }: { st: MatchState; round: number; p: Participant; i: number }) {
  const parts = breakdownParts(roundBreakdown(st, round, p.id));
  const tasks = st.tasks.filter((x) => x.roundNumber === round && x.participantId === p.id);
  const legendary = st.legendary.filter((l) => l.roundNumber === round && l.participantId === p.id);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`font-display text-xs uppercase ${i === 0 ? "text-primary-2" : "text-accent"}`}>{p.name}</span>
        <span className="font-display text-lg tnum">{roundScore(st, round, p.id)}</span>
      </div>
      <p className="text-xs text-muted">{parts.length ? parts.join(" · ") : "очков пока нет"}</p>
      {tasks.map((x) => {
        const own = x.completedBy === x.participantId;
        const byOpp = !!x.completedBy && !own;
        return (
          <div key={x.id} className={`flex gap-2.5 text-sm ${x.completedBy ? "" : "text-muted"}`}>
            <span
              className={`w-9 flex-none pt-0.5 text-right font-display text-xs tnum ${own ? "text-ok" : byOpp ? "text-accent" : "text-muted"}`}
            >
              {own ? `+${x.points}` : byOpp ? <CheckIcon className="ml-auto h-3.5 w-3.5" /> : x.points}
            </span>
            <div className="min-w-0">
              <span className="mr-1 text-[0.65rem] uppercase text-muted">{taskKindLabel(x)}</span>«{taskTitle(x)}»
              {taskDescription(x) && <span className="text-muted"> — {taskDescription(x)}</span>}
              {byOpp && <span className="text-accent"> — выполнил соперник, +{CROSS_POINTS} ему</span>}
            </div>
          </div>
        );
      })}
      {legendary.map((l) => (
        <div key={l.id} className="flex gap-2.5 text-sm">
          <span className="w-9 flex-none pt-0.5 text-right font-display text-xs tnum text-gold">+{l.points ?? 0}</span>
          <div className="min-w-0">
            <span className="mr-1 text-[0.65rem] uppercase text-gold">Легендарка</span>
            {l.legendaryText ? `«${l.legendaryText}»` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if ((await getDesign()) === "surface") return <SurfaceMatch id={id} />;
  const st = await getMatch(id);
  if (!st) notFound();
  const t = st.tournament;

  const [{ items: highlights }, matchup] = await Promise.all([getHighlights({ tournamentId: id, limit: 6 }), getMatchup(id)]);

  const sides = matchSides(st);
  const rounds = [...(t.rounds ?? [])].sort((a, b) => a.number - b.number);
  const time = fmtTime(t.startsAt);
  const played = t.status === "finished" || t.status === "live";
  const hasTasks = st.tasks.length > 0;
  const scored = hasScore(st);

  return (
    <div className="mx-auto max-w-[1240px] space-y-8 px-6 py-12 sm:py-16">
      <Link href="/archive" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-fg">
        <ArrowLeftIcon className="h-4 w-4" /> Все матчи
      </Link>

      <header className={t.previewUrl ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start" : ""}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <TournamentStatusPill status={t.status} />
            {isShowMatch(t) && <Chip cyan>Шоу-матч</Chip>}
            <Chip dot>{t.mode}</Chip>
            <Chip cyan dot>
              {roundsLabel(rounds.length || t.totalRounds)}
            </Chip>
            {t.ratingMultiplier === 2 && <Chip dot>рейтинг ×2</Chip>}
          </div>
          <h1 className="text-3xl sm:text-4xl">{tournamentName(t).replace(/^\[история\]\s*/, "")}</h1>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted">
            {t.startsAt && (
              <span>
                Дата: <span className="text-fg">{fmtDate(t.startsAt)}</span>
                {time && <span className="text-fg"> · {time} МСК</span>}
              </span>
            )}
            <span>
              Тип игроков: <span className="text-fg">{t.playerType.toUpperCase()}</span>
            </span>
            {matchup?.season && (
              <span>
                В зачёт: <span className="text-fg">{matchup.season.name}</span>
              </span>
            )}
          </div>
          {t.prize && (
            <div className="inline-flex items-center gap-3 rounded-md bg-[rgba(255,197,61,0.08)] px-4 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,197,61,0.4)]">
              <TrophyIcon className="h-6 w-6 flex-none text-gold" />
              <span className="field-label text-gold">Приз</span>
              <span className="font-display uppercase text-gold">{t.prize}</span>
            </div>
          )}
          {t.status === "upcoming" &&
            (isShowMatch(t) ? (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <StreamButtons />
                <span className="text-sm text-muted">Шоу-матч пройдёт в эфире у Дениса Блима.</span>
              </div>
            ) : (
              <div className="pt-1">
                <Link href="/join" className="btn btn-primary">
                  <span>Записаться на турнир</span>
                </Link>
              </div>
            ))}
        </div>
        {t.previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- картинка из нашего хранилища медиа
          <img
            src={t.previewUrl}
            alt={`Анонс шоу-матча ${t.title}`}
            className="w-full rounded-lg shadow-[0_0_0_1px_var(--border),0_18px_50px_rgba(0,0,0,0.5)]"
          />
        )}
      </header>

      {t.status === "live" && (
        <Panel glow className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="live-dot" aria-hidden />
            <span className="font-display uppercase">Матч идёт в эфире</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <StreamButtons small />
          </div>
        </Panel>
      )}

      <MatchupPanel st={st} matchup={matchup} />

      <HeadToHead st={st} matchup={matchup} />

      {played && rounds.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl">Раунды</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {rounds.map((r) => (
              <div key={r.id} className="panel overflow-hidden">
                <div className="relative h-28">
                  {r.mapCode ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mapImage(r.mapCode)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : null}
                  <span className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20" />
                  <div className="absolute inset-0 flex items-center justify-between gap-3 px-5">
                    <div>
                      <div className="font-display text-xs uppercase text-primary-2">
                        Раунд {r.number}
                        {rounds.length > 1 ? ` · ${loadoutLabel(r.number)}` : ""}
                        {r.status === "live" ? " · идёт" : ""}
                      </div>
                      <div className="font-display text-lg uppercase">{r.map || "Карта не указана"}</div>
                    </div>
                    <span className="font-display text-3xl tnum">
                      {r.status === "pending" || !scored
                        ? "—"
                        : `${roundScore(st, r.number, sides[0]?.id)} : ${roundScore(st, r.number, sides[1]?.id)}`}
                    </span>
                  </div>
                </div>
                {hasTasks && r.status === "pending" && (
                  <p className="p-4 text-sm text-muted">
                    {t.status === "finished" ? "Не сыгран: матч завершили досрочно." : "Задания появятся, когда раунд начнётся."}
                  </p>
                )}
                {hasTasks && r.status !== "pending" && (
                  <div className="grid gap-5 p-4 sm:grid-cols-2">
                    {sides.map((p, i) => (p ? <RoundSide key={p.id} st={st} round={r.number} p={p} i={i} /> : null))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {hasTasks && (
            <p className="text-xs text-muted">
              Слева у задания — сколько очков оно даёт. Задание соперника тоже можно выполнить: это +{CROSS_POINTS}.
            </p>
          )}
        </section>
      )}

      {st.veto.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl">Пики-баны</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {st.veto.map((v) => {
              const banned = v.action === "ban";
              const who = v.side === "A" ? sides[0]?.name : v.side === "B" ? sides[1]?.name : "";
              return (
                <div key={v.seq} className={`panel overflow-hidden ${banned ? "" : "ring-2 ring-[var(--accent)]"}`}>
                  <div className="relative h-24">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mapImage(v.mapCode)}
                      alt=""
                      className={`absolute inset-0 h-full w-full object-cover ${banned ? "opacity-40 grayscale" : ""}`}
                    />
                  </div>
                  <div className="space-y-0.5 px-3 py-2">
                    <div className={`font-display text-xs uppercase ${banned ? "line-through" : ""}`}>{v.mapName}</div>
                    <div className={`text-[0.7rem] uppercase ${banned ? "text-danger" : "text-accent"}`}>
                      {banned ? `бан · ${who}` : v.action === "pick" ? `пик ${who} · раунд ${v.roundNumber}` : `раунд ${v.roundNumber}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {highlights.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl">Хайлайты матча</h2>
            <Link href="/highlights" className="text-sm text-accent transition hover:underline">
              Все хайлайты →
            </Link>
          </div>
          <HighlightsGrid items={highlights} />
        </section>
      )}
    </div>
  );
}
