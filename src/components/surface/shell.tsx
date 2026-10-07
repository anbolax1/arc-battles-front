import type { ReactNode } from "react";
import { getCurrentMatch, getSeasons, getTournaments } from "@/lib/queries";
import { isShowMatch } from "@/lib/match";
import { SurfaceNav, type NavLive } from "@/components/surface/nav";
import { SurfaceFooter, type FooterSeason } from "@/components/surface/footer";
import { PageWipe } from "@/components/surface/wipe";

/** Ближайший по дате анонс. */
export function byStartAsc<T extends { startsAt?: string | null }>(a: T, b: T): number {
  if (!a.startsAt) return 1;
  if (!b.startsAt) return -1;
  return a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0;
}

/** Каркас нового дизайна: шапка, подвал и переход между страницами. */
export async function SurfaceShell({ children }: { children: ReactNode }) {
  const [match, upcoming, seasons] = await Promise.all([getCurrentMatch(), getTournaments("upcoming"), getSeasons()]);
  const numbered = seasons.filter((s) => s.number).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const recap = numbered.find((s) => s.status === "active") ?? numbered[0];
  const season: FooterSeason | null = recap?.number ? { number: recap.number, active: recap.status === "active" } : null;
  let live: NavLive | null = null;
  if (match.current) {
    live = { href: `/tournament/${match.current.tournament.id}`, live: true };
  } else {
    const show = upcoming.filter(isShowMatch).sort(byStartAsc)[0];
    if (show) live = { href: `/tournament/${show.id}`, live: false, startsAt: show.startsAt };
  }

  return (
    <div className="sf-root">
      <a href="#main" className="sf-skip">
        К основному содержимому
      </a>
      <SurfaceNav live={live} />
      <main id="main" className="sf-main">
        {children}
      </main>
      <SurfaceFooter season={season} />
      <PageWipe />
    </div>
  );
}
