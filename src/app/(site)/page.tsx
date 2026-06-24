import Link from "next/link";
import { getHighlights, getLeaderboard, getOverlayState, getTournaments } from "@/lib/queries";
import { LiveBanner } from "@/components/domain/live-banner";
import { HighlightsWall } from "@/components/domain/highlights-wall";
import { LeaderboardTable } from "@/components/domain/leaderboard-table";
import { TournamentRow } from "@/components/domain/tournament-row";
import { SectionHead } from "@/components/ui/section-head";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowRightIcon,
  CalendarIcon,
  PlayIcon,
  ScrollIcon,
  TrophyIcon,
  TwitchIcon,
} from "@/components/icons";
import { STREAM_URL } from "@/lib/links";
import type { Tournament } from "@/lib/types";

function byStartAsc(a: Tournament, b: Tournament): number {
  if (!a.startsAt) return 1;
  if (!b.startsAt) return -1;
  return a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0;
}

const QUICK = [
  { href: "/schedule", title: "Расписание", desc: "Когда ближайшие битвы", Icon: CalendarIcon },
  { href: "/rating", title: "Рейтинг", desc: "Таблица лидеров сезона", Icon: TrophyIcon },
  { href: "/archive", title: "Архив", desc: "Прошедшие турниры и VOD", Icon: PlayIcon },
  { href: "/rules", title: "Правила", desc: "Контракты, протоколы, MMR", Icon: ScrollIcon },
];

export default async function HomePage() {
  const [live, top, upcoming, hl] = await Promise.all([
    getOverlayState(),
    getLeaderboard("1x1"),
    getTournaments("upcoming"),
    getHighlights({ random: true, limit: 3 }),
  ]);
  const nextMatches = [...upcoming].sort(byStartAsc).slice(0, 3);

  return (
    <div className="mx-auto max-w-[1240px] space-y-16 px-6 py-12 sm:py-16">
      {/* Герой */}
      <section className="space-y-6">
        <p className="eyebrow">Серия турниров · Arc Raiders · Live</p>
        <h1 className="max-w-3xl text-4xl leading-[1.05] sm:text-6xl">
          Сражайся за <span className="grad">респект</span> в прямом эфире
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Турниры 1×1 и 2×2 по Arc Raiders в эфире у Дениса Блима. Контракты,
          протоколы рейда и рейтинг по MMR — выходи на арену и забирай звание
          Чемпиона.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/join" className="btn btn-primary">
            <span>Записаться</span>
          </Link>
          <a href={STREAM_URL} target="_blank" rel="noreferrer" className="btn btn-twitch">
            <TwitchIcon />
            <span>Смотреть эфир</span>
          </a>
        </div>
      </section>

      {live && <LiveBanner state={live} />}

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

      {/* Ближайшие битвы */}
      <section>
        <SectionHead
          eyebrow="Скоро"
          title="Ближайшие битвы"
          action={
            <Link href="/schedule" className="btn btn-ghost btn-sm">
              <span>Всё расписание</span>
              <ArrowRightIcon />
            </Link>
          }
        />
        {nextMatches.length ? (
          <div className="space-y-3">
            {nextMatches.map((t) => (
              <TournamentRow key={t.id} t={t} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Ближайших турниров пока нет"
            hint="Следи за анонсами — расписание скоро обновится."
          />
        )}
      </section>

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
            Войди, укажи Embark ID в профиле и подай заявку на ближайший турнир.
          </p>
        </div>
        <Link href="/join" className="btn btn-primary flex-none">
          <span>Подать заявку</span>
        </Link>
      </section>
    </div>
  );
}
