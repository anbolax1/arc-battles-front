import type { Chance } from "@/lib/types";

/** Шансы сторон целыми процентами, в сумме ровно 100, и шанс ничьей отдельно - как на сервере.
    Ничья - равный счёт после всех рейдов: тогда матч решает дуэль до первого нока, её доля уже в шансах сторон. */
export function chancePercents(c: Chance): [number, number, number] {
  const a = Math.round(c.a * 100);
  return [a, Math.round(c.draw * 100), 100 - a];
}

/** Ничью показываем, только когда она хоть сколько-то вероятна: 0% - лишний шум. */
export const DRAW_SHOWN = 1;

/** Все рейды сыграны, счёт равный: идёт дуэль, вместо процента ничьей - слово. */
export const DUEL_NOW = 100;

/** Подпись ничьей: процент или дуэль, когда до неё уже дошло. */
export function drawLabel(pct: number): string {
  return pct >= DUEL_NOW ? "дуэль до нока" : `ничья ${pct}%`;
}

/** Смена шанса, о которой стоит сказать стрелкой у числа. */
export const CHANCE_JUMP = 5;
