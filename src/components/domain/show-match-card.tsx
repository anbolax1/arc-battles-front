import Link from "next/link";
import { Panel } from "@/components/ui/card";
import { StreamButtons } from "@/components/domain/stream-buttons";
import { fmtDate, fmtTime } from "@/lib/format";
import { roundsLabel } from "@/lib/match";
import type { Tournament } from "@/lib/types";

/** Анонс ближайшего шоу-матча на главной. */
export function ShowMatchCard({ t, more }: { t: Tournament; more: number }) {
  const [a, b] = t.title.split(/\s+vs\s+/i);
  return (
    <Panel glow className="space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display text-lg uppercase">
          {fmtDate(t.startsAt)} · <span className="tnum">{fmtTime(t.startsAt)}</span> МСК
        </span>
        <span className="text-sm text-muted">
          {t.mode} · {roundsLabel(t.totalRounds)}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="min-w-0 flex-1 truncate font-display text-2xl uppercase text-primary-2 sm:text-3xl">{a || t.title}</span>
        <span className="font-display text-xl text-muted">VS</span>
        <span className="min-w-0 flex-1 truncate text-right font-display text-2xl uppercase text-accent sm:text-3xl">
          {b || "—"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/tournament/${t.id}`} className="btn btn-ghost btn-sm">
          <span>Страница матча</span>
        </Link>
        <StreamButtons small />
        {more > 0 && (
          <Link href="/schedule" className="ml-auto text-sm text-accent hover:underline">
            Ещё {more} в расписании →
          </Link>
        )}
      </div>
    </Panel>
  );
}
