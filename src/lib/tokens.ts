/* Жетоны и числа из профиля в игре: подписи общие для профиля, пульта и кабинета. */

import type { NumericStatKind, StatKind, TokenKind } from "@/lib/types";

export const STAT_LABEL: Record<StatKind, string> = {
  hours: "Часы на поверхности",
  knocks: "Количество ноков",
  server: "Сервер",
};

/** Пределы - те же, что проверяет сервер: больше в профиле игры не бывает. */
export const STAT_LIMIT: Record<NumericStatKind, number> = {
  hours: 20000,
  knocks: 1000000,
};

export const STAT_KINDS: NumericStatKind[] = ["hours", "knocks"];

/** Игровые регионы: коды те же, что принимает сервер, первый - по умолчанию у всех. */
export const REGIONS: { code: string; label: string }[] = [
  { code: "eu", label: "Европа" },
  { code: "na", label: "Северная Америка" },
  { code: "asia", label: "Азия" },
  { code: "sa", label: "Южная Америка" },
  { code: "oceania", label: "Океания" },
];

export function regionLabel(code?: string): string {
  return REGIONS.find((r) => r.code === code)?.label ?? REGIONS[0].label;
}

export const TOKEN_KINDS: TokenKind[] = ["double", "priority", "reset"];

export const TOKEN_LABEL: Record<TokenKind, string> = {
  double: "Двойной рейтинг",
  priority: "Без очереди",
  reset: "Сброс рейтинга",
};

/** «12 345» - с неразрывным пробелом между тысячами. */
export function fmtCount(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

/** «+3 жетона», «−1 жетон». */
export function tokensWord(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return "жетонов";
  if (b === 1) return "жетон";
  if (b > 1 && b < 5) return "жетона";
  return "жетонов";
}
