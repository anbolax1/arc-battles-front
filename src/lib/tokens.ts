/* Жетоны и числа из профиля в игре: подписи общие для профиля, пульта и кабинета. */

import type { StatKind, TokenKind } from "@/lib/types";

export const STAT_LABEL: Record<StatKind, string> = {
  hours: "Часов в игре",
  knocks: "Сделано ноков",
};

/** Пределы - те же, что проверяет сервер: больше в профиле игры не бывает. */
export const STAT_LIMIT: Record<StatKind, number> = {
  hours: 20000,
  knocks: 1000000,
};

export const STAT_KINDS: StatKind[] = ["hours", "knocks"];

export const TOKEN_KINDS: TokenKind[] = ["double", "priority", "reset"];

export const TOKEN_LABEL: Record<TokenKind, string> = {
  double: "Двойной рейтинг",
  priority: "Без очереди",
  reset: "Полный сброс",
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
