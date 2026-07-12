import Link from "next/link";
import type { TeamLeaderboardRow } from "@/lib/types";
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

/** Рейтинг 2×2 по КОМАНДАМ: пара игроков = команда с одним MMR. */
export function TeamLeaderboardTable({ rows }: { rows: TeamLeaderboardRow[] }) {
  if (!rows.length) {
    return (
      <EmptyState
        title="Рейтинг пока пуст"
        hint="MMR команд появится после первых завершённых матчей 2×2."
      />
    );
  }

  return (
    <div className="panel overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-muted">
            <th className="w-14 px-4 py-3 text-center">#</th>
            <th className="px-4 py-3">Состав</th>
            <th className="px-4 py-3">Победы</th>
            <th className="px-4 py-3 text-center">Матчей</th>
            <th className="px-4 py-3 text-right">MMR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.teamKey || i}
              className="border-b border-[var(--border)] last:border-0 hover:bg-surface-2/40"
            >
              <td className="px-4 py-3 text-center">
                <span className={cn("rank", i < 3 && `rank-${i + 1}`)}>{i + 1}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1.5">
                  {r.members.map((m, mi) => (
                    <Link
                      key={m.userId || mi}
                      href={m.login ? `/profile/${m.login}` : "#"}
                      className="flex items-center gap-2.5 transition hover:opacity-80"
                    >
                      <Avatar
                        name={m.displayName || m.login}
                        src={m.avatarUrl}
                        tone={toneByIndex(i + mi)}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="truncate font-display text-sm uppercase leading-tight">
                          {m.displayName || m.login}
                        </div>
                        {m.login && <div className="truncate text-xs text-muted">@{m.login}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <WinLossBar wins={r.wins} total={r.games} />
              </td>
              <td className="px-4 py-3 text-center tnum text-muted">{r.games}</td>
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
