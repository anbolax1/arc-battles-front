/* Чистые хелперы форматирования (без зависимостей). Единый источник для
   склонений, дат, имени матча и подписи штрафа усложнения. */

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
const MONTHS_SHORT = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

/** Инициалы для аватара: первые 2 буквенно-цифровых символа имени, в верхнем
    регистре. Пустое имя → «··». */
export function initials(name?: string | null): string {
  if (!name) return "··";
  const chars = name.replace(/[^\p{L}\p{N}]/gu, "");
  return (chars.slice(0, 2) || "··").toUpperCase();
}

/** Склонение «балл / балла / баллов» по числу (с учётом 11–14). */
export function pluralPoints(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return "баллов";
  if (b === 1) return "балл";
  if (b >= 2 && b <= 4) return "балла";
  return "баллов";
}

/** «24 балла», «−1 балл» и т.п. */
export function pointsLabel(n: number): string {
  return `${n} ${pluralPoints(n)}`;
}

/** Склонение «минута / минуты / минут» по числу. */
export function pluralMinutes(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return "минут";
  if (b === 1) return "минута";
  if (b >= 2 && b <= 4) return "минуты";
  return "минут";
}

/** Штраф протокола в минутах: «1 минута», «3 минуты». */
export function minutesLabel(n: number): string {
  return `${n} ${pluralMinutes(n)}`;
}

/** Подпись штрафа усложнения: фикс «−5 баллов» либо процент «−10%». */
export function penaltyLabel(c: { valueType: "fixed" | "percent"; value: number }): string {
  return c.valueType === "percent" ? `−${c.value}%` : `−${pointsLabel(c.value)}`;
}

/** Имя матча из ников сторон: «A vs B» (для 2×2 имя стороны — состав «n1 & n2»). */
export function matchName(sides?: ReadonlyArray<{ name: string }> | null): string {
  if (!sides || sides.length < 2) return "—";
  return `${sides[0].name} vs ${sides[1].name}`;
}

/** Разбор момента в компоненты по МСК (Europe/Moscow) — независимо от того, в
    какой зоне пришла строка. Сайт живёт по московскому времени. */
function mskParts(iso?: string | null): { y: number; m: number; d: number; hh: string; mm: string } | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  let hh = get("hour");
  if (hh === "24") hh = "00"; // некоторые ICU отдают 24 для полуночи
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), hh, mm: get("minute") };
}

/** «18 июня 2026» (по МСК). */
export function fmtDate(iso?: string | null): string {
  const p = mskParts(iso);
  if (!p) return "—";
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

export function fmtDay(iso?: string | null): string {
  return mskParts(iso)?.d.toString() ?? "";
}

export function fmtMonShort(iso?: string | null): string {
  const p = mskParts(iso);
  return p ? MONTHS_SHORT[p.m - 1] : "";
}

/** «20:00» по МСК. */
export function fmtTime(iso?: string | null): string {
  const p = mskParts(iso);
  return p ? `${p.hh}:${p.mm}` : "";
}

/** Награда задания: «+2 балла» (fixed) или «+15%» (percent). points — сырое значение. */
export function taskReward(t: { points: number; valueType: "fixed" | "percent" }): string {
  return t.valueType === "percent" ? `+${t.points}%` : `+${pointsLabel(t.points)}`;
}

/** Штраф усложнения: «−1 балл» (fixed) или «−10%» (percent). penalty — сырое значение. */
export function complicationPenalty(c: { penalty: number; valueType: "fixed" | "percent" }): string {
  return c.valueType === "percent" ? `−${c.penalty}%` : `−${pointsLabel(c.penalty)}`;
}
