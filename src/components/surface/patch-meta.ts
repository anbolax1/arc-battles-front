/* Нашивки: названия, правила, группы и подписи «свой результат». Коды и пороги - как на бэкенде. */

import type { PatchCode, PlayerPatch, Season } from "@/lib/types";
import { dayMonth, matchesWord } from "@/components/surface/fmt";
import { pluralKnocks } from "@/lib/format";

export const PATCH_GROUPS: Array<{ name: string; codes: PatchCode[] }> = [
  { name: "Рейтинг", codes: ["top1", "belt", "regicide"] },
  { name: "Матчи", codes: ["streak", "flawless", "david", "comeback", "double", "photo", "shutout", "revenge"] },
  { name: "Ноки и карты", codes: ["hunter", "clear", "topknock", "pacifist", "king"] },
  { name: "Сезон", codes: ["first", "final", "marathon", "veteran"] },
];

export const PATCH_ORDER: PatchCode[] = PATCH_GROUPS.flatMap((g) => g.codes);

/** Ступени «Охотника»: ноков за сезон. */
export const HUNTER_TIERS = [10, 25, 50];
/** «Неудержимый» и «Марафонец»: сколько нужно, для полоски «сколько осталось». */
export const STREAK_GOAL = 5;
export const MARATHON_GOAL = 20;

export const ROMAN = ["", "I", "II", "III"];

export interface PatchInfo {
  name: string;
  /** Коротко, за что даётся: строка рядом с нашивкой. */
  rule: string;
  /** Подробнее - для страницы всех нашивок. */
  about: string;
  /** Выдаётся по итогу сезона: пока он идёт, у лидера - «претендент». */
  seasonEnd?: boolean;
}

export const PATCH_INFO: Record<PatchCode, PatchInfo> = {
  top1: { name: "Первый номер", rule: "1-е место в таблице сезона", about: "Первое место в таблице на закрытие сезона.", seasonEnd: true },
  belt: { name: "Носитель пояса", rule: "держал пояс сезона", about: "Сезон начинает с поясом чемпион прошлого. Пояс переходит к тому, кто обыграл носителя." },
  regicide: { name: "Цареубийца", rule: "победа над лидером таблицы", about: "Соперник был первым в таблице прямо перед матчем." },
  streak: { name: "Неудержимый", rule: "5 побед подряд", about: "Пять побед подряд за сезон. Ничья прерывает серию." },
  flawless: { name: "Без поражений", rule: "5 побед и ни одного поражения", about: "Пять побед и ни одного поражения за весь сезон.", seasonEnd: true },
  david: { name: "Против шансов", rule: "победа при шансе 40% и ниже", about: "Перед матчем шанс по рейтингу был 40% или меньше, а победа - твоя." },
  comeback: { name: "Камбэк", rule: "проиграл 1-й рейд, выиграл матч", about: "Первый рейд за соперником, матч - за тобой." },
  double: { name: "Двойная ставка", rule: "победа в матче ×2", about: "Победа в матче, где MMR удваивается." },
  photo: { name: "Фотофиниш", rule: "победа в одно очко", about: "Матч выигран с разницей ровно в одно очко." },
  shutout: { name: "Всухую", rule: "соперник без единого очка", about: "Победа, а у соперника за матч ни одного очка." },
  revenge: { name: "Реванш", rule: "обыграл того, кому проигрывал", about: "Победа над тем, кто раньше в сезоне обыграл тебя." },
  hunter: { name: "Охотник", rule: "10, 25 и 50 ноков за сезон", about: "Ноки за сезон, три ступени: 10, 25 и 50." },
  clear: { name: "Зачистка", rule: "8 ноков за один рейд", about: "Восемь ноков или больше за один рейд." },
  topknock: { name: "Главный охотник", rule: "больше всех ноков за сезон", about: "Больше всех ноков за сезон.", seasonEnd: true },
  pacifist: { name: "Пацифист", rule: "победа без единого нока", about: "Ноки в матче были, но у победителя - ни одного." },
  king: { name: "Король карты", rule: "больше всех побед на карте", about: "Больше всех побед в матчах на карте, минимум три.", seasonEnd: true },
  first: { name: "Первый рейд", rule: "играл в первый день сезона", about: "Матч в первый игровой день сезона." },
  final: { name: "Последний аккорд", rule: "победа в последний день сезона", about: "Победа в последний игровой день сезона." },
  marathon: { name: "Марафонец", rule: "20 матчей за сезон", about: "Двадцать матчей за сезон; матч ×2 прошлых сезонов идёт за два." },
  veteran: { name: "Ветеран", rule: "играл и в прошлом сезоне", about: "Играл и в этом сезоне, и в прошлом." },
};

function times(n: number): string {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? "раз" : b >= 2 && b <= 4 ? "раза" : "раз";
}

function wins(n: number): string {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return "побед";
  return b === 1 ? "победа" : b >= 2 && b <= 4 ? "победы" : "побед";
}

/** Название с учётом ступени: «Охотник II». */
export function patchName(code: PatchCode, tier = 1): string {
  const n = PATCH_INFO[code].name;
  return code === "hunter" && tier > 0 ? `${n} ${ROMAN[Math.min(tier, 3)]}` : n;
}

/** Свой результат по нашивке: «8 подряд», «7:6 с LUGOVOISES». mapName приводит карту к написанию справочника. */
export function patchResult(p: Pick<PlayerPatch, "code" | "tier" | "detail" | "earnedAt">, mapName: (s: string) => string = (s) => s): string {
  const d = p.detail ?? {};
  const score = d.score ? `${d.score[0]}:${d.score[1]} с ${d.opp ?? "—"}` : "";
  switch (p.code) {
    case "top1":
      return `${d.mmr ?? 0} MMR`;
    case "belt":
      if (d.defenses) return `защит: ${d.defenses}`;
      return (d.reigns ?? 1) > 1 ? `держал ${d.reigns} ${times(d.reigns ?? 0)}` : "держал пояс";
    case "regicide":
    case "revenge":
      return `над ${d.opp ?? "—"}`;
    case "streak":
      return `${d.best ?? 0} подряд`;
    case "flawless":
      return `${d.wins ?? 0}–0`;
    case "david":
    case "comeback":
      return `${d.n ?? 1} ${times(d.n ?? 1)}`;
    case "double":
      return `${d.n ?? 1} ${wins(d.n ?? 1)} ×2`;
    case "photo":
    case "shutout":
    case "pacifist":
      return score;
    case "hunter":
    case "topknock":
      return `${d.knocks ?? 0} ${pluralKnocks(d.knocks ?? 0)}`;
    case "clear":
      return `${d.knocks ?? 0} за рейд против ${d.opp ?? "—"}`;
    case "king":
      return (d.maps ?? []).map(mapName).join(", ");
    case "first":
    case "final":
      return dayMonth(p.earnedAt);
    case "marathon":
      return `${d.games ?? 0} ${matchesWord(d.games ?? 0)}`;
    case "veteran":
      return `${d.games ?? 0} ${matchesWord(d.games ?? 0)} в прошлом сезоне`;
  }
}

export interface Rarity {
  key: "legendary" | "epic" | "rare" | "uncommon" | "common";
  label: string;
  color: string;
}

const RARITIES: Rarity[] = [
  { key: "legendary", label: "легендарная", color: "#f9cf0a" },
  { key: "epic", label: "эпическая", color: "#c35bff" },
  { key: "rare", label: "редкая", color: "#3d9bff" },
  { key: "uncommon", label: "необычная", color: "#3fd37a" },
  { key: "common", label: "обычная", color: "#a7a0aa" },
];

/** Редкость нашивки - как у предметов в игре, по доле рейдеров сезона, что её носят. */
export function patchRarity(holders: number, players: number): Rarity {
  const pct = (holders * 100) / Math.max(players, 1);
  if (pct <= 3) return RARITIES[0];
  if (pct <= 5) return RARITIES[1];
  if (pct <= 10) return RARITIES[2];
  if (pct <= 20) return RARITIES[3];
  return RARITIES[4];
}

export const PATCH_RARITIES = RARITIES;

/** Редкость карточки рейдера по MMR сезона: пороги растут с K-фактором, при K=100 - 1400, 1250, 1150, 1050. */
export function cardRarity(mmr: number, season?: Pick<Season, "kFactor" | "startMmr"> | null): Rarity & { min: number } {
  const k = season?.kFactor || 100, start = season?.startMmr || 1000;
  const steps: Array<[number, Rarity["key"], string]> = [
    [4, "legendary", "Легендарный"],
    [2.5, "epic", "Эпический"],
    [1.5, "rare", "Редкий"],
    [0.5, "uncommon", "Необычный"],
  ];
  for (const [mul, key, label] of steps) {
    const min = Math.round(start + mul * k);
    if (mmr >= min) return { ...RARITIES.find((r) => r.key === key)!, label, min };
  }
  return { ...RARITIES[4], label: "Обычный", min: 0 };
}

/** Пороги редкости карточки для подписи под ней. */
export function cardRarityScale(season?: Pick<Season, "kFactor" | "startMmr"> | null): Array<{ label: string; color: string; from: string }> {
  const k = season?.kFactor || 100, start = season?.startMmr || 1000;
  const at = (mul: number) => Math.round(start + mul * k);
  return [
    { label: "Легендарный", color: RARITIES[0].color, from: `${at(4)}+` },
    { label: "Эпический", color: RARITIES[1].color, from: `${at(2.5)}+` },
    { label: "Редкий", color: RARITIES[2].color, from: `${at(1.5)}+` },
    { label: "Необычный", color: RARITIES[3].color, from: `${at(0.5)}+` },
    { label: "Обычный", color: RARITIES[4].color, from: `до ${at(0.5)}` },
  ];
}
