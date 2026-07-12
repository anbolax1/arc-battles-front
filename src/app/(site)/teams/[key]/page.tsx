import Link from "next/link";
import { getTeam } from "@/lib/queries";
import { MmrChart } from "@/components/domain/mmr-chart";
import { MmrStatsGrid, MapBreakdown, HeadToHead } from "@/components/domain/mmr-analytics";
import { Avatar, toneByIndex } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/card";
import { SectionHead } from "@/components/ui/section-head";

export default async function TeamPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const team = await getTeam(key);

  if (!team) {
    return (
      <div className="mx-auto max-w-[1240px] space-y-4 px-6 py-24 text-center">
        <h1 className="text-3xl">Команда не найдена</h1>
        <p className="text-muted">Возможно, эта пара ещё не сыграла ни одного матча 2×2.</p>
        <div className="pt-2">
          <Link href="/rating" className="btn btn-primary">
            <span>К рейтингу</span>
          </Link>
        </div>
      </div>
    );
  }

  const roster = team.members.map((m) => m.displayName || m.login).join(" & ");
  const name = team.name || roster;

  return (
    <div className="mx-auto max-w-[1240px] space-y-8 px-6 py-12 sm:py-16">
      <SectionHead eyebrow="Команда 2×2" title={name} />

      {/* Состав */}
      <Panel glow className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-8">
        {team.members.map((m, i) => (
          <Link key={m.userId || i} href={`/profile/${m.login}`} className="flex items-center gap-3 transition hover:opacity-80">
            <Avatar name={m.displayName || m.login} src={m.avatarUrl} tone={toneByIndex(i)} size="lg" />
            <div>
              <div className="font-display text-lg uppercase leading-tight">{m.displayName || m.login}</div>
              <div className="text-sm text-muted">@{m.login}</div>
            </div>
          </Link>
        ))}
        <div className="sm:ml-auto text-right">
          <div className="font-display text-3xl tnum text-primary-2">{team.stats.currentMmr}</div>
          <div className="text-sm text-muted">{team.stats.place > 0 ? `#${team.stats.place} в таблице 2×2` : "вне рейтинга"}</div>
        </div>
      </Panel>

      {/* Показатели + динамика */}
      <MmrStatsGrid stats={team.stats} />
      {team.stats.games > 0 && <MmrChart points={team.timeline} />}

      {/* Аналитика */}
      {team.stats.games > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl">Аналитика матчей</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-display text-sm uppercase tracking-wide text-muted">По картам</h4>
              <MapBreakdown maps={team.maps} />
            </div>
            <div className="space-y-3">
              <h4 className="font-display text-sm uppercase tracking-wide text-muted">Против кого играли</h4>
              <HeadToHead opponents={team.opponents} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
