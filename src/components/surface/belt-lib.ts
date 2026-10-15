/* Пояс лиги: склонения, дни владения и итоги по игрокам - из ответа /api/belt. */

import type { Belt, BeltPlayer, BeltReign } from "@/lib/types";
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
