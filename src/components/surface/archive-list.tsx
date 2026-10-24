"use client";

import * as React from "react";
import Link from "next/link";
import type { SideScore, TournamentMode } from "@/lib/types";
import { Stripes } from "@/components/surface/stripes";
import { SearchGlyph } from "@/components/surface/ui";
import { matchesWord } from "@/components/surface/fmt";

/** Сыгранный матч в архиве - только то, что нужно строке. */
export interface ArchiveMatch {
  id: string;
  title: string;
  mode: TournamentMode;
  show: boolean;
  at: string;
  score: SideScore[];
  maps: string[];
  mult: number;
  /** Матч не засчитан: счёт остаётся, а победы нет. */
  voided?: boolean;
  /** Что матч сделал с поясом лиги: сменил хозяина, защитил. */
  belt?: string;
}

type Filter = "all" | "1x1" | "2x2" | "show";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Все" },
  { id: "1x1", label: "1×1" },
  { id: "2x2", label: "2×2" },
  { id: "show", label: "Шоу-матчи" },
];

const PAGE = 60;
const MSK = "Europe/Moscow";
const monthFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: MSK, month: "long" });
const yearFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: MSK, year: "numeric" });
const dayFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: MSK, day: "numeric" });
const monShortFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: MSK, month: "short" });
const wdFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: MSK, weekday: "short" });

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");

function Row({ m }: { m: ArchiveMatch }) {
  const d = new Date(m.at);
  const [a, b] = m.score.length === 2 ? m.score : [{ name: m.title, points: 0 }, { name: "", points: 0 }];
  const scored = a.points > 0 || b.points > 0;
  const winner = a.winner ? a.name : b.winner ? b.name : "";
  const meta = [m.mode, m.show ? "шоу-матч" : "", m.mult === 2 ? "×2" : "", ...m.maps].filter(Boolean);
  return (
    <li>
      <Link className="arc-row" href={`/tournament/${m.id}`}>
        <span className="arc-date">
          <b>{dayFmt.format(d)}</b>
          <small>
            {monShortFmt.format(d).replace(".", "")} · {wdFmt.format(d)}
          </small>
        </span>
        <span className="arc-main">
          <span className="arc-sides">
            <span className={a.winner ? "w" : ""}>{a.name}</span>
            {scored ? (
              <span className="arc-score">
                <em className={a.winner ? "w" : ""}>{a.points}</em>
                <i>:</i>
                <em className={b.winner ? "w" : ""}>{b.points}</em>
              </span>
            ) : (
              <span className="arc-vs">vs</span>
            )}
            <span className={b.winner ? "w" : ""}>{b.name}</span>
          </span>
          <small>{meta.join(" · ")}</small>
        </span>
        <span className={`arc-res ${winner && !m.voided ? "w" : ""}`}>
          {m.voided ? "не засчитан" : winner ? `победа ${winner}` : "ничья"}
          {m.belt && <em className="arc-belt">{m.belt}</em>}
        </span>
      </Link>
    </li>
  );
}

/** Архив в новом дизайне: фильтр по формату и поиск по игроку или карте в шапке, ниже - матчи по месяцам. */
export function ArchiveView({ matches }: { matches: ArchiveMatch[] }) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");
  const [limit, setLimit] = React.useState(PAGE);

  const q = norm(query.trim());
  const found = matches.filter(
    (m) =>
      (filter === "all" || (filter === "show" ? m.show : m.mode === filter)) &&
      (!q || m.score.some((s) => norm(s.name).includes(q)) || m.maps.some((x) => norm(x).includes(q)) || norm(m.title).includes(q)),
  );
  const months: Array<{ key: string; label: string; items: ArchiveMatch[] }> = [];
  for (const m of found.slice(0, limit)) {
    const d = new Date(m.at);
    const label = `${monthFmt.format(d)} ${yearFmt.format(d)}`;
    if (months[months.length - 1]?.label !== label) months.push({ key: label, label, items: [] });
    months[months.length - 1].items.push(m);
  }

  return (
    <>
      <section className="sf-page-head sf-night sf-grain arc-top">
        <Stripes shape="corner" className="corner" draw />
        <div className="sf-wrap">
          <p className="sf-eyebrow">
            Результаты · {matches.length} {matchesWord(matches.length)}
          </p>
          <h1 className="sf-h-big">
            результаты<span className="sf-dot">.</span>
          </h1>
          <p className="sf-lead arc-lead">Все сыгранные матчи: счёт, карты и разбор каждого рейда.</p>
          <div className="sf-controls">
            <div className="sf-seg" role="tablist" aria-label="Какие матчи">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => {
                    setFilter(f.id);
                    setLimit(PAGE);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <label className="sf-search">
              <SearchGlyph />
              <input
                type="search"
                placeholder="Игрок или карта"
                autoComplete="off"
                aria-label="Найти матч по игроку или карте"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(PAGE);
                }}
              />
            </label>
            {(q || filter !== "all") && (
              <span className="sf-count" aria-live="polite">
                найдено {found.length}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="sf-sec sf-paper sf-grain arc-body">
        <div className="sf-wrap">
          {months.length ? (
            months.map((g) => (
              <section key={g.key} className="arc-month" aria-label={g.label}>
                <h2 className="arc-month-head">{g.label}</h2>
                <ul className="arc-list">
                  {g.items.map((m) => (
                    <Row key={m.id} m={m} />
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <p className="sf-note">{q ? "Таких матчей нет — попробуй другое имя или карту." : "Здесь появятся сыгранные матчи."}</p>
          )}
          {found.length > limit && (
            <button type="button" className="sf-btn sf-btn-ink-line arc-more" onClick={() => setLimit((n) => n + PAGE)}>
              Показать ещё {Math.min(PAGE, found.length - limit)}
            </button>
          )}
        </div>
      </section>
    </>
  );
}
