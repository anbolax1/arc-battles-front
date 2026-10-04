import Link from "next/link";
import { getCurrentMatch, getTournaments } from "@/lib/queries";
import { isShowMatch, matchSides, roundsLabel, stageLabel, totalScore } from "@/lib/match";
import { fmtDate, fmtTime } from "@/lib/format";
import { Panel } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { SectionHead } from "@/components/ui/section-head";
import { NewMatchForm } from "@/components/admin/match/new-match-form";
import type { Tournament } from "@/lib/types";

export const metadata = { title: "Матчи — Кабинет" };

function byStartAsc(a: Tournament, b: Tournament): number {
  return (a.startsAt ?? "").localeCompare(b.startsAt ?? "");
}

export default async function AdminMatchesPage() {
  const [{ current }, finished, upcoming] = await Promise.all([
    getCurrentMatch(),
    getTournaments("finished"),
    getTournaments("upcoming"),
  ]);
  const recent = finished.slice(0, 12);
  const planned = [...upcoming].sort(byStartAsc);

  return (
    <div className="space-y-8">
      <SectionHead eyebrow="Кабинет" title={current ? "Текущий матч" : "Новый матч"} />

      {current &&
        (() => {
          const [a, b] = matchSides(current);
          const total = current.tournament.rounds?.length ?? 2;
          return (
            <Panel glow className="flex flex-wrap items-center gap-x-8 gap-y-4 p-6">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill status="live">Идёт</StatusPill>
                  {isShowMatch(current.tournament) && <span className="chip chip-cyan"><span>Шоу-матч</span></span>}
                  <span className="text-sm text-muted">{stageLabel(current.stage, current.currentRound || 1, total)}</span>
                </div>
                <div className="truncate font-display text-2xl uppercase">{current.tournament.title}</div>
                <p className="text-sm text-muted">
                  Новый матч можно создать, когда этот завершится или будет отменён. Шоу-матч можно запланировать и сейчас.
                </p>
              </div>
              <div className="flex items-center gap-3 font-display text-4xl leading-none tnum">
                <span className="text-primary-2">{totalScore(current, a?.id)}</span>
                <span className="text-xl text-muted">:</span>
                <span className="text-accent">{totalScore(current, b?.id)}</span>
              </div>
              <Link href={`/admin/matches/${current.tournament.id}`} className="btn btn-primary">
                <span>Открыть пульт →</span>
              </Link>
            </Panel>
          );
        })()}

      {current && <h3 className="font-display text-lg uppercase">Запланировать шоу-матч</h3>}
      <NewMatchForm liveMatchId={current?.tournament.id} />

      {planned.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-display text-lg uppercase">Запланированные шоу-матчи</h3>
          <Panel className="divide-y divide-[var(--border)]">
            {planned.map((t) => (
              <Link
                key={t.id}
                href={`/admin/matches/${t.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition hover:bg-[var(--surface-2)]"
              >
                <span className="w-44 flex-none text-sm text-muted">
                  {fmtDate(t.startsAt)} · <span className="tnum">{fmtTime(t.startsAt)}</span> МСК
                </span>
                <span className="min-w-0 flex-1 truncate font-display uppercase">{t.title}</span>
                <span className="text-xs text-muted">
                  {t.mode} · {roundsLabel(t.totalRounds)}
                  {t.ratingMultiplier === 2 ? " · ×2" : ""}
                </span>
                <span className="text-sm text-accent">Открыть →</span>
              </Link>
            ))}
          </Panel>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="font-display text-lg uppercase">Последние матчи</h3>
        {recent.length ? (
          <Panel className="divide-y divide-[var(--border)]">
            {recent.map((t) => (
              <Link
                key={t.id}
                href={`/admin/matches/${t.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition hover:bg-[var(--surface-2)]"
              >
                <span className="w-28 flex-none text-sm text-muted">{fmtDate(t.startsAt ?? t.createdAt)}</span>
                <span className="min-w-0 flex-1 truncate font-display uppercase">{t.title.replace(/^\[история\]\s*/, "")}</span>
                <span className="text-xs text-muted">
                  {isShowMatch(t) ? "шоу-матч · " : ""}
                  {t.mode} · {roundsLabel(t.totalRounds)}
                  {t.ratingMultiplier === 2 ? " · ×2" : ""}
                </span>
              </Link>
            ))}
          </Panel>
        ) : (
          <p className="text-sm text-muted">Сыгранных матчей пока нет.</p>
        )}
      </section>
    </div>
  );
}
