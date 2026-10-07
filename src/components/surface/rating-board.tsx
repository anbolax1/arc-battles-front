"use client";

import * as React from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  LeaderboardResponse,
  LeaderboardRow,
  Season,
  TeamLeaderboardResponse,
  TeamLeaderboardRow,
  TournamentMode,
} from "@/lib/types";
import { SearchGlyph, SfAvatar, SfEmpty, TagChips } from "@/components/surface/ui";
import { CountUp } from "@/components/surface/motion";
import { dayMonth, winrate } from "@/components/surface/fmt";
import { PatchArt } from "@/components/surface/patch-art";
import { PATCH_INFO } from "@/components/surface/patch-meta";

type SortKey = "mmr" | "wr" | "m";

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").trim();

/** Подпись сезона над заголовком: «Сезон 3 · с 10 августа». */
function seasonLine(s: Season | null | undefined): string {
  if (!s) return "Все сезоны";
  if (s.status === "active") return `${s.name} · с ${dayMonth(s.startedAt)}`;
  return `${s.name} · ${dayMonth(s.startedAt)} — ${dayMonth(s.endedAt)} · завершён`;
}

/** Общая сортировка игроков и команд: по MMR, винрейту или числу матчей. */
function sortRows<T extends { mmr: number; wins: number; losses: number }>(rows: T[], key: SortKey, games: (r: T) => number): T[] {
  const list = [...rows];
  if (key === "wr") list.sort((a, b) => winrate(b.wins, b.losses) - winrate(a.wins, a.losses) || games(b) - games(a) || b.mmr - a.mmr);
  else if (key === "m") list.sort((a, b) => games(b) - games(a) || b.mmr - a.mmr);
  return list;
}

function Rank({ place }: { place: number }) {
  return <span className={`sf-rank ${place <= 3 ? `r${place}` : ""}`}>{place}</span>;
}

function WinLoss({ wins, losses }: { wins: number; losses: number }) {
  return (
    <span className="c-wl">
      <span className="sf-wl" title={`${wins} побед, ${losses} поражений`}>
        <i className="w" style={{ flex: wins || 0.001 }} />
        <i className="l" style={{ flex: losses || 0.001 }} />
      </span>
      <span className="sf-wl-txt">
        {wins}–{losses}
      </span>
    </span>
  );
}

function SortButton({ k, sort, onSort, children }: { k: SortKey; sort: SortKey; onSort: (k: SortKey) => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={sort === k} onClick={() => onSort(k)}>
      {children}
      {sort === k ? " ▾" : ""}
    </button>
  );
}

function Head({ who, sort, onSort }: { who: string; sort: SortKey; onSort: (k: SortKey) => void }) {
  return (
    <div className="sf-tr sf-th" role="row">
      <span role="columnheader">#</span>
      <span role="columnheader">{who}</span>
      <span role="columnheader" className="c-wl">
        Победы — поражения
      </span>
      <span role="columnheader" className="num">
        <SortButton k="wr" sort={sort} onSort={onSort}>
          Винрейт
        </SortButton>
      </span>
      <span role="columnheader" className="num c-m">
        <SortButton k="m" sort={sort} onSort={onSort}>
          Матчей
        </SortButton>
      </span>
      <span role="columnheader" className="num">
        <SortButton k="mmr" sort={sort} onSort={onSort}>
          MMR
        </SortButton>
      </span>
    </div>
  );
}

const rowStyle = (i: number) => ({ "--i": Math.min(i, 24) }) as React.CSSProperties;

function SoloRows({ rows, place }: { rows: LeaderboardRow[]; place: Map<string, number> }) {
  return (
    <>
      {rows.map((r, i) => {
        const name = r.displayName || r.login;
        return (
          <Link key={r.userId || r.login} className="sf-tr" role="row" href={r.login ? `/profile/${r.login}` : "#"} style={rowStyle(i)}>
            <span role="cell">
              <Rank place={place.get(r.userId || r.login) ?? i + 1} />
            </span>
            <span role="cell" className="sf-pl">
              <SfAvatar name={name} src={r.avatarUrl} />
              <span>
                <b>{name}</b>
                {r.login && r.login !== name && <small>@{r.login}</small>}
                {(r.tags?.length ?? 0) > 0 && (
                  <span className="sf-tagline">
                    <TagChips tags={r.tags} />
                  </span>
                )}
                {r.patches && r.patches.length > 0 && (
                  <span className="pt-mini" title={`Нашивки сезона: ${r.patches.map((c) => PATCH_INFO[c].name).join(", ")}`}>
                    {r.patches.map((c) => (
                      <PatchArt key={c} code={c} />
                    ))}
                    {(r.patchCount ?? 0) > r.patches.length && <small>+{(r.patchCount ?? 0) - r.patches.length}</small>}
                  </span>
                )}
              </span>
            </span>
            <WinLoss wins={r.wins} losses={r.losses} />
            <span role="cell" className="num pct">
              {r.wins + r.losses ? `${winrate(r.wins, r.losses)}%` : "—"}
            </span>
            <span role="cell" className="num m c-m">
              {r.tournaments}
            </span>
            <span role="cell" className="num mm">
              {r.mmr}
            </span>
          </Link>
        );
      })}
    </>
  );
}

function teamName(r: TeamLeaderboardRow): string {
  return r.name || r.members.map((m) => m.displayName || m.login).join(" & ");
}

function TeamRows({ rows, place }: { rows: TeamLeaderboardRow[]; place: Map<string, number> }) {
  return (
    <>
      {rows.map((r, i) => (
        // В строке команды несколько ссылок (команда и игроки), поэтому строка - не ссылка целиком.
        <div key={r.teamKey} className="sf-tr" role="row" style={rowStyle(i)}>
          <span role="cell">
            <Rank place={place.get(r.teamKey) ?? i + 1} />
          </span>
          <span role="cell" className="sf-pl">
            <span className="sfr-pair">
              {r.members.map((m, mi) => (
                <SfAvatar key={m.userId || mi} name={m.displayName || m.login} src={m.avatarUrl} />
              ))}
            </span>
            <span>
              <Link href={`/teams/${encodeURIComponent(r.teamKey)}`}>
                <b>{teamName(r)}</b>
              </Link>
              <span className="sfr-members">
                {r.members.map((m, mi) => (
                  <span key={m.userId || mi} className="sfr-member">
                    <Link href={m.login ? `/profile/${m.login}` : "#"}>{m.displayName || m.login}</Link>
                    <TagChips tags={m.tags} />
                  </span>
                ))}
              </span>
            </span>
          </span>
          <WinLoss wins={r.wins} losses={r.losses} />
          <span role="cell" className="num pct">
            {r.wins + r.losses ? `${winrate(r.wins, r.losses)}%` : "—"}
          </span>
          <span role="cell" className="num m c-m">
            {r.games}
          </span>
          <span role="cell" className="num mm">
            {r.mmr}
          </span>
        </div>
      ))}
    </>
  );
}

/** Таблица лидеров нового дизайна: сезон, режим 1×1 / 2×2, поиск и сортировка.
    MMR в каждом сезоне начинается заново, поэтому таблица всегда за один сезон. */
export function RatingBoard({
  seasons,
  initialSolo,
  initialDuo,
  decor,
}: {
  seasons: Season[];
  initialSolo: LeaderboardRow[];
  initialDuo: TeamLeaderboardRow[];
  decor?: React.ReactNode;
}) {
  const active = seasons.find((s) => s.status === "active");
  const finished = seasons.filter((s) => s.status === "finished");
  const [tab, setTab] = React.useState<TournamentMode>("1x1");
  // "" - активный сезон (так пришло с сервера), "all" - только если активного нет, иначе id.
  const [seasonSel, setSeasonSel] = React.useState<string>(active ? "" : "all");
  const [solo, setSolo] = React.useState(initialSolo);
  const [duo, setDuo] = React.useState(initialDuo);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("mmr");
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  async function pickSeason(value: string) {
    setSeasonSel(value);
    setLoading(true);
    try {
      const q = value ? `&season=${encodeURIComponent(value)}` : "";
      const [s, d] = await Promise.all([
        api.get<LeaderboardResponse>(`/leaderboard?mode=1x1${q}`),
        api.get<TeamLeaderboardResponse>(`/leaderboard?mode=2x2${q}`),
      ]);
      setSolo(s.rows ?? []);
      setDuo(d.rows ?? []);
    } catch {
      /* оставим прежнюю таблицу */
    } finally {
      setLoading(false);
    }
  }

  const shownSeason = seasonSel === "all" ? null : seasonSel ? seasons.find((s) => s.id === seasonSel) : active;
  const seasonOver = shownSeason?.status === "finished";
  const startMmr = shownSeason?.startMmr ?? active?.startMmr ?? 1000;

  const soloPlace = React.useMemo(() => new Map(solo.map((r, i) => [r.userId || r.login, i + 1])), [solo]);
  const duoPlace = React.useMemo(() => new Map(duo.map((r, i) => [r.teamKey, i + 1])), [duo]);

  const q = norm(query);
  const soloShown = sortRows(
    solo.filter((r) => !q || norm(r.displayName || "").includes(q) || norm(r.login || "").includes(q)),
    sort,
    (r) => r.tournaments,
  );
  const duoShown = sortRows(
    duo.filter((r) => !q || norm(teamName(r)).includes(q) || r.members.some((m) => norm(m.displayName || "").includes(q) || norm(m.login || "").includes(q))),
    sort,
    (r) => r.games,
  );
  const total = tab === "1x1" ? solo.length : duo.length;
  const shown = tab === "1x1" ? soloShown.length : duoShown.length;

  const champ =
    seasonOver && tab === "1x1" && solo[0]
      ? { name: solo[0].displayName || solo[0].login, href: `/profile/${solo[0].login}`, mmr: solo[0].mmr, tags: solo[0].tags }
      : seasonOver && tab === "2x2" && duo[0]
        ? { name: teamName(duo[0]), href: `/teams/${encodeURIComponent(duo[0].teamKey)}`, mmr: duo[0].mmr, tags: undefined }
        : null;

  function onTabKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tab === "1x1" ? "2x2" : "1x1";
    setTab(next);
    tabRefs.current[next === "1x1" ? 0 : 1]?.focus();
  }

  return (
    <>
      <section className="sf-page-head sf-night sf-grain">
        {decor}
        <div className="sf-wrap">
          <p className="sf-eyebrow">{seasonLine(shownSeason)}</p>
          <h1 className="sf-h-big">
            таблица лидеров<span className="sf-dot">.</span>
          </h1>
          <p className="sf-lead sfr-lead">
            Главный показатель — MMR: в начале каждого сезона у всех {startMmr}, за победы он растёт, за поражения падает. Нажми на игрока, чтобы открыть
            профиль.
          </p>
          <div className="sf-controls">
            <div className="sf-seg" role="tablist" aria-label="Режим рейтинга" onKeyDown={onTabKey}>
              {(["1x1", "2x2"] as const).map((m, i) => (
                <button
                  key={m}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`sfr-tab-${m}`}
                  aria-selected={tab === m}
                  aria-controls="sfr-table"
                  tabIndex={tab === m ? 0 : -1}
                  onClick={() => setTab(m)}
                >
                  {m === "1x1" ? "Одиночный 1×1" : "Составы 2×2"}
                </button>
              ))}
            </div>
            {seasons.length > 0 && (
              <select className="sf-select" aria-label="Сезон" value={seasonSel} onChange={(e) => pickSeason(e.target.value)} disabled={loading}>
                {active ? <option value="">{active.name} (текущий)</option> : <option value="all">Все сезоны</option>}
                {finished.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <label className="sf-search">
              <SearchGlyph />
              <input
                id="sfr-q"
                type="search"
                placeholder={tab === "1x1" ? "Найти игрока" : "Найти состав или игрока"}
                autoComplete="off"
                aria-label={tab === "1x1" ? "Найти игрока" : "Найти состав или игрока"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {total > 0 && (
              <span className="sf-count" aria-live="polite">
                {shown} из {total}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="sf-sec sf-paper sf-grain sfr-body">
        <div className="sf-wrap">
          {champ && (
            <div className="sf-champ-banner">
              <span className="sf-stamp sfr-gold">
                Чемпион «{shownSeason?.name}» · {tab === "1x1" ? "1×1" : "2×2"}
              </span>
              <Link className="sfr-champ-name" href={champ.href}>
                <b>{champ.name}</b>
              </Link>
              {champ.tags && (
                <span className="sf-tagline">
                  <TagChips tags={champ.tags} />
                </span>
              )}
              <span className="sf-mono">
                <CountUp value={champ.mmr} /> MMR
              </span>
            </div>
          )}

          <div id="sfr-table" role="tabpanel" aria-labelledby={`sfr-tab-${tab}`} className={`sf-tbl ${loading ? "busy" : ""}`}>
            {total === 0 ? (
              <SfEmpty
                title="рейтинг пока пуст."
                hint={tab === "1x1" ? "MMR появится после первых сыгранных матчей сезона." : "MMR команд появится после первых завершённых матчей 2×2."}
              />
            ) : shown === 0 ? (
              <SfEmpty title="никого не нашли." hint={tab === "1x1" ? "Проверь написание ника." : "Проверь название состава или ник игрока."} />
            ) : (
              <div role="table" aria-label={tab === "1x1" ? "Таблица лидеров 1×1" : "Таблица лидеров 2×2"}>
                <Head who={tab === "1x1" ? "Игрок" : "Состав"} sort={sort} onSort={setSort} />
                {/* Ключ по режиму и сезону: строки заново выезжают при переключении, но не при поиске. */}
                <div key={`${tab}-${seasonSel}`} className="sfr-rows" role="rowgroup">
                  {tab === "1x1" ? <SoloRows rows={soloShown} place={soloPlace} /> : <TeamRows rows={duoShown} place={duoPlace} />}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
