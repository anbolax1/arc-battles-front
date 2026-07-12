import type { PlayerProfile } from "@/lib/types";
import { MmrChart } from "./mmr-chart";
import { MmrStatsGrid, MapBreakdown, HeadToHead, TeamsList } from "./mmr-analytics";

/** Секции рейтинга/аналитики/команд игрока — общие для публичного профиля и личного кабинета. */
export function PlayerRatingSections({ profile }: { profile: PlayerProfile }) {
  const { mmr1x1, timeline1x1, maps1x1, opponents1x1, teams } = profile;
  return (
    <>
      {mmr1x1.games > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl">Рейтинг 1×1</h3>
          <MmrStatsGrid stats={mmr1x1} />
          <MmrChart points={timeline1x1} />
        </section>
      )}

      {mmr1x1.games > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl">Аналитика матчей 1×1</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-display text-sm uppercase tracking-wide text-muted">По картам</h4>
              <MapBreakdown maps={maps1x1} />
            </div>
            <div className="space-y-3">
              <h4 className="font-display text-sm uppercase tracking-wide text-muted">Против кого играл</h4>
              <HeadToHead opponents={opponents1x1} />
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-xl">Команды 2×2</h3>
        <TeamsList teams={teams} />
      </section>
    </>
  );
}
