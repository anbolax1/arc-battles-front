"use client";

import * as React from "react";
import type { MmrPoint, MmrStats, Season, SeasonAnalytics, TeamProfile } from "@/lib/types";
import { seasonStats } from "@/lib/mmr-stats";
import { ProfileChart, type ChartSegment } from "@/components/surface/profile-chart";
import { ChartLegend, MapsAndRivals, mergeAnalytics } from "@/components/surface/profile-seasons";
import { fullDate } from "@/components/surface/fmt";

/** Вкладка «все сезоны»: id сезона таким не бывает. */
const ALL = "*";

/** Рейтинг команды по сезонам: в каждом сезоне MMR команды начинается заново, как у игроков 1×1. */
export function TeamSeasons({ team, seasons, maps }: { team: TeamProfile; seasons: Season[]; maps: Array<{ code: string; name: string }> }) {
  const groups = React.useMemo(() => {
    const m = new Map<string, MmrPoint[]>();
    for (const p of team.timeline) {
      const key = p.season ?? "";
      m.set(key, [...(m.get(key) ?? []), p]);
    }
    return m;
  }, [team.timeline]);

  const active = seasons.find((s) => s.status === "active");
  const withMatches = seasons.filter((s) => groups.has(s.id)).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const tabs = [
    ...withMatches.map((s) => ({ id: s.id, label: s.id === active?.id ? `${s.name} · идёт` : s.name })),
    ...(groups.has("") ? [{ id: "", label: "Вне сезонов" }] : []),
  ];
  if (tabs.length > 1) tabs.push({ id: ALL, label: "Все сезоны" });

  const [sel, setSel] = React.useState(() => (active && groups.has(active.id) ? active.id : (tabs[0]?.id ?? ALL)));

  const seasonOf = (key: string) => seasons.find((s) => s.id === key);
  const startOf = (key: string) => seasonOf(key)?.startMmr ?? 1000;

  let segments: ChartSegment[];
  let stats: MmrStats;
  let analytics: SeasonAnalytics | undefined;
  let current: boolean;
  if (sel === ALL) {
    const keys = [...groups.keys()].sort((a, b) => (groups.get(a)![0]?.date ?? "").localeCompare(groups.get(b)![0]?.date ?? ""));
    segments = keys.map((k) => ({ label: seasonOf(k)?.name ?? "Вне сезонов", start: startOf(k), points: groups.get(k)! }));
    stats = { ...seasonStats(keys.flatMap((k) => groups.get(k)!), 1000), currentMmr: team.stats.currentMmr, place: team.stats.place };
    analytics = mergeAnalytics(keys.map((k) => team.analytics?.[k]).filter((a): a is SeasonAnalytics => !!a));
    current = true;
  } else {
    const points = groups.get(sel) ?? [];
    segments = [{ label: seasonOf(sel)?.name ?? "Вне сезонов", start: startOf(sel), points }];
    current = seasonOf(sel)?.status === "active";
    const base = seasonStats(points, startOf(sel));
    stats = current ? { ...base, currentMmr: team.stats.currentMmr, place: team.stats.place } : base;
    analytics = team.analytics?.[sel];
  }

  const streak =
    stats.currentStreakLen > 0 && stats.currentStreakKind
      ? { v: stats.currentStreakLen, s: stats.currentStreakKind === "win" ? "побед подряд" : "поражений подряд" }
      : { v: 0, s: "нет серии" };

  return (
    <div className="pf-seasons">
      <div className="sf-sec-head pf-head">
        <div>
          <p className="sf-eyebrow">Рейтинг 2×2 · MMR команды начинается заново каждый сезон</p>
          <h2 className="sf-h-mid">
            рейтинг команды<span className="sf-dot">.</span>
          </h2>
        </div>
        {tabs.length > 1 && (
          <div className="sf-seg pf-tabs" role="tablist" aria-label="Сезон">
            {tabs.map((t) => (
              <button key={t.id || "off"} type="button" role="tab" aria-selected={sel === t.id} onClick={() => setSel(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <dl className="sf-stats">
        <div>
          <dt>{current ? "MMR сейчас" : "MMR в конце"}</dt>
          <dd>{stats.currentMmr}</dd>
          <dd className="pf-sub">{current ? (stats.place > 0 ? `#${stats.place} в таблице 2×2` : "в этом сезоне не играла") : "итог сезона"}</dd>
        </div>
        <div>
          <dt>Пик MMR</dt>
          <dd>{stats.peakMmr}</dd>
          <dd className="pf-sub">{sel === ALL ? "за все сезоны" : "максимум сезона"}</dd>
        </div>
        <div>
          <dt>Винрейт</dt>
          <dd>
            {stats.wins + stats.losses ? (
              <>
                {stats.winrate}
                <small>%</small>
              </>
            ) : (
              "—"
            )}
          </dd>
          <dd className="pf-sub">
            {stats.wins}–{stats.losses}
          </dd>
        </div>
        <div>
          <dt>Матчей</dt>
          <dd>{stats.games}</dd>
          <dd className="pf-sub">{stats.firstMatch ? `с ${fullDate(stats.firstMatch)}` : "—"}</dd>
        </div>
        <div>
          <dt>{current ? "Серия сейчас" : "Лучшая серия"}</dt>
          <dd>{current ? streak.v || "—" : stats.bestWinStreak}</dd>
          <dd className="pf-sub">{current ? streak.s : `побед подряд · худшая ${stats.bestLossStreak}`}</dd>
        </div>
      </dl>

      <ChartLegend
        corrections={segments.some((s) => s.points.some((p) => p.correction))}
        voided={segments.some((s) => s.points.some((p) => p.voided))}
      />
      <ProfileChart key={sel} segments={segments} />
      <MapsAndRivals mapStats={analytics?.maps ?? []} opponents={analytics?.opponents ?? []} maps={maps} />
    </div>
  );
}
