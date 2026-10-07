/* Даты для нового дизайна (по МСК): «Сб, 10 октября», «10.10 · 17:00», «7 октября». */

const MSK = "Europe/Moscow";

function valid(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** «7 октября». */
export function dayMonth(iso?: string | null): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat("ru-RU", { timeZone: MSK, day: "numeric", month: "long" }).format(d) : "";
}

/** «Сб, 10 октября». */
export function weekdayDate(iso?: string | null): string {
  const d = valid(iso);
  if (!d) return "";
  const wd = new Intl.DateTimeFormat("ru-RU", { timeZone: MSK, weekday: "short" }).format(d);
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${dayMonth(iso)}`;
}

/** «суббота». */
export function weekdayLong(iso?: string | null): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat("ru-RU", { timeZone: MSK, weekday: "long" }).format(d) : "";
}

/** «10.10». */
export function shortDate(iso?: string | null): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat("ru-RU", { timeZone: MSK, day: "2-digit", month: "2-digit" }).format(d) : "";
}

/** «07.10.2026». */
export function fullDate(iso?: string | null): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat("ru-RU", { timeZone: MSK, day: "2-digit", month: "2-digit", year: "numeric" }).format(d) : "";
}

/** «17:00». */
export function hhmm(iso?: string | null): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat("ru-RU", { timeZone: MSK, hour: "2-digit", minute: "2-digit" }).format(d) : "";
}

/** «1 матч», «3 матча», «5 матчей». */
export function matchesWord(n: number): string {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return "матчей";
  if (b === 1) return "матч";
  if (b >= 2 && b <= 4) return "матча";
  return "матчей";
}

/** Винрейт в процентах; без матчей - 0. */
export function winrate(wins: number, losses: number): number {
  return wins + losses > 0 ? Math.round((wins * 100) / (wins + losses)) : 0;
}

/** Стороны из названия «A vs B». */
export function splitTitle(title: string): [string, string] {
  const [a, b] = title.replace(/^\[история\]\s*/, "").split(/\s+vs\s+/i);
  return [a?.trim() || title, b?.trim() || ""];
}
