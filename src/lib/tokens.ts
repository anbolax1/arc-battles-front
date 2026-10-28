/* Числа из профиля в игре: подписи общие для профиля и кабинета. */

import type { StatKind } from "@/lib/types";

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

/** «12 345» - с неразрывным пробелом между тысячами. */
export function fmtCount(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}
