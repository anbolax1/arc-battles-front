import Link from "next/link";
import type { Tournament } from "@/lib/types";
import { tournamentName } from "@/lib/display";
import { fmtDate } from "@/lib/format";
import { TournamentStatusPill } from "./tournament-status-pill";

/** Карточка завершённого турнира для сетки архива. */
export function ArchiveCard({ t }: { t: Tournament }) {
  const name = tournamentName(t);
  const maps = t.maps?.length ? t.maps.join(" · ") : "—";

  return (
    <Link
      href={`/tournament/${t.id}`}
      className="panel group flex flex-col overflow-hidden transition hover:-translate-y-1"
    >
      <div className="relative flex items-center justify-between gap-3 bg-[linear-gradient(120deg,rgba(255,106,26,0.16),rgba(192,38,211,0.1))] px-5 py-4">
        <span className="font-display text-sm uppercase tracking-wider text-primary-2">
          {t.mode}
        </span>
        <TournamentStatusPill status={t.status} />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-5 py-4">
        <h3 className="font-display text-lg uppercase leading-tight">{name}</h3>
        <p className="text-sm text-muted">{maps}</p>
        <p className="mt-auto pt-2 text-xs uppercase tracking-wide text-muted">
          {fmtDate(t.startsAt)} · итоги и VOD
        </p>
      </div>
    </Link>
  );
}
