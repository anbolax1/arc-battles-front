import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournament } from "@/lib/queries";
import { tournamentName } from "@/lib/display";
import { TournamentStatusPill } from "@/components/domain/tournament-status-pill";
import { Avatar, toneByIndex } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ArrowLeftIcon, TrophyIcon } from "@/components/icons";
import { fmtDate, fmtTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const ROUND_STATUS: Record<string, string> = {
  pending: "Ожидание",
  live: "Идёт",
  finished: "Завершён",
  done: "Завершён",
};

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTournament(id);
  if (!t) notFound();

  const participants = t.participants ?? [];
  const rounds = [...(t.rounds ?? [])].sort((a, b) => a.number - b.number);
  const winner = t.winnerParticipantId
    ? participants.find((p) => p.id === t.winnerParticipantId)
    : null;
  const time = fmtTime(t.startsAt);

  return (
    <div className="mx-auto max-w-[1240px] space-y-8 px-6 py-12 sm:py-16">
      <Link
        href="/schedule"
        className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-fg"
      >
        <ArrowLeftIcon className="h-4 w-4" /> Все турниры
      </Link>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <TournamentStatusPill status={t.status} />
          <Chip dot>{t.mode}</Chip>
          <Chip cyan dot>
            {t.totalRounds} раунда
          </Chip>
        </div>
        <h1 className="text-3xl sm:text-4xl">{tournamentName(t)}</h1>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted">
          {t.startsAt && (
            <span>
              Дата: <span className="text-fg">{fmtDate(t.startsAt)}</span>
              {time && <span className="text-fg"> · {time} МСК</span>}
            </span>
          )}
          <span>
            Режим: <span className="text-fg">{t.mode}</span>
          </span>
          {t.maps?.length ? (
            <span>
              Карты: <span className="text-fg">{t.maps.join(" · ")}</span>
            </span>
          ) : null}
        </div>
        {t.status === "upcoming" && (
          <div className="pt-1">
            <Link href="/register" className="btn btn-primary">
              <span>Записаться на турнир</span>
            </Link>
          </div>
        )}
      </header>

      {winner && (
        <Panel glow className="flex items-center gap-4 p-5">
          <span className="text-gold">
            <TrophyIcon className="h-7 w-7" />
          </span>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">
              {t.mode === "2x2" ? "Победители" : "Победитель"}
            </div>
            <div className="font-display text-lg uppercase">{winner.name}</div>
          </div>
        </Panel>
      )}

      {t.status === "live" && (
        <Panel glow className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="live-dot" aria-hidden />
            <span className="font-display uppercase">Матч идёт в эфире</span>
          </div>
          <Link href="/overlay" className="btn btn-cyan btn-sm">
            <span>Смотреть</span>
          </Link>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Участники / итоговая таблица */}
        <Panel className="overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-display text-lg uppercase">
              {t.status === "finished" ? "Итоговая таблица" : "Участники"}
            </h2>
          </div>
          {participants.length ? (
            <table className="w-full text-sm">
              <tbody>
                {participants.map((p, i) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="w-12 px-5 py-3 text-center">
                      <span className={cn("rank", i < 3 && `rank-${i + 1}`)}>{i + 1}</span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} tone={toneByIndex(i)} size="sm" />
                        <div className="min-w-0">
                          <span className="font-display uppercase">{p.name}</span>
                          {p.members?.length ? (
                            <div className="text-xs text-muted">{p.members.map((m) => m.name).join(" · ")}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-display tnum text-primary-2">{p.totalPoints}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted">
              Участники ещё не добавлены.
            </div>
          )}
        </Panel>

        {/* Раунды и карты */}
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-wide text-muted">Раунды и карты</div>
          {(rounds.length
            ? rounds.map((r) => ({ key: r.id, number: r.number, map: r.map, status: r.status }))
            : Array.from({ length: t.totalRounds || 3 }, (_, i) => ({
                key: `gen-${i}`,
                number: i + 1,
                map: t.maps?.[i] ?? "",
                status: "",
              }))
          ).map((r) => (
            <Panel key={r.key} className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="font-display uppercase">Раунд {r.number}</div>
                {r.map && <div className="text-sm text-muted">{r.map}</div>}
              </div>
              <span className="text-xs uppercase text-muted">
                {r.status ? (ROUND_STATUS[r.status] ?? r.status) : "—"}
              </span>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
