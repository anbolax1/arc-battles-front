"use client";

import * as React from "react";
import { api } from "@/lib/api";
import type { LeaderboardResponse, LeaderboardRow, Season, TournamentMode } from "@/lib/types";
import { LeaderboardTable } from "./leaderboard-table";

/** Рейтинг 1×1/2×2 с выбором сезона. Дефолт — активный сезон; «Все сезоны» = за всё время.
    При смене сезона догружает таблицы клиентом (/api/leaderboard?season=). */
export function RatingTabs({
  seasons,
  initialSolo,
  initialDuo,
}: {
  seasons: Season[];
  initialSolo: LeaderboardRow[];
  initialDuo: LeaderboardRow[];
}) {
  const active = seasons.find((s) => s.status === "active");
  const [tab, setTab] = React.useState<TournamentMode>("1x1");
  // "" — активный сезон (как пришло initial с сервера); "all" — за всё время; иначе id.
  const [seasonSel, setSeasonSel] = React.useState<string>("");
  const [solo, setSolo] = React.useState(initialSolo);
  const [duo, setDuo] = React.useState(initialDuo);
  const [loading, setLoading] = React.useState(false);

  async function pickSeason(value: string) {
    setSeasonSel(value);
    setLoading(true);
    try {
      const q = value ? `&season=${encodeURIComponent(value)}` : "";
      const [s, d] = await Promise.all([
        api.get<LeaderboardResponse>(`/leaderboard?mode=1x1${q}`),
        api.get<LeaderboardResponse>(`/leaderboard?mode=2x2${q}`),
      ]);
      setSolo(s.rows ?? []);
      setDuo(d.rows ?? []);
    } catch {
      /* оставим как есть */
    } finally {
      setLoading(false);
    }
  }

  // Какой сезон фактически показан + завершён ли он (для баннера чемпиона).
  const shownSeason = seasonSel === "all" ? null : seasonSel ? seasons.find((s) => s.id === seasonSel) : active;
  const finished = shownSeason?.status === "finished";
  const rows = tab === "1x1" ? solo : duo;
  const champ = finished && rows.length ? rows[0] : null;

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setTab((t) => (t === "1x1" ? "2x2" : "1x1"));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="tabs" role="tablist" aria-label="Режим рейтинга" onKeyDown={onKey}>
          <button type="button" role="tab" id="tab-1x1" aria-selected={tab === "1x1"} aria-controls="panel-1x1" tabIndex={tab === "1x1" ? 0 : -1} className="tab" onClick={() => setTab("1x1")}>
            <span>Одиночный 1×1</span>
          </button>
          <button type="button" role="tab" id="tab-2x2" aria-selected={tab === "2x2"} aria-controls="panel-2x2" tabIndex={tab === "2x2" ? 0 : -1} className="tab" onClick={() => setTab("2x2")}>
            <span>Составы 2×2</span>
          </button>
        </div>

        {seasons.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-muted">
            Сезон
            <select className="select max-w-[16rem]" value={seasonSel} onChange={(e) => pickSeason(e.target.value)} disabled={loading}>
              {active && <option value="">{active.name} (текущий)</option>}
              {seasons.filter((s) => s.status === "finished").map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="all">Все сезоны</option>
            </select>
          </label>
        )}
      </div>

      {champ && (
        <div className="panel glow-edge flex items-center gap-3 px-4 py-3">
          <span className="font-display text-sm uppercase tracking-wide text-muted">🏆 Чемпион{shownSeason ? ` «${shownSeason.name}»` : ""} · {tab}</span>
          <span className="font-display uppercase text-primary-2">{champ.displayName || champ.login}</span>
          <span className="ml-auto font-display tnum">{champ.points}</span>
        </div>
      )}

      <div role="tabpanel" id="panel-1x1" aria-labelledby="tab-1x1" hidden={tab !== "1x1"} className={loading ? "opacity-50 transition-opacity" : ""}>
        <LeaderboardTable rows={solo} kind="1x1" />
      </div>
      <div role="tabpanel" id="panel-2x2" aria-labelledby="tab-2x2" hidden={tab !== "2x2"} className={loading ? "opacity-50 transition-opacity" : ""}>
        <LeaderboardTable rows={duo} kind="2x2" />
      </div>
    </div>
  );
}
