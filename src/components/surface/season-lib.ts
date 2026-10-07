/* Итоги сезона: склонения, проценты, даты по Москве и то, что страница выводит из ответа бэкенда. */

import type { CSSProperties } from "react";
import type { MmrPoint, RecapMatch, SeasonRecap } from "@/lib/types";

const MSK = "Europe/Moscow";

export type Forms = readonly [string, string, string];
export const W_MATCH: Forms = ["матч", "матча", "матчей"];
export const W_DAY: Forms = ["день", "дня", "дней"];
export const W_WIN: Forms = ["победа", "победы", "побед"];
export const W_LOSS: Forms = ["поражение", "поражения", "поражений"];
export const W_KNOCK: Forms = ["нок", "нока", "ноков"];
export const W_RAIDER: Forms = ["рейдер", "рейдера", "рейдеров"];
export const W_PLAYER: Forms = ["игрока", "игроков", "игроков"];
export const W_ROUND: Forms = ["раунд", "раунда", "раундов"];

export function plural(n: number, f: Forms): string {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2];
}

/** «178 матчей». */
export const pl = (n: number, f: Forms) => `${n.toLocaleString("ru-RU")} ${plural(n, f)}`;
/** Доля в процентах, без дробей. */
export const pc = (a: number, b: number) => (b ? Math.round((a * 100) / b) : 0);
/** Одна цифра после запятой: «4,6», «19». */
export const f1 = (v: number) => (Math.round(v * 10) / 10).toLocaleString("ru-RU");

/** «7 окт». */
export function dShort(t: number | string): string {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: MSK, day: "numeric", month: "short" }).format(new Date(t)).replace(".", "");
}

/** «7 октября». */
export function dLong(t: number | string): string {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: MSK, day: "numeric", month: "long" }).format(new Date(t));
}

/** День сезона из ГГГГ-ММ-ДД - полдень по Москве, чтобы дата не съезжала в соседний день. */
export const dayTime = (date: string) => Date.parse(`${date}T12:00:00+03:00`);

/** Шанс на победу по Эло - та же формула, что у рейтинга. */
export const elo = (self: number, opp: number) => 1 / (1 + Math.pow(10, (opp - self) / 400));

/** Стороны матча: победитель и проигравший (при ничьей - A и B). */
export function sides(m: RecapMatch): [number, number] {
  return m.winner === 1 ? [1, 0] : [0, 1];
}

export function mapNames(recap: SeasonRecap): Record<string, string> {
  return Object.fromEntries(recap.maps.map((m) => [m.code, m.name]));
}

/** Дни на первом месте по отрезкам лидерства. */
export function leadDays(recap: SeasonRecap): Map<number, number> {
  const out = new Map<number, number>();
  for (const l of recap.leaders) out.set(l.player, (out.get(l.player) ?? 0) + l.to - l.from + 1);
  return out;
}

/** Цветом выделены лидер таблицы, самый долгий лидер и соперник в решающем матче - так гонку легко читать. */
export function highlightColors(recap: SeasonRecap): Map<number, string> {
  const out = new Map<number, string>();
  if (!recap.players.length) return out;
  out.set(0, "var(--sn-c1)");
  const longest = [...leadDays(recap).entries()].sort((a, b) => b[1] - a[1])[0];
  if (longest && !out.has(longest[0])) out.set(longest[0], "var(--sn-c2)");
  const d = recap.matches[recap.decisive];
  if (d) {
    const rival = d.p[sides(d)[1]];
    if (!out.has(rival)) out.set(rival, "var(--sn-c3)");
  }
  return out;
}

/** Точки графика игрока, как в профиле: каждый матч и сверка рейтинга по порядку. */
export function playerPoints(recap: SeasonRecap, i: number): MmrPoint[] {
  const names = mapNames(recap);
  const P = recap.players;
  const pts: MmrPoint[] = [];
  for (const m of recap.matches) {
    const me = m.p.indexOf(i);
    if (me < 0) continue;
    const op = 1 - me;
    pts.push({
      tournamentId: m.id,
      title: `${P[m.p[0]].login} vs ${P[m.p[1]].login}`,
      date: m.at,
      opponent: P[m.p[op]].login,
      opponentKey: P[m.p[op]].login,
      map: m.rounds.filter((r) => r.played && r.map).map((r) => names[r.map] ?? "").filter(Boolean).join(" · "),
      mmr: m.before[me] + m.delta[me],
      delta: m.delta[me],
      win: m.winner === me,
      mult: m.mult,
      games: m.games,
      season: recap.season.id,
    });
  }
  for (const [t, mmr, corr] of P[i].curve) {
    if (corr) pts.push({ tournamentId: "", title: "Сверка рейтинга", date: new Date(t).toISOString(), opponent: "", map: "", mmr, delta: 0, win: false, mult: 1, correction: true });
  }
  pts.sort((a, b) => Date.parse(a.date!) - Date.parse(b.date!));
  let prev = recap.summary.startMmr;
  for (const p of pts) {
    if (p.correction) p.delta = p.mmr - prev;
    prev = p.mmr;
  }
  return pts;
}

// Ширина буквы широкого шрифта ников в долях кегля - с запасом.
const WIDE_CHAR = 1.2;

/** Размер крупного ника по ширине блока (room - в единицах контейнера cqw): длинный ник не переносится по
    буквам и не вылезает за край. */
export function nameSize(name: string, max: number, room: string): CSSProperties {
  return { fontSize: `min(${max}px, calc((${room}) / ${(name.length * WIDE_CHAR).toFixed(2)}))` };
}
