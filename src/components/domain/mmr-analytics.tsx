import Link from "next/link";
import type { MmrStats, MapStat, OpponentStat, TeamSummary } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { Avatar, toneByIndex } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";

function Tile({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "primary" | "accent" | "danger" | "muted" }) {
  const cls =
    tone === "accent" ? "text-accent" : tone === "danger" ? "text-danger" : tone === "muted" ? "" : "text-primary-2";
  return (
    <div className="panel p-4">
      <div className={`font-display text-2xl tnum ${cls}`}>{value}</div>
      <div className="mt-0.5 text-sm text-muted">{label}</div>
      {sub != null && sub !== "" && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Сетка ключевых показателей MMR (одинакова для игрока и команды). */
export function MmrStatsGrid({ stats }: { stats: MmrStats }) {
  const streak =
    stats.currentStreakLen > 0 && stats.currentStreakKind
      ? {
          value: stats.currentStreakLen,
          sub: stats.currentStreakKind === "win" ? "побед подряд" : "поражений подряд",
          tone: stats.currentStreakKind === "win" ? ("accent" as const) : ("danger" as const),
        }
      : { value: "—", sub: "нет серии", tone: "muted" as const };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile label="Текущий MMR" value={stats.currentMmr} sub={stats.place > 0 ? `#${stats.place} в таблице` : "вне рейтинга"} />
      <Tile label="Пик MMR" value={stats.peakMmr} tone="accent" />
      <Tile label="Винрейт" value={`${stats.winrate}%`} sub={`${stats.wins}–${stats.losses}`} />
      <Tile label="Матчей" value={stats.games} sub={stats.firstMatch ? `с ${fmtDate(stats.firstMatch)}` : ""} tone="muted" />
      <Tile label="Текущая серия" value={streak.value} sub={streak.sub} tone={streak.tone} />
      <Tile label="Лучший вин-стрик" value={stats.bestWinStreak} tone="accent" />
      <Tile label="Худший луз-стрик" value={stats.bestLossStreak} tone="danger" />
      <Tile label="Первый матч" value={stats.firstMatch ? fmtDate(stats.firstMatch) : "—"} tone="muted" />
    </div>
  );
}

function WLBar({ wins, losses }: { wins: number; losses: number }) {
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

/** Разбивка матчей по картам. */
export function MapBreakdown({ maps }: { maps: MapStat[] }) {
  if (!maps.length) return <EmptyState title="Нет данных по картам" />;
  const max = Math.max(...maps.map((m) => m.games), 1);
  return (
    <div className="panel divide-y divide-[var(--border)]">
      {maps.map((m) => (
        <div key={m.map} className="flex items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-sm uppercase">{m.map}</div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-[var(--primary-2)]" style={{ width: `${(m.games / max) * 100}%` }} />
            </div>
          </div>
          <div className="flex-none tnum text-sm text-muted">{m.games} матч.</div>
          <div className="flex-none">
            <WLBar wins={m.wins} losses={m.losses} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Head-to-head против соперников (игроков или команд), самые частые сверху. */
export function HeadToHead({ opponents }: { opponents: OpponentStat[] }) {
  if (!opponents.length) return <EmptyState title="Нет соперников" hint="Появятся после первых матчей." />;
  return (
    <div className="panel divide-y divide-[var(--border)]">
      {opponents.map((o, i) => {
        const href = o.login ? `/profile/${o.login}` : o.teamKey ? `/teams/${encodeURIComponent(o.teamKey)}` : null;
        const inner = (
          <>
            <Avatar name={o.name} tone={toneByIndex(i)} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-sm uppercase">{o.name || "—"}</div>
              <div className="text-xs text-muted">{o.games} матч(ей)</div>
            </div>
            <WLBar wins={o.wins} losses={o.losses} />
          </>
        );
        return href ? (
          <Link key={i} href={href} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2/40">
            {inner}
          </Link>
        ) : (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/** Список команд игрока (2×2) с MMR/местом — ссылки на страницы команд. */
export function TeamsList({ teams }: { teams: TeamSummary[] }) {
  if (!teams.length) return <EmptyState title="Пока нет команд" hint="Сыграй матч 2×2, чтобы появилась команда." />;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {teams.map((t, i) => (
        <Link
          key={t.teamKey}
          href={`/teams/${encodeURIComponent(t.teamKey)}`}
          className="panel flex items-center gap-4 p-4 transition hover:-translate-y-0.5"
        >
          <div className="flex -space-x-2">
            {t.members.map((m, mi) => (
              <Avatar key={m.userId || mi} name={m.displayName || m.login} src={m.avatarUrl} tone={toneByIndex(i + mi)} size="sm" />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-base uppercase leading-tight text-primary-2">
              {t.name || t.members.map((m) => m.displayName || m.login).join(" & ")}
            </div>
            <div className="truncate text-xs text-muted">
              {t.members.map((m) => m.displayName || m.login).join(" & ")}
            </div>
            <div className="text-xs text-muted">
              {t.place > 0 ? `#${t.place} · ` : ""}
              {t.wins}–{t.losses}
            </div>
          </div>
          <div className="flex-none font-display text-lg tnum text-primary-2">{t.mmr}</div>
        </Link>
      ))}
    </div>
  );
}
