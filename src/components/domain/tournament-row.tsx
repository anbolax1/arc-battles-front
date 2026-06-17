import Link from "next/link";
import type { Tournament } from "@/lib/types";
import { tournamentName } from "@/lib/display";
import { fmtDay, fmtMonShort, fmtTime } from "@/lib/format";
import { TournamentStatusPill } from "./tournament-status-pill";

/** Строка турнира в списке (расписание, «ближайшие»). Ведёт на деталку. */
export function TournamentRow({ t }: { t: Tournament }) {
  const name = tournamentName(t);
  const maps = t.maps?.length ? t.maps.join(" · ") : "Карты объявим позже";

  return (
    <Link
      href={`/tournament/${t.id}`}
      className="panel glow-edge flex items-center gap-4 p-4 transition hover:-translate-y-0.5 sm:gap-5 sm:p-5"
    >
      <div className="flex w-12 flex-none flex-col items-center text-center">
        <span className="font-display text-2xl leading-none tnum">{fmtDay(t.startsAt) || "—"}</span>
        <span className="text-[0.65rem] uppercase tracking-wide text-muted">
          {fmtMonShort(t.startsAt) || "дата"}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-base uppercase sm:text-lg">{name}</h3>
        <div className="mt-1 truncate text-sm text-muted">
          <span className="text-fg">{t.mode}</span> · {t.totalRounds} раунда · {maps}
          {t.startsAt && (
            <>
              {" · "}
              <span className="tnum">{fmtTime(t.startsAt)}</span> МСК
            </>
          )}
        </div>
      </div>

      <div className="flex-none">
        <TournamentStatusPill status={t.status} />
      </div>
    </Link>
  );
}
