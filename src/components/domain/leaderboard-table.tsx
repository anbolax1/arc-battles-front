import Link from "next/link";
import type { LeaderboardRow } from "@/lib/types";
import { Avatar, toneByIndex } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

function WinLossBar({ wins, total }: { wins: number; total: number }) {
  const losses = Math.max(0, total - wins);
  const sum = wins + losses;
  const wPct = sum > 0 ? (wins / sum) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="wl-bar w-24">
        <span className="w" style={{ width: `${wPct}%` }} />
        <span className="l" style={{ width: `${100 - wPct}%` }} />
      </div>
      <span className="text-xs text-muted tnum">
        {wins}–{losses}
      </span>
    </div>
  );
}

export interface LeaderboardTableProps {
  rows: LeaderboardRow[];
  /** 2×2 показывает «Состав» вместо «Игрок» в заголовке. */
  kind?: "1x1" | "2x2";
  /** Компактный вид для главной (топ-5, без энергобара). */
  compact?: boolean;
  limit?: number;
}

export function LeaderboardTable({ rows, kind = "1x1", compact = false, limit }: LeaderboardTableProps) {
  const shown = limit ? rows.slice(0, limit) : rows;

  if (!shown.length) {
    return (
      <EmptyState
        title="Рейтинг пока пуст"
        hint="MMR появится после первых завершённых турниров сезона."
      />
    );
  }

  return (
    <div className="panel overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-muted">
            <th className="w-14 px-4 py-3 text-center">#</th>
            <th className="px-4 py-3">{kind === "2x2" ? "Состав" : "Игрок"}</th>
            {!compact && <th className="px-4 py-3">Победы</th>}
            {!compact && <th className="px-4 py-3 text-center">Турниров</th>}
            {!compact && <th className="px-4 py-3 text-right">Очки</th>}
            <th className="px-4 py-3 text-right">MMR</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr
              key={r.userId || `${r.login}-${i}`}
              className="border-b border-[var(--border)] last:border-0 hover:bg-surface-2/40"
            >
              <td className="px-4 py-3 text-center">
                <span className={cn("rank", i < 3 && `rank-${i + 1}`)}>{i + 1}</span>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={r.login ? `/profile/${r.login}` : "#"}
                  className="flex items-center gap-3 transition hover:opacity-80"
                >
                  <Avatar
                    name={r.displayName || r.login}
                    src={r.avatarUrl}
                    tone={toneByIndex(i)}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-display text-sm uppercase leading-tight">
                      {r.displayName || r.login}
                    </div>
                    {r.login && <div className="truncate text-xs text-muted">@{r.login}</div>}
                  </div>
                </Link>
              </td>
              {!compact && (
                <td className="px-4 py-3">
                  <WinLossBar wins={r.wins} total={r.tournaments} />
                </td>
              )}
              {!compact && (
                <td className="px-4 py-3 text-center tnum text-muted">{r.tournaments}</td>
              )}
              {!compact && (
                <td className="px-4 py-3 text-right tnum text-muted">{r.points}</td>
              )}
              <td className="px-4 py-3 text-right">
                <span className="font-display text-base tnum text-primary-2">{r.mmr}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
