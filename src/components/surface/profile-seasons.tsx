"use client";

import * as React from "react";
import Link from "next/link";
import { seasonStats } from "@/components/domain/player-rating-sections";
import { mapImage } from "@/lib/match";
import type { MapStat, MmrPoint, MmrStats, OpponentStat, PlayerProfile, Season, SeasonAnalytics } from "@/lib/types";
import { ProfileChart, type ChartSegment } from "@/components/surface/profile-chart";
import { fullDate, matchesWord } from "@/components/surface/fmt";

/** Вкладка «все сезоны»: id сезона таким не бывает. */
const ALL = "*";

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").trim();

/** Победы и поражения по одной плашке на матч; когда матчей много - пропорционально. */
function Segs({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  if (total === 0) return <span className="pf-segs" aria-hidden />;
  if (total > 24) {
    return (
      <span className="pf-segs" aria-hidden>
        <i className="w" style={{ flexGrow: wins }} />
        <i className="l" style={{ flexGrow: losses }} />
      </span>
    );
  }
  return (
    <span className="pf-segs" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < wins ? "w" : "l"} />
      ))}
    </span>
  );
}

/** Сводка по картам и соперникам за несколько сезонов: одинаковые записи складываются. */
function mergeAnalytics(list: SeasonAnalytics[]): SeasonAnalytics {
  const maps = new Map<string, MapStat>();
  const opps = new Map<string, OpponentStat>();
  for (const a of list) {
    for (const m of a.maps) {
      const k = norm(m.map);
      const cur = maps.get(k);
      if (!cur) maps.set(k, { ...m });
      else {
        cur.games += m.games;
        cur.wins += m.wins;
        cur.losses += m.losses;
        // в старых сезонах названия капсом - показываем обычное написание
        if (/[а-яё]/.test(m.map)) cur.map = m.map;
      }
    }
    for (const o of a.opponents) {
      const k = o.login || o.teamKey || norm(o.name);
      const cur = opps.get(k);
      if (!cur) opps.set(k, { ...o });
      else {
        cur.games += o.games;
        cur.wins += o.wins;
        cur.losses += o.losses;
      }
    }
  }
  const byGames = <T extends { games: number }>(x: T, y: T) => y.games - x.games;
  return { maps: [...maps.values()].sort(byGames), opponents: [...opps.values()].sort(byGames) };
}

interface Tab {
  id: string;
  label: string;
}

/** Рейтинг игрока по сезонам: вкладки сезонов, сводка, график MMR, карты и соперники. */
export function ProfileSeasons({
  profile,
  seasons,
  maps,
}: {
  profile: PlayerProfile;
  seasons: Season[];
  maps: Array<{ code: string; name: string }>;
}) {
  const { mmr1x1, timeline1x1, analytics1x1, mmrSolo } = profile;

  // Сезоны в порядке матчей: у каждого свой отрезок графика.
  const groups = React.useMemo(() => {
    const m = new Map<string, MmrPoint[]>();
    for (const p of timeline1x1) {
      const key = p.season ?? "";
      m.set(key, [...(m.get(key) ?? []), p]);
    }
    return m;
  }, [timeline1x1]);

  const active = seasons.find((s) => s.status === "active");
  const withMatches = seasons.filter((s) => groups.has(s.id)).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const offSeason = groups.has("");
  const tabs: Tab[] = [
    ...withMatches.map((s) => ({ id: s.id, label: s.id === active?.id ? `${s.name} · идёт` : s.name })),
    ...(offSeason ? [{ id: "", label: "Вне сезонов" }] : []),
  ];
  if (tabs.length > 1) tabs.push({ id: ALL, label: "Все сезоны" });

  const [sel, setSel] = React.useState(() => (active && groups.has(active.id) ? active.id : (tabs[0]?.id ?? ALL)));

  const seasonOf = (key: string) => seasons.find((s) => s.id === key);
  const labelOf = (key: string) => seasonOf(key)?.name ?? "Вне сезонов";
  const startOf = (key: string) => seasonOf(key)?.startMmr ?? 1000;

  let segments: ChartSegment[];
  let stats: MmrStats;
  let analytics: SeasonAnalytics | undefined;
  let current: boolean;
  if (sel === ALL) {
    const keys = [...groups.keys()].sort((a, b) => (groups.get(a)![0]?.date ?? "").localeCompare(groups.get(b)![0]?.date ?? ""));
    segments = keys.map((k) => ({ label: labelOf(k), start: startOf(k), points: groups.get(k)! }));
    const all = keys.flatMap((k) => groups.get(k)!);
    stats = { ...seasonStats(all, 1000), currentMmr: mmrSolo, place: mmr1x1.place };
    analytics = mergeAnalytics(keys.map((k) => analytics1x1?.[k]).filter((a): a is SeasonAnalytics => !!a));
    current = true;
  } else {
    const points = groups.get(sel) ?? [];
    const start = startOf(sel);
    segments = [{ label: labelOf(sel), start, points }];
    current = seasonOf(sel)?.status === "active";
    const base = seasonStats(points, start);
    stats = current ? { ...base, currentMmr: mmr1x1.currentMmr, place: mmr1x1.place } : base;
    analytics = analytics1x1?.[sel];
  }

  const mapInfo = (name: string) => maps.find((m) => norm(m.name) === norm(name));
  const streak =
    stats.currentStreakLen > 0 && stats.currentStreakKind
      ? { v: stats.currentStreakLen, s: stats.currentStreakKind === "win" ? "побед подряд" : "поражений подряд" }
      : { v: 0, s: "нет серии" };

  return (
    <div className="pf-seasons">
      <div className="sf-sec-head pf-head">
        <div>
          <p className="sf-eyebrow">Рейтинг 1×1 · MMR начинается заново каждый сезон</p>
          <h2 className="sf-h-mid">рейтинг по сезонам<span className="sf-dot">.</span></h2>
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
          <dd className="pf-sub">{current ? (stats.place > 0 ? `#${stats.place} в таблице` : "вне рейтинга") : "итог сезона"}</dd>
        </div>
        <div>
          <dt>Пик MMR</dt>
          <dd>{stats.peakMmr}</dd>
          <dd className="pf-sub">{sel === ALL ? "за все сезоны" : "максимум сезона"}</dd>
        </div>
        <div>
          <dt>Винрейт</dt>
          <dd>
            {stats.winrate}
            <small>%</small>
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

      <div className="pf-legend" aria-hidden>
        <span>
          <i className="w" /> победа
        </span>
        <span>
          <i className="l" /> поражение
        </span>
        {segments.some((s) => s.points.some((p) => p.correction)) && (
          <span>
            <i className="c" /> сверка рейтинга
          </span>
        )}
        <span>
          <i className="st" /> старт сезона
        </span>
        <span className="pf-legend-hint">наведи на точку — детали матча</span>
      </div>
      <ProfileChart key={sel} segments={segments} />

      <div className="sf-prof-cols">
        <div>
          <h3 className="sf-h-mid">карты<span className="sf-dot">.</span></h3>
          {analytics?.maps.length ? (
            <ul className="sf-maps-list">
              {analytics.maps.map((m) => {
                const info = mapInfo(m.map);
                return (
                  <li key={m.map}>
                    {info ? (
                      // eslint-disable-next-line @next/next/no-img-element -- превью карты
                      <img src={mapImage(info.code)} alt="" loading="lazy" />
                    ) : (
                      <span className="pf-noimg" aria-hidden />
                    )}
                    <div>
                      <b>{info?.name ?? m.map}</b>
                      <Segs wins={m.wins} losses={m.losses} />
                    </div>
                    <span className="sc">
                      {m.wins}–{m.losses}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="sf-note">Нет данных по картам.</p>
          )}
          <p className="pf-hint">Матч на нескольких картах засчитан на каждую.</p>
        </div>
        <div>
          <h3 className="sf-h-mid">соперники<span className="sf-dot">.</span></h3>
          {analytics?.opponents.length ? (
            <ul className="sf-hist">
              {analytics.opponents.map((o, i) => {
                const href = o.login ? `/profile/${o.login}` : o.teamKey ? `/teams/${encodeURIComponent(o.teamKey)}` : "";
                const body = (
                  <>
                    <span className={`sf-res ${o.wins >= o.losses ? "w" : "l"}`}>
                      {o.wins}–{o.losses}
                    </span>
                    <span>
                      <b>{o.name || "—"}</b>
                      <small>
                        {o.games} {matchesWord(o.games)}
                      </small>
                    </span>
                    <span />
                  </>
                );
                return <li key={(o.login || o.teamKey || o.name) + i}>{href ? <Link href={href}>{body}</Link> : <div>{body}</div>}</li>;
              })}
            </ul>
          ) : (
            <p className="sf-note">Соперники появятся после первых матчей.</p>
          )}
        </div>
      </div>
    </div>
  );
}
