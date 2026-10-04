import Link from "next/link";
import { getTournaments } from "@/lib/queries";
import { TournamentRow } from "@/components/domain/tournament-row";
import { SectionHead } from "@/components/ui/section-head";
import { EmptyState } from "@/components/ui/empty-state";
import { isShowMatch } from "@/lib/match";
import type { Tournament } from "@/lib/types";

export const metadata = {
  title: "Расписание — Битва за Респект",
  description: "Когда ближайшие шоу-матчи по Arc Raiders и какие уже прошли.",
};

function byStartAsc(a: Tournament, b: Tournament): number {
  if (!a.startsAt) return 1;
  if (!b.startsAt) return -1;
  return a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0;
}

export default async function SchedulePage() {
  const all = await getTournaments();
  const future = all.filter((t) => t.status !== "finished").sort(byStartAsc);
  // Обычные матчи ведущий создаёт прямо в эфире, поэтому в прошлом расписания - только шоу-матчи.
  const past = all.filter((t) => t.status === "finished" && isShowMatch(t)).sort((a, b) => -byStartAsc(a, b));

  return (
    <div className="mx-auto max-w-[1240px] space-y-12 px-6 py-12 sm:py-16">
      <div className="space-y-3">
        <SectionHead eyebrow="Когда битвы" title="Расписание шоу-матчей" />
        <p className="max-w-2xl text-sm text-muted">
          Обычные матчи ведущий собирает прямо в эфире, все сыгранные — в <Link href="/archive" className="text-accent hover:underline">архиве</Link>.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl">Ближайшие</h2>
        {future.length ? (
          <div className="space-y-3">
            {future.map((t) => (
              <TournamentRow key={t.id} t={t} />
            ))}
          </div>
        ) : (
          <EmptyState title="Шоу-матчей пока не объявили" hint="Загляни позже — анонсы появятся здесь." />
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl">Прошедшие шоу-матчи</h2>
        {past.length ? (
          <div className="space-y-3">
            {past.map((t) => (
              <TournamentRow key={t.id} t={t} />
            ))}
          </div>
        ) : (
          <EmptyState title="Пока пусто" hint="Здесь появятся сыгранные шоу-матчи." />
        )}
      </section>
    </div>
  );
}
