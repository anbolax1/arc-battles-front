import Link from "next/link";
import { getCurrentMatch, getHighlights, getLeaderboard, getMe, getTournaments } from "@/lib/queries";
import { roleAtLeast } from "@/lib/roles";
import { CurrentMatch } from "@/components/domain/current-match";
import { HighlightsWall } from "@/components/domain/highlights-wall";
import { LeaderboardTable } from "@/components/domain/leaderboard-table";
import { ShowMatchCard } from "@/components/domain/show-match-card";
import { SectionHead } from "@/components/ui/section-head";
import {
  ArrowRightIcon,
  CalendarIcon,
  PlayIcon,
  ScrollIcon,
  TrophyIcon,
} from "@/components/icons";
import { StreamButtons } from "@/components/domain/stream-buttons";
import { isShowMatch } from "@/lib/match";
import type { Tournament } from "@/lib/types";

function byStartAsc(a: Tournament, b: Tournament): number {
  if (!a.startsAt) return 1;
  if (!b.startsAt) return -1;
  return a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0;
}

const QUICK = [
  { href: "/schedule", title: "Расписание", desc: "Анонсы шоу-матчей", Icon: CalendarIcon },
  { href: "/rating", title: "Рейтинг", desc: "Таблица лидеров сезона", Icon: TrophyIcon },
  { href: "/archive", title: "Архив", desc: "Сыгранные матчи и VOD", Icon: PlayIcon },
  { href: "/rules", title: "Правила", desc: "Задания, протоколы, MMR", Icon: ScrollIcon },
];

export default async function HomePage() {
  const [match, top, upcoming, hl, me] = await Promise.all([
    getCurrentMatch(),
    getLeaderboard("1x1"),
    getTournaments("upcoming"),
    getHighlights({ random: true, limit: 3 }),
    getMe(),
  ]);
  const shows = upcoming.filter(isShowMatch).sort(byStartAsc);
  const organizer = !!me && roleAtLeast(me.role, "superadmin");

  return (
    <div className="mx-auto max-w-[1240px] space-y-16 px-6 py-12 sm:py-16">
      {match.current && <CurrentMatch st={match.current} live organizer={organizer} />}
      {!match.current && organizer && (
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <span className="text-sm text-muted">Сейчас матч не идёт.</span>
          <Link href="/admin/matches" className="btn btn-primary btn-sm">
            <span>Новый матч</span>
          </Link>
        </div>
      )}

      {/* Герой */}
      <section className="space-y-6">
        <p className="eyebrow">Серия турниров · Arc Raiders · Live</p>
        <h1 className="max-w-3xl text-4xl leading-[1.05] sm:text-6xl">
          Сражайся за <span className="grad">респект</span> в прямом эфире
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Матчи 1×1 и 2×2 по Arc Raiders в эфире у Дениса Блима. Два раунда,
          пики-баны карт, задания, протоколы и рейтинг по MMR — выходи на арену
          и забирай звание Чемпиона.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/join" className="btn btn-primary">
            <span>Записаться</span>
          </Link>
          <StreamButtons />
        </div>
      </section>

      {!match.current && match.last && <CurrentMatch st={match.last} live={false} organizer={organizer} />}

      {hl.items.length > 0 && <HighlightsWall items={hl.items} />}

      {/* Топ лидеров */}
      <section>
        <SectionHead
          eyebrow="Сезон"
          title="Топ лидеров"
          action={
            <Link href="/rating" className="btn btn-ghost btn-sm">
              <span>Весь рейтинг</span>
              <ArrowRightIcon />
            </Link>
          }
        />
        <LeaderboardTable rows={top} kind="1x1" compact limit={5} />
      </section>

      {/* Запланированный шоу-матч */}
      {shows[0] && (
        <section>
          <SectionHead eyebrow="Скоро" title="Шоу-матч" />
          <ShowMatchCard t={shows[0]} more={shows.length - 1} />
        </section>
      )}

      {/* Куда дальше */}
      <section>
        <SectionHead eyebrow="Навигация" title="Куда дальше" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK.map(({ href, title, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              className="panel group flex flex-col gap-3 p-5 transition hover:-translate-y-1"
            >
              <span className="flex h-10 w-10 items-center justify-center text-accent [clip-path:polygon(18%_0,100%_0,82%_100%,0_100%)] bg-surface-2">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-display text-lg uppercase">{title}</h3>
              <p className="text-sm text-muted">{desc}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm text-primary-2">
                Открыть <ArrowRightIcon className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="panel glow-edge flex flex-col items-start gap-5 bg-[linear-gradient(120deg,rgba(255,106,26,0.12),rgba(192,38,211,0.08))] p-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl">Готов выйти на арену?</h2>
          <p className="max-w-xl text-muted">
            Войди и подай заявку — организатор позовёт тебя на матч.
          </p>
        </div>
        <Link href="/join" className="btn btn-primary flex-none">
          <span>Подать заявку</span>
        </Link>
      </section>
    </div>
  );
}
