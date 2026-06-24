import { Panel } from "@/components/ui/card";
import type { PlayerStats } from "@/lib/types";

/** Русская плюрализация: 1 победа / 2 победы / 5 побед. */
function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function Winrate({ label, wins, played }: { label: string; wins: number; played: number }) {
  const pct = played ? Math.round((wins / played) * 100) : 0;
  return (
    <Panel className="space-y-2 p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className="font-display text-2xl tnum text-primary-2">{played ? `${pct}%` : "—"}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="h-full rounded-full bg-[var(--primary-2)]" style={{ width: `${pct}%` }} />
      </div>
      <div className="tnum text-xs text-muted">
        {played ? `${wins} ${plural(wins, "победа", "победы", "побед")} из ${played}` : "нет игр"}
      </div>
    </Panel>
  );
}

const SOURCES = [
  { key: "main", label: "Основные", color: "var(--accent)" },
  { key: "contract", label: "Контракты", color: "var(--ok)" },
  { key: "legendary", label: "Легендарные", color: "var(--gold)" },
  { key: "base", label: "Корректировка", color: "var(--primary-2)" },
] as const;

/** Блок расширенной статистики игрока: винрейт по режимам, источники очков, любимая карта, серия. */
export function PlayerStatsBlock({ stats }: { stats: PlayerStats }) {
  const sources = [
    { ...SOURCES[0], value: stats.mainPoints },
    { ...SOURCES[1], value: stats.contractPoints },
    { ...SOURCES[2], value: stats.legendaryPoints },
    { ...SOURCES[3], value: stats.basePoints },
  ].filter((s) => s.value > 0);
  const positive = sources.reduce((a, s) => a + s.value, 0);

  const streakText =
    stats.streakKind === "win"
      ? `${stats.streakLen} ${plural(stats.streakLen, "победа", "победы", "побед")} подряд`
      : stats.streakKind === "loss"
        ? `${stats.streakLen} ${plural(stats.streakLen, "поражение", "поражения", "поражений")} подряд`
        : "—";

  return (
    <section className="space-y-4">
      <h3 className="text-xl">Статистика</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Winrate label="Винрейт 1×1" wins={stats.soloWins} played={stats.soloPlayed} />
        <Winrate label="Винрейт 2×2" wins={stats.duoWins} played={stats.duoPlayed} />
      </div>

      <Panel className="space-y-3 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">Источники очков</span>
        </div>
        {positive > 0 ? (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-[var(--border)]">
              {sources.map((s) => (
                <div key={s.key} style={{ width: `${(s.value / positive) * 100}%`, background: s.color }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {sources.map((s) => (
                <span key={s.key} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-muted">{s.label}</span>
                  <span className="font-display tnum">{s.value}</span>
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">Очки пока не начислены.</p>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel className="space-y-1 p-5">
          <div className="text-sm text-muted">Любимая карта</div>
          {stats.favoriteMap ? (
            <>
              <div className="font-display text-xl uppercase text-primary-2">{stats.favoriteMap}</div>
              <div className="tnum text-xs text-muted">
                {stats.favoriteMapRounds} {plural(stats.favoriteMapRounds, "раунд", "раунда", "раундов")}
              </div>
            </>
          ) : (
            <div className="font-display text-xl text-muted">—</div>
          )}
        </Panel>
        <Panel className="space-y-1 p-5">
          <div className="text-sm text-muted">Текущая серия</div>
          <div
            className={`font-display text-xl uppercase ${
              stats.streakKind === "win" ? "text-ok" : stats.streakKind === "loss" ? "text-danger" : "text-muted"
            }`}
          >
            {streakText}
          </div>
        </Panel>
      </div>
    </section>
  );
}
