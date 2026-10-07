"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import type { SeasonRecap } from "@/lib/types";
import { ProfileChart } from "@/components/surface/profile-chart";
import { signed } from "@/components/surface/ui";
import { dLong, dShort, highlightColors, leadDays, mapNames, nameSize, pc, playerPoints, plural, W_DAY, W_MATCH, W_WIN, pl } from "@/components/surface/season-lib";

interface SeasonCtx {
  recap: SeasonRecap;
  colors: Map<number, string>;
  sel: number;
  pick: (i: number, scroll?: boolean) => void;
}

const Ctx = React.createContext<SeasonCtx | null>(null);

export function useSeason(): SeasonCtx {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useSeason - только внутри SeasonProvider");
  return c;
}

/** Данные итогов один раз на всю страницу и выбранный игрок: строка таблицы открывает его карточку. Вошедший
    игрок, сыгравший в сезоне, сразу видит себя. */
export function SeasonProvider({ recap, children }: { recap: SeasonRecap; children: React.ReactNode }) {
  const { user } = useAuth();
  const mine = user ? recap.players.findIndex((p) => p.login.toLowerCase() === user.login.toLowerCase()) : -1;
  const [sel, setSel] = React.useState(Math.max(0, mine));
  const colors = React.useMemo(() => highlightColors(recap), [recap]);
  const pick = React.useCallback((i: number, scroll = false) => {
    setSel(i);
    if (scroll) document.getElementById("you")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);
  const value = React.useMemo(() => ({ recap, colors, sel, pick }), [recap, colors, sel, pick]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const SPARK_W = 150, SPARK_H = 30, Y0 = 780, Y1 = 1500;
const FIRST_ROWS = 12;

function Sparkline({ curve, t0, t1, start }: { curve: Array<[number, number, number]>; t0: number; t1: number; start: number }) {
  if (!curve.length) return null;
  const x = (t: number) => ((t - t0) / (t1 - t0)) * (SPARK_W - 6) + 1;
  const y = (v: number) => SPARK_H - 3 - ((Math.min(Y1, Math.max(Y0, v)) - Y0) / (Y1 - Y0)) * (SPARK_H - 6);
  let d = `M${x(curve[0][0]).toFixed(1)} ${y(start).toFixed(1)}`;
  for (const [t, v] of curve) d += `H${x(t).toFixed(1)}V${y(v).toFixed(1)}`;
  d += `H${x(t1).toFixed(1)}`;
  const last = curve[curve.length - 1][1];
  return (
    <svg width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} aria-hidden>
      <line x1={0} x2={SPARK_W} y1={y(start)} y2={y(start)} className="sn-spark-base" />
      <path d={d} className="sn-spark-line" />
      <circle cx={x(t1)} cy={y(last)} r={3} className={last >= start ? "sn-spark-end up" : "sn-spark-end"} />
    </svg>
  );
}

/** Итоговая таблица: мини-график сезона у каждого, по строке открывается карточка игрока. */
export function SeasonTable() {
  const { recap, pick } = useSeason();
  const [all, setAll] = React.useState(false);
  const P = recap.players;
  const days = recap.days;
  const t0 = days.length ? Date.parse(`${days[0].date}T00:00:00+03:00`) : 0;
  const t1 = days.length ? Date.parse(`${days[days.length - 1].date}T00:00:00+03:00`) + 864e5 : 1;
  const leaders = new Set(recap.leaders.map((l) => l.player));
  const rows = all ? P : P.slice(0, FIRST_ROWS);
  return (
    <>
      <div className="sn-lb-scroll">
        <table className="sn-lb">
          <thead>
            <tr>
              <th>#</th>
              <th>Рейдер</th>
              <th className="r">MMR</th>
              <th className="sn-hide-sm">Путь за сезон</th>
              <th className="r sn-hide-sm">Пик</th>
              <th className="r">Победы</th>
              <th className="r">Пораж.</th>
              <th className="sn-hide-sm">Винрейт</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const wr = pc(p.wins, p.wins + p.losses);
              return (
                <tr key={p.login} className={i < 3 ? "top" : undefined} onClick={() => pick(i, true)}>
                  <td className="pos">{p.rank}</td>
                  <td className="who">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        pick(i, true);
                      }}
                      aria-label={`Карточка ${p.login}`}
                    >
                      {p.login}
                    </button>
                    <span className="sn-chips">
                      {i === 0 && <span className="sf-tagchip">{recap.live ? "лидер" : "чемпион"}</span>}
                      {p.losses === 0 && p.wins >= 3 && <span className="sf-tagchip sn-ok">без поражений</span>}
                      {i > 0 && leaders.has(i) && <span className="sf-tagchip">был первым</span>}
                    </span>
                  </td>
                  <td className="r mmr">{p.mmr}</td>
                  <td className="sn-hide-sm">
                    <Sparkline curve={p.curve} t0={t0} t1={t1} start={recap.summary.startMmr} />
                  </td>
                  <td className="r sn-hide-sm">{p.peak}</td>
                  <td className="r">{p.wins}</td>
                  <td className="r">{p.losses}</td>
                  <td className="sn-hide-sm">
                    <span className="sn-wr">
                      {wr}%
                      <span className="sn-meter">
                        <i style={{ width: `${wr}%` }} />
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sn-lb-foot">
        {P.length > FIRST_ROWS && (
          <button type="button" className="sf-btn sf-btn-line" onClick={() => setAll((v) => !v)} aria-expanded={all}>
            {all ? `Свернуть до ${FIRST_ROWS}` : `Показать всех ${P.length}`}
          </button>
        )}
        <p className="sn-cap">Победы и поражения - как в таблице лидеров: ×2 из таблицы организатора идёт за два матча.</p>
      </div>
    </>
  );
}

/** Карточка любого рейдера сезона: график как в профиле и все матчи. */
export function SeasonYou() {
  const { recap, sel, pick } = useSeason();
  const P = recap.players;
  const p = P[sel];
  const points = React.useMemo(() => playerPoints(recap, sel), [recap, sel]);
  const names = mapNames(recap);
  const days = leadDays(recap).get(sel) ?? 0;
  const ms = recap.matches.map((m, k) => ({ m, k })).filter(({ m }) => m.p.includes(sel)).reverse();
  if (!p) return null;
  const games = p.wins + p.losses;
  const stats: Array<[string, React.ReactNode, string]> = [
    ["MMR", p.mmr, `${signed(p.mmr - recap.summary.startMmr)} за сезон`],
    ["Место", p.rank, `из ${P.length}`],
    ["Пик", p.peak, dLong(p.peakAt)],
    ["Победы–пораж.", `${p.wins}–${p.losses}`, `винрейт ${pc(p.wins, games)}%`],
    ["Лучшая серия", p.winStreak, `${plural(p.winStreak, W_WIN)} подряд`],
    ["Соперников", p.opponents, `в ${pl(p.matches, W_MATCH)}`],
  ];
  return (
    <>
      <div className="sn-you-tools">
        <label htmlFor="sn-you-pick">Рейдер</label>
        <select id="sn-you-pick" className="sn-select" value={sel} onChange={(e) => pick(Number(e.target.value))}>
          {P.map((x, i) => (
            <option key={x.login} value={i}>
              {x.rank}. {x.login} · {x.mmr}
            </option>
          ))}
        </select>
        <Link className="sf-more" href={`/profile/${encodeURIComponent(p.login)}`}>
          Полный профиль
        </Link>
      </div>
      <div className="sn-you-head">
        <span className="rk">#{p.rank}</span>
        <span className="nm" style={nameSize(p.login, 80, "100cqw - 120px")}>
          {p.login}
        </span>
        <div className="sf-stamps">
          {sel === 0 && <span className="sf-stamp sn-acc">{recap.live ? "лидер сезона" : "чемпион сезона"}</span>}
          {p.losses === 0 && p.wins >= 3 && <span className="sf-stamp win">без поражений</span>}
          {days > 0 && (
            <span className="sf-stamp">
              {days} {plural(days, W_DAY)} первым
            </span>
          )}
        </div>
      </div>
      <dl className="sn-you-stats">
        {stats.map(([k, v, s]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>
              {v}
              <small>{s}</small>
            </dd>
          </div>
        ))}
      </dl>
      <ProfileChart key={sel} segments={[{ label: recap.season.name, start: recap.summary.startMmr, points }]} />
      <div className="sn-ml-scroll">
        <table className="sn-ml">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Соперник · MMR</th>
              <th>Итог</th>
              <th className="r">Δ MMR</th>
              <th className="r">MMR после</th>
              <th className="r">Счёт</th>
              <th>Карты</th>
            </tr>
          </thead>
          <tbody>
            {ms.map(({ m }) => {
              const me = m.p.indexOf(sel), op = 1 - me, won = m.winner === me;
              const opp = P[m.p[op]];
              const maps = m.rounds.filter((r) => r.played && r.map).map((r) => names[r.map] ?? "").filter(Boolean).join(", ");
              return (
                <tr key={m.id}>
                  <td className="mp">
                    <Link href={`/tournament/${m.id}`}>{dShort(m.at)}</Link>
                  </td>
                  <td className="op">
                    <button type="button" onClick={() => pick(m.p[op])}>
                      {opp.login}
                    </button>
                    <small>{m.before[op]}</small>
                  </td>
                  <td className={`res ${m.winner < 0 ? "" : won ? "sf-up" : "sf-down"}`}>{m.winner < 0 ? "ничья" : won ? "победа" : "поражение"}</td>
                  <td className={`r d ${m.delta[me] > 0 ? "sf-up" : m.delta[me] < 0 ? "sf-down" : ""}`}>
                    {signed(m.delta[me])}
                    {m.mult > 1 && <span className="sn-x2">×{m.mult}</span>}
                  </td>
                  <td className="r">{m.before[me] + m.delta[me]}</td>
                  <td className="r">{m.score ? `${m.score[me]}:${m.score[op]}` : "–"}</td>
                  <td className="mp">{maps || "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {ms.some(({ m }) => !m.score) && (
        <p className="sn-cap">Часть матчей перенесена из таблицы организатора: там записаны только итог и одна карта, без счёта.</p>
      )}
    </>
  );
}
