import Link from "next/link";
import { Countdown } from "@/components/domain/countdown";
import { ChanceBar } from "@/components/domain/matchup-panel";
import { PrizeBanner, ShowFrame, showNameSize } from "@/components/domain/show-frame";
import { StreamButtons } from "@/components/domain/stream-buttons";
import { ArrowRightIcon } from "@/components/icons";
import { fmtDate, fmtTime } from "@/lib/format";
import { roundsLabel } from "@/lib/match";
import type { Matchup, MatchupSide, Tournament } from "@/lib/types";

/** Где сторона в сезоне: MMR и место, у новичка - пометка. */
function Standing({ side }: { side?: MatchupSide }) {
  if (!side?.mmr) return null;
  return (
    <div className="text-sm tnum text-muted">
      <span className="font-display text-fg">{side.mmr}</span> MMR
      {side.place ? ` · ${side.place} место` : ""}
      {side.isNew ? " · новичок сезона" : ""}
    </div>
  );
}

/** Анонс ближайшего шоу-матча на главной: постер, стороны с рейтингом, приз и отсчёт до начала. */
export function ShowMatchCard({ t, matchup, more }: { t: Tournament; matchup: Matchup | null; more: number }) {
  const [a, b] = t.title.split(/\s+vs\s+/i);
  const nameSize = showNameSize(a, b);
  const [sa, sb] = matchup?.sides ?? [];
  const chance = sa?.winChance != null && sb?.winChance != null ? ([sa.winChance, sb.winChance] as const) : null;

  return (
    <ShowFrame previewUrl={t.previewUrl} title={t.title} label="Ближайший шоу-матч">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="pill pill-announce">
            <span>Шоу-матч</span>
          </span>
          <span className="font-display uppercase">
            {fmtDate(t.startsAt)} · <span className="tnum">{fmtTime(t.startsAt)}</span> МСК
          </span>
          <span className="text-sm text-muted">
            {t.mode} · {roundsLabel(t.totalRounds)}
            {t.ratingMultiplier === 2 ? " · рейтинг ×2" : ""}
          </span>
        </div>
        {t.startsAt && (
          <div className="flex items-baseline gap-2 rounded-md bg-black/30 px-3 py-1.5 shadow-[inset_0_0_0_1px_var(--border)]">
            <span className="text-xs uppercase tracking-wide text-muted">до начала</span>
            <Countdown to={t.startsAt} className="font-display text-lg text-primary-2" />
          </div>
        )}
      </div>

      {/* Ники прижаты к VS с одинаковым отступом; строка слева с небольшим отступом, как и в идущем матче. */}
      <div className="flex flex-col items-center gap-x-6 gap-y-1 text-center sm:flex-row sm:pl-6 sm:text-left">
        <div className="min-w-0 max-w-full space-y-1">
          <div className={`truncate font-display uppercase text-primary-2 ${nameSize}`}>{a || t.title}</div>
          <Standing side={sa} />
        </div>
        <span className="grad flex-none font-display text-3xl sm:text-4xl">VS</span>
        <div className="min-w-0 max-w-full space-y-1">
          <div className={`truncate font-display uppercase text-accent ${nameSize}`}>{b || "—"}</div>
          <Standing side={sb} />
        </div>
      </div>

      {chance && <ChanceBar a={chance[0]} b={chance[1]} />}

      {t.prize && <PrizeBanner prize={t.prize} />}

      <div className="flex flex-wrap items-center gap-3">
        <StreamButtons small />
        <Link href={`/tournament/${t.id}`} className="btn btn-ghost btn-sm">
          <span>Страница матча</span>
        </Link>
        {more > 0 && (
          <Link href="/schedule" className="ml-auto inline-flex items-center gap-1 text-sm text-accent hover:underline">
            Ещё {more} в расписании <ArrowRightIcon className="h-4 w-4" />
          </Link>
        )}
      </div>
    </ShowFrame>
  );
}
