"use client";

import * as React from "react";
import Link from "next/link";
import type { PatchCode, PlayerPatch, Season } from "@/lib/types";
import { dayMonth, winrate } from "@/components/surface/fmt";
import { PatchArt } from "@/components/surface/patch-art";
import { RaiderCard, type CardStat } from "@/components/surface/raider-card";
import {
  HUNTER_TIERS,
  MARATHON_GOAL,
  PATCH_GROUPS,
  PATCH_INFO,
  PATCH_ORDER,
  ROMAN,
  STREAK_GOAL,
  cardRarity,
  cardRarityScale,
  patchName,
  patchResult,
} from "@/components/surface/patch-meta";
import { pluralKnocks } from "@/lib/format";
import "@/components/surface/patches.css";

/** Сезон рейдера для карточки и полосок «сколько осталось». */
export interface PatchStatsInput {
  mmr: number;
  place: number;
  wins: number;
  losses: number;
  peak: number;
  bestStreak: number;
  games: number;
  knocks: number;
  bestMap: string;
}

interface Progress {
  cur: number;
  goal: number;
  label: string;
  /** Сколько осталось - для «ближе всего» на телефоне. */
  left: string;
}

interface Row {
  code: PatchCode;
  on: boolean;
  provisional: boolean;
  name: string;
  tier: number;
  result?: string;
  href?: string;
  title?: string;
  progress?: Progress;
}

function Segs({ cur, goal }: { cur: number; goal: number }) {
  const n = Math.min(goal, 25), fill = Math.round((Math.min(cur, goal) / goal) * n);
  return (
    <span className="pt-segs" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={i < fill ? "f" : undefined} />
      ))}
    </span>
  );
}

function seasonsWord(n: number): string {
  const a = n % 100, b = n % 10;
  return a > 10 && a < 20 ? "сезонов" : b === 1 ? "сезоне" : "сезонах";
}

/** Блок профиля «карточка и нашивки»: карточка сезона и все нашивки с правилами и своим результатом. */
export function ProfilePatches({
  user,
  season,
  seasonLabel,
  items,
  players,
  active,
  seasonsHeld,
  stats,
  mapName,
}: {
  user: { name: string; login: string; avatarUrl?: string };
  season?: Season;
  seasonLabel: string;
  items: PlayerPatch[];
  players: number;
  /** Сезон идёт: итоговые нашивки пока у претендентов. */
  active: boolean;
  /** Вкладка «все сезоны»: в скольких сезонах получена нашивка. */
  seasonsHeld?: Partial<Record<PatchCode, number>>;
  stats: PatchStatsInput;
  mapName: (s: string) => string;
}) {
  const [all, setAll] = React.useState(false);
  const byCode = new Map(items.map((p) => [p.code, p]));
  const earned = items.filter((p) => !p.provisional).length;

  const rowOf = (code: PatchCode): Row => {
    const p = byCode.get(code);
    const on = !!p && !p.provisional;
    const tier = on ? p.tier : 1;
    const row: Row = { code, on, provisional: !!p?.provisional, tier, name: patchName(code, on ? tier : 0) };
    if (on) {
      const held = seasonsHeld?.[code] ?? 0;
      row.result = patchResult(p, mapName) + (held > 1 ? ` · в ${held} ${seasonsWord(held)}` : "");
      row.href = p.matchId ? `/tournament/${p.matchId}` : undefined;
      row.title = `Получена ${dayMonth(p.earnedAt)}`;
    }
    if (code === "hunter") {
      const next = HUNTER_TIERS[on ? tier : 0];
      if (next !== undefined && (on || stats.knocks > 0)) {
        const left = next - stats.knocks;
        row.progress = {
          cur: stats.knocks,
          goal: next,
          label: on ? `до ${ROMAN[tier + 1]} ещё ${left}` : `${stats.knocks} из ${next}`,
          left: `ещё ${left} ${pluralKnocks(left)}`,
        };
      }
    } else if (!on && code === "streak" && stats.bestStreak > 0) {
      row.progress = { cur: stats.bestStreak, goal: STREAK_GOAL, label: `лучшая серия: ${stats.bestStreak}`, left: `серия из ${STREAK_GOAL} побед` };
    } else if (!on && code === "marathon" && stats.games > 0) {
      const left = MARATHON_GOAL - stats.games;
      row.progress = { cur: stats.games, goal: MARATHON_GOAL, label: `${stats.games} из ${MARATHON_GOAL}`, left: `ещё ${left} ${left === 1 ? "матч" : left < 5 ? "матча" : "матчей"}` };
    }
    return row;
  };

  const groups = PATCH_GROUPS.map((g) => ({ ...g, rows: g.codes.map(rowOf) }));
  const locked = PATCH_ORDER.map(rowOf).filter((r) => !r.on);
  const closest = locked
    .filter((r) => r.progress && r.progress.cur < r.progress.goal)
    .sort((a, b) => b.progress!.cur / b.progress!.goal - a.progress!.cur / a.progress!.goal)[0];

  const rarity = cardRarity(stats.mmr, season);
  const best = stats.bestMap;
  const cardStats: CardStat[] = [
    { k: "победы", v: `${stats.wins}–${stats.losses}` },
    { k: "винрейт", v: `${winrate(stats.wins, stats.losses)}%` },
    { k: "пик", v: String(stats.peak) },
    { k: "серия", v: String(stats.bestStreak) },
    { k: "нашивки", v: `${earned}/${PATCH_ORDER.length}` },
    { k: "лучшая карта", v: best || "—", word: !!best },
  ];
  const sub = `${stats.place > 0 ? `#${stats.place} из ${players} · ` : ""}${stats.mmr} MMR`;

  return (
    <section className="pt-block" id="patches" aria-labelledby="pt-title">
      <div className="pt-head">
        <div>
          <p className="sf-eyebrow">{seasonLabel} · нашивки выдаются сами по итогам матчей</p>
          <h3 className="sf-h-mid" id="pt-title">
            карточка и нашивки<span className="sf-dot">.</span>
          </h3>
        </div>
        <div className="pt-total">
          <p>
            <b>{earned}</b>
            <span>из {PATCH_ORDER.length}</span>
          </p>
          <Link className="sf-more" href={season ? `/patches?season=${season.id}` : "/patches"}>
            Все нашивки и правила
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12 H19 M13 6 L19 12 L13 18" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="pt-body">
        <div className="pt-side">
          <RaiderCard name={user.name} avatarUrl={user.avatarUrl} rarity={rarity} seasonName={seasonLabel} sub={sub} stats={cardStats} />
          <div className="pt-card-scale">
            {cardRarityScale(season).map((r) => (
              <span key={r.label}>
                <i style={{ background: r.color }} />
                {r.label} {r.from}
              </span>
            ))}
          </div>
          <p>Редкость карточки - по MMR сезона, как у предметов в игре.</p>
        </div>

        <div className={`pt-groups ${all ? "all" : ""}`}>
          {groups.map((g) => {
            const have = g.rows.filter((r) => r.on).length;
            return (
              <section key={g.name} className={`pt-group ${have ? "" : "none"}`}>
                <div className="pt-group-head">
                  <h4>{g.name}</h4>
                  <span>
                    {have} из {g.rows.length}
                  </span>
                </div>
                <ul className="pt-list">
                  {g.rows.map((r) => (
                    <li key={r.code} className={`pt-row ${r.on ? "" : "off"}`} title={r.title}>
                      <span className="pt-art">
                        {r.on ? (
                          <PatchArt code={r.code} tier={r.tier} className="pt-c" />
                        ) : (
                          <>
                            <PatchArt code={r.code} ghost className="pt-g" />
                            <PatchArt code={r.code} className="pt-c" />
                          </>
                        )}
                      </span>
                      <span className="pt-txt">
                        <b className="pt-name">{r.name}</b>
                        <span className="pt-rule">{PATCH_INFO[r.code].rule}</span>
                        {r.on &&
                          (r.href ? (
                            <Link className="pt-res" href={r.href}>
                              {r.result}
                            </Link>
                          ) : (
                            <span className="pt-res">{r.result}</span>
                          ))}
                        {r.provisional && active && <span className="pt-prov">претендент · закрепится в конце сезона</span>}
                        {r.progress && (
                          <span className="pt-prog">
                            <Segs cur={r.progress.cur} goal={r.progress.goal} />
                            {r.progress.label}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {locked.length > 0 && (
            <section className="pt-locked" aria-label="Ещё не собраны">
              <div className="pt-locked-head">
                <h4>Ещё не собраны</h4>
                <span>{locked.length}</span>
              </div>
              <ul>
                {locked.map((r) => (
                  <li key={r.code}>
                    <PatchArt code={r.code} ghost label={PATCH_INFO[r.code].name} />
                  </li>
                ))}
              </ul>
              {closest?.progress && (
                <p>
                  Ближе всего: <b>{PATCH_INFO[closest.code].name}</b>, {closest.progress.left}.
                </p>
              )}
              <button type="button" className="sf-btn sf-btn-ink-line sf-btn-sm" onClick={() => setAll(true)}>
                Показать правила
              </button>
            </section>
          )}

          <p className="pt-note">Ноки считаются в матчах, где их записали: в пульте эфира или на arcarena.</p>
        </div>
      </div>
    </section>
  );
}
