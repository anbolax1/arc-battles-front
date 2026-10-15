/* Пояс лиги: склонения, дни владения и итоги по игрокам - из ответа /api/belt. */

import type { Belt, BeltPlayer, BeltReign, Tournament } from "@/lib/types";
import { plural, type Forms } from "@/components/surface/season-lib";

export const W_DEF: Forms = ["защита", "защиты", "защит"];
export const W_TIME: Forms = ["раз", "раза", "раз"];
export const W_GAMEDAY: Forms = ["игровой день", "игровых дня", "игровых дней"];
export const W_HOLDER: Forms = ["носитель", "носителя", "носителей"];
export const W_CHANGE: Forms = ["смена хозяина", "смены хозяина", "смен хозяина"];

/** Текущее время для подсчёта дней: страницы с поясом рисуются на сервере на каждый запрос. */
export const serverNow = () => Date.now();

const DAY = 864e5;
const MSK = 3 * 3600e3;

/** Номер дня по Москве: владение считается календарными днями, как их видит зритель. */
const mskDay = (t: number) => Math.floor((t + MSK) / DAY);

/** Сколько дней игрок держал пояс; у нынешнего носителя - по сегодня, и в день взятия это 0. */
export function reignDays(r: BeltReign, now = Date.now()): number {
  const days = mskDay(r.to ? Date.parse(r.to) : now) - mskDay(Date.parse(r.from));
  return r.to ? Math.max(1, days) : Math.max(0, days);
}

export const holderName = (p: BeltPlayer) => p.displayName || p.login;

/** «10-й в истории лиги» или «берёт пояс 2-й раз» - подпись к нынешнему носителю. */
export function holderTag(r: BeltReign): string {
  return r.time > 1 ? `берёт пояс ${r.time}-й раз` : `${r.newcomer}-й в истории лиги`;
}

/** Как игрок взял пояс - для подписей и подсказок. */
export function howTaken(r: BeltReign): string {
  const opp = r.opponent ? holderName(r.opponent) : "";
  if (r.how === "first") return `выиграл первый матч лиги${opp ? ` у ${opp}` : ""}`;
  if (r.how === "pick") return `подобрал ничей пояс${opp ? `, обыграв ${opp}` : ""}`;
  return `обыграл носителя${opp ? ` ${opp}` : ""}`;
}

/** Чем кончилось владение. */
export function howEnded(r: BeltReign, rustLimit: number): string {
  if (r.end === "drop") return `пояс выпал: ${rustLimit} ${plural(rustLimit, W_GAMEDAY)} без матча`;
  if (r.end === "lost") return `проиграл ${r.lostTo ? holderName(r.lostTo) : "сопернику"}`;
  return "держит сейчас";
}

export interface BeltHolderStats {
  player: BeltPlayer;
  reigns: BeltReign[];
  days: number;
  defenses: number;
  /** Больше всего защит за одно владение. */
  bestRun: number;
  holdsNow: boolean;
}

/** Итог по каждому, кто держал пояс, в порядке первого владения. */
export function holderStats(belt: Belt, now = Date.now()): BeltHolderStats[] {
  const by = new Map<string, BeltHolderStats>();
  for (const r of belt.reigns) {
    const s = by.get(r.holder.userId) ?? { player: r.holder, reigns: [], days: 0, defenses: 0, bestRun: 0, holdsNow: false };
    s.reigns.push(r);
    s.days += reignDays(r, now);
    s.defenses += r.defenses.length;
    s.bestRun = Math.max(s.bestRun, r.defenses.length);
    s.holdsNow = s.holdsNow || !r.end;
    by.set(r.holder.userId, s);
  }
  return [...by.values()];
}

/** Ржавчина словами: сколько осталось до того, как пояс выпадет. */
export function rustText(belt: Belt): string {
  const left = belt.rustLimit - belt.rust;
  if (belt.rust === 0) return `Ржавчины нет. Если носитель пропустит ${belt.rustLimit} игровых дней подряд, пояс выпадет.`;
  return `Ещё ${left} ${plural(left, W_GAMEDAY)} без матча — и пояс выпадет.`;
}

/** Что матч сделал с поясом: у сыгранного - смена хозяина, защита или ничья носителя, у идущего - за что он. */
export type MatchBeltMark =
  | { kind: "first" | "take" | "pick"; reign: BeltReign; prev: BeltReign | null }
  | { kind: "defense"; reign: BeltReign; n: number }
  | { kind: "draw"; reign: BeltReign; stars: number }
  | { kind: "defend"; holder: BeltPlayer; defenses: number; rust: number }
  | { kind: "vacant"; leaders: BeltPlayer[] };

/** Пояс в матче; шоу-матчи и 2×2 его не разыгрывают. users - игроки сторон: без них ничью носителя не узнать. */
export function matchBelt(belt: Belt | null, t: Tournament, users: string[]): MatchBeltMark | null {
  if (!belt || t.mode !== "1x1" || t.format === "show") return null;
  if (t.status === "finished") {
    for (let i = 0; i < belt.reigns.length; i++) {
      const r = belt.reigns[i];
      if (r.matchId === t.id) return { kind: r.how, reign: r, prev: belt.reigns[i - 1] ?? null };
      const d = r.defenses.findIndex((x) => x.matchId === t.id);
      if (d >= 0) return { kind: "defense", reign: r, n: d + 1 };
    }
    if (t.winnerParticipantId) return null;
    const at = Date.parse(t.startsAt || t.createdAt);
    const r = belt.reigns.find((x) => users.includes(x.holder.userId) && Date.parse(x.from) < at && (!x.to || at < Date.parse(x.to)));
    return r ? { kind: "draw", reign: r, stars: r.defenses.filter((x) => Date.parse(x.at) < at).length } : null;
  }
  if (t.status !== "live") return null;
  if (belt.holder) {
    return users.includes(belt.holder.userId) ? { kind: "defend", holder: belt.holder, defenses: belt.defenses, rust: belt.rust } : null;
  }
  // Ничей пояс разыгрывает матч лидера таблицы, а пока в сезоне нет матчей - первый же матч.
  const leaders = belt.leaders ?? [];
  return !belt.reigns.length || !leaders.length || leaders.some((l) => users.includes(l.userId)) ? { kind: "vacant", leaders } : null;
}

/** Пометка коротко - для ярлыка в шапке матча и строки в результатах. */
export function beltMarkLabel(m: MatchBeltMark): string {
  switch (m.kind) {
    case "first":
      return "первый носитель пояса";
    case "take":
      return "пояс сменил хозяина";
    case "pick":
      return "ничей пояс подобран";
    case "defense":
      return `защита пояса №${m.n}`;
    case "draw":
      return "пояс остался у носителя";
    case "defend":
      return "матч за пояс";
    case "vacant":
      return "матч за ничей пояс";
  }
}
