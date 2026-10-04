import Link from "next/link";
import { notFound } from "next/navigation";
import { getHighlights, getMatch } from "@/lib/queries";
import { tournamentName } from "@/lib/display";
import { HighlightsGrid } from "@/components/domain/highlights-grid";
import { TournamentStatusPill } from "@/components/domain/tournament-status-pill";
import { Avatar, toneByIndex } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ArrowLeftIcon, CheckIcon, TrophyIcon } from "@/components/icons";
import { StreamButtons } from "@/components/domain/stream-buttons";
import { fmtDate, fmtTime } from "@/lib/format";
import {
  loadoutLabel,
  mapImage,
  matchSides,
  roundScore,
  taskDescription,
  taskKindLabel,
  taskTitle,
  totalScore,
} from "@/lib/match";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const st = await getMatch(id);
  if (!st) notFound();
  const t = st.tournament;

  const { items: highlights } = await getHighlights({ tournamentId: id, limit: 6 });

  const sides = matchSides(st);
  const rounds = [...(t.rounds ?? [])].sort((a, b) => a.number - b.number);
  const winner = t.winnerParticipantId ? (t.participants ?? []).find((p) => p.id === t.winnerParticipantId) : null;
  const mmrByPid = new Map((t.mmrChanges ?? []).map((c) => [c.participantId, c]));
  const time = fmtTime(t.startsAt);
  const played = t.status === "finished" || t.status === "live";
  const hasTasks = st.tasks.length > 0;

  return (
    <div className="mx-auto max-w-[1240px] space-y-8 px-6 py-12 sm:py-16">
      <Link href="/archive" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-fg">
        <ArrowLeftIcon className="h-4 w-4" /> Все матчи
      </Link>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <TournamentStatusPill status={t.status} />
          <Chip dot>{t.mode}</Chip>
          <Chip cyan dot>
            {rounds.length > 1 ? `${rounds.length} раунда` : "1 раунд"}
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
        </div>
        {t.status === "upcoming" && (
          <div className="pt-1">
            <Link href="/join" className="btn btn-primary">
              <span>Записаться на турнир</span>
            </Link>
          </div>
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

      <Panel className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          {sides.map((p, i) => {
            if (!p) return null;
            const c = mmrByPid.get(p.id);
            return (
              <div key={p.id} className={`flex min-w-0 flex-1 items-center gap-4 ${i === 1 ? "flex-row-reverse text-right" : ""}`}>
                <Avatar name={p.name} tone={toneByIndex(i)} />
                <div className="min-w-0">
                  <div className={`truncate font-display text-xl uppercase ${i === 0 ? "text-primary-2" : "text-accent"}`}>
                    {p.name}
                    {winner?.id === p.id && <TrophyIcon className="ml-2 inline h-5 w-5 text-gold" />}
                  </div>
                  {p.members?.length ? <div className="text-xs text-muted">{p.members.map((m) => m.name).join(" · ")}</div> : null}
                  {c && (
                    <div className="text-sm tnum text-muted">
                      MMR {c.after}{" "}
                      <span className={c.delta >= 0 ? "text-accent" : "text-danger"}>
                        ({c.delta >= 0 ? "+" : ""}
                        {c.delta})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {played && (
          <div className="mt-4 text-center font-display text-5xl leading-none tnum">
            <span className="text-primary-2">{totalScore(st, sides[0]?.id)}</span>
            <span className="mx-3 text-2xl text-muted">:</span>
            <span className="text-accent">{totalScore(st, sides[1]?.id)}</span>
          </div>
        )}
      </Panel>

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
                      </div>
                      <div className="font-display text-lg uppercase">{r.map || "Карта не указана"}</div>
                    </div>
                    <span className="font-display text-3xl tnum">
                      {r.status === "pending"
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
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    {sides.map((p, i) =>
                      p ? (
                        <div key={p.id} className="space-y-1.5">
                          <div className={`font-display text-xs uppercase ${i === 0 ? "text-primary-2" : "text-accent"}`}>{p.name}</div>
                          {st.tasks
                            .filter((x) => x.roundNumber === r.number && x.participantId === p.id)
                            .map((x) => {
                              const done = !!x.completedBy;
                              const own = x.completedBy === x.participantId;
                              return (
                                <div key={x.id} className={`text-sm ${done ? "" : "text-muted"}`}>
                                  <span className="mr-1 text-[0.65rem] uppercase text-muted">{taskKindLabel(x)}</span>
                                  {done && <CheckIcon className={`mr-1 inline h-3.5 w-3.5 ${own ? "text-ok" : "text-accent"}`} />}
                                  «{taskTitle(x)}»
                                  {taskDescription(x) && <span className="text-muted"> — {taskDescription(x)}</span>}
                                  {done && !own && <span className="text-accent"> (выполнил соперник)</span>}
                                </div>
                              );
                            })}
                        </div>
                      ) : null,
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
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
