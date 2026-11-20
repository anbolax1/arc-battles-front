/** Сезон снега на сайте: с 21 ноября по 5 марта включительно (месяцы с нуля). */
const SEASON_START = { month: 10, day: 21 };
const SEASON_END = { month: 2, day: 5 };

export function inSnowSeason(d: Date = new Date()): boolean {
  const m = d.getMonth();
  const day = d.getDate();
  if (m === SEASON_START.month) return day >= SEASON_START.day;
  if (m === SEASON_END.month) return day <= SEASON_END.day;
  return m === 11 || m === 0 || m === 1;
}

/** Снег выключен кнопкой: у <html> стоит data-snow="off", всё снежное оформление прячется. */
export const SNOW_ATTR = "data-snow";

/** Сколько дней без матчей до каждой ступени снега: припорошило, замело, заледенел. */
const IDLE_STEPS = [7, 14, 30];

export type IdleLevel = 0 | 1 | 2 | 3;

export function idleLevel(days: number): IdleLevel {
  let level: IdleLevel = 0;
  IDLE_STEPS.forEach((d, i) => {
    if (days >= d) level = (i + 1) as IdleLevel;
  });
  return level;
}

/** «1 день», «3 дня», «11 дней». */
export function daysWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} день`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} дня`;
  return `${n} дней`;
}
