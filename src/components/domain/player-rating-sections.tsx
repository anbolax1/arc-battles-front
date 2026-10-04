"use client";

import * as React from "react";
import type { MmrPoint, MmrStats, PlayerProfile, Season } from "@/lib/types";
import { MmrChart } from "./mmr-chart";
import { MmrStatsGrid, MapBreakdown, HeadToHead, TeamsList } from "./mmr-analytics";

/** Сводка по матчам одного сезона; сверка рейтинга - не матч, в победы и серии не идёт. */
function seasonStats(points: MmrPoint[], start: number): MmrStats {
  const st: MmrStats = {
    currentMmr: start,
    peakMmr: start,
    wins: 0,
    losses: 0,
    games: 0,
    winrate: 0,
    bestWinStreak: 0,
    bestLossStreak: 0,
    currentStreakKind: "",
    currentStreakLen: 0,
    place: 0,
  };
  let kind: "win" | "loss" | "" = "";
  let len = 0;
  for (const p of points) {
    st.peakMmr = Math.max(st.peakMmr, p.mmr);
    st.currentMmr = p.mmr;
    if (p.correction) continue;
    st.firstMatch ??= p.date;
    const w = Math.max(p.games || 1, 1);
    if (p.win) st.wins += w;
    else st.losses += w;
    const k = p.win ? "win" : "loss";
    len = kind === k ? len + 1 : 1;
    kind = k;
    if (k === "win") st.bestWinStreak = Math.max(st.bestWinStreak, len);
    else st.bestLossStreak = Math.max(st.bestLossStreak, len);
  }
  st.games = st.wins + st.losses;
  st.winrate = st.games ? Math.round((st.wins * 100) / st.games) : 0;
  st.currentStreakKind = kind;
  st.currentStreakLen = len;
  return st;
}

/** Секции рейтинга, аналитики и команд игрока - общие для публичного профиля и личного кабинета.
    В каждом сезоне MMR начинается заново, поэтому график, сводка и аналитика - за выбранный сезон. */
export function PlayerRatingSections({ profile, seasons }: { profile: PlayerProfile; seasons: Season[] }) {
  const { mmr1x1, timeline1x1, analytics1x1, teams } = profile;
  const bySeason = React.useMemo(() => {
    const m = new Map<string, MmrPoint[]>();
    for (const p of timeline1x1) {
      const key = p.season ?? "";
      m.set(key, [...(m.get(key) ?? []), p]);
    }
    return m;
  }, [timeline1x1]);
  const options = [...seasons]
    .filter((s) => bySeason.has(s.id))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const active = seasons.find((s) => s.status === "active");
  const [sel, setSel] = React.useState(() =>
    active && bySeason.has(active.id) ? active.id : (options[0]?.id ?? (bySeason.has("") ? "" : (active?.id ?? ""))),
  );
  const season = seasons.find((s) => s.id === sel);
  const points = bySeason.get(sel) ?? [];
  const start = season?.startMmr ?? 1000;
  const current = season?.status === "active";
  const base = seasonStats(points, start);
  const stats = current ? { ...base, currentMmr: mmr1x1.currentMmr, place: mmr1x1.place } : base;
  const played = timeline1x1.some((p) => !p.correction);
  const choices = options.length + (bySeason.has("") ? 1 : 0);
  const analytics = analytics1x1?.[sel];

  return (
    <>
      {played && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl">Рейтинг 1×1</h3>
            {choices > 1 && (
              <label className="flex items-center gap-2 text-sm text-muted">
                Сезон
                <select className="select max-w-[16rem]" value={sel} onChange={(e) => setSel(e.target.value)}>
                  {options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.status === "active" ? " (текущий)" : ""}
                    </option>
                  ))}
                  {bySeason.has("") && <option value="">Вне сезонов</option>}
                </select>
              </label>
            )}
          </div>
          {points.length ? (
            <>
              <MmrStatsGrid stats={stats} final={!current} />
              <MmrChart points={points} start={start} />
            </>
          ) : (
            <div className="panel flex h-32 items-center justify-center text-sm text-muted">
              В этом сезоне матчей пока нет.
            </div>
          )}
        </section>
      )}

      {played && (
        <section className="space-y-4">
          <h3 className="text-xl">
            Аналитика матчей 1×1 <span className="text-muted">· {season ? season.name : "вне сезонов"}</span>
          </h3>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-display text-sm uppercase tracking-wide text-muted">По картам</h4>
              <MapBreakdown maps={analytics?.maps ?? []} />
            </div>
            <div className="space-y-3">
              <h4 className="font-display text-sm uppercase tracking-wide text-muted">Против кого играл</h4>
              <HeadToHead opponents={analytics?.opponents ?? []} />
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-xl">Команды 2×2</h3>
        <TeamsList teams={teams} />
      </section>
    </>
  );
}
