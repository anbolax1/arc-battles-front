import Link from "next/link";
import type { SideScore, Tournament } from "@/lib/types";
import { tournamentName } from "@/lib/display";
import { fmtDay, fmtMonShort, fmtTime } from "@/lib/format";
import { isShowMatch, roundsLabel } from "@/lib/match";
import { TrophyIcon } from "@/components/icons";
import { TournamentStatusPill } from "./tournament-status-pill";

/** Итог сыгранного матча: счёт и победитель. У матчей из таблицы очков нет - только победитель. */
function Result({ score }: { score: SideScore[] }) {
  const [a, b] = score;
  const winner = score.find((s) => s.winner);
  const scored = a.points > 0 || b.points > 0;
  return (
    <div className="flex items-center gap-3 sm:block sm:space-y-1 sm:text-right">
      {scored && (
        <div className="font-display text-2xl leading-none tnum">
          <span className="text-primary-2">{a.points}</span>
          <span className="mx-1.5 text-base text-muted">:</span>
          <span className="text-accent">{b.points}</span>
        </div>
      )}
      <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-gold">
        {winner && <TrophyIcon className="h-3.5 w-3.5" />}
        {winner ? `победа ${winner.name}` : "ничья"}
      </div>
    </div>
  );
}

/** Строка матча в расписании: у будущего - статус, у сыгранного - итог и карты раундов. */
export function TournamentRow({ t }: { t: Tournament }) {
  const name = tournamentName(t);
  const maps = t.roundMaps?.length ? t.roundMaps : t.maps;
  const score = t.status === "finished" && t.score?.length === 2 ? t.score : null;

  return (
    <Link
      href={`/tournament/${t.id}`}
      className="panel glow-edge flex flex-wrap items-center gap-x-4 gap-y-2 p-4 transition hover:-translate-y-0.5 sm:flex-nowrap sm:gap-5 sm:p-5"
    >
      <div className="flex w-12 flex-none flex-col items-center text-center">
        <span className="font-display text-2xl leading-none tnum">{fmtDay(t.startsAt) || "—"}</span>
        <span className="text-[0.65rem] uppercase tracking-wide text-muted">
          {fmtMonShort(t.startsAt) || "дата"}
        </span>
      </div>

      {t.previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- картинка из нашего хранилища медиа
        <img src={t.previewUrl} alt="" className="hidden h-14 w-24 flex-none rounded object-cover sm:block" />
      )}

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-base uppercase sm:text-lg">{name}</h3>
        <div className="mt-1 truncate text-sm text-muted">
          {isShowMatch(t) && <span className="text-accent">Шоу-матч · </span>}
          <span className="text-fg">{t.mode}</span> · {roundsLabel(t.totalRounds || 1)}
          {t.ratingMultiplier === 2 && " · рейтинг ×2"}
          {t.startsAt && (
            <>
              {" · "}
              <span className="tnum">{fmtTime(t.startsAt)}</span> МСК
            </>
          )}
          {t.prize && <span className="text-gold"> · приз: {t.prize}</span>}
        </div>
        {maps.length > 0 && <div className="mt-1 truncate text-xs text-muted">{maps.join(" · ")}</div>}
      </div>

      {/* На телефоне итог или статус - отдельной строкой под текстом, чтобы название не обрезалось. */}
      <div className="w-full pl-16 sm:w-auto sm:flex-none sm:pl-0">
        {score ? <Result score={score} /> : <TournamentStatusPill status={t.status} />}
      </div>
    </Link>
  );
}
