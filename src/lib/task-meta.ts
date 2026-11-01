import type { CatalogTask, TaskFormat, TaskKind, TaskRarity, TaskRoundType } from "./types";

/** Редкость задания: название, цвет и цвет текста на залитой кнопке (читаемость на светлых цветах). */
export interface RarityMeta {
  id: TaskRarity;
  label: string;
  color: string;
  ink: string;
}

export const RARITIES: RarityMeta[] = [
  { id: "common", label: "Обычное", color: "#6c6c6c", ink: "#ffffff" },
  { id: "uncommon", label: "Необычное", color: "#26bf57", ink: "#07210f" },
  { id: "rare", label: "Редкое", color: "#00a9f2", ink: "#00202f" },
  { id: "epic", label: "Эпическое", color: "#cc3099", ink: "#ffffff" },
  { id: "legendary", label: "Легендарное", color: "#ffc600", ink: "#2a2000" },
];

/** Дополнительное условие «На время» - независимо от редкости. */
export const TIMED_META = { label: "На время", color: "#ff8126", ink: "#2b1200" };

export interface OptionMeta<T extends string> {
  id: T;
  label: string;
  color?: string;
  ink?: string;
}

export const FORMATS: OptionMeta<TaskFormat>[] = [
  { id: "1x1", label: "1×1" },
  { id: "2x2", label: "2×2" },
  { id: "any", label: "Оба формата" },
];

export const KINDS: OptionMeta<TaskKind>[] = [
  { id: "pvp", label: "PvP" },
  { id: "pve", label: "PvE" },
  { id: "pvpve", label: "Для всех" },
];

export const ROUND_TYPES: OptionMeta<TaskRoundType>[] = [
  { id: "any", label: "Любой раунд" },
  { id: "free", label: "Бесплатный раунд", color: "#26bf57", ink: "#07210f" },
  { id: "paid", label: "Платный раунд", color: "#00a9f2", ink: "#00202f" },
];

/** Цвет метки формата матча: общий для 1×1 и 2×2, чтобы не множить цвета на карточке. */
export const FORMAT_COLOR = "#8b8fa8";

export const rarityMeta = (v?: string): RarityMeta => RARITIES.find((r) => r.id === v) ?? RARITIES[0];
export const formatLabel = (v?: string): string => FORMATS.find((f) => f.id === v)?.label ?? "Оба формата";
export const kindLabel = (v?: string): string => KINDS.find((k) => k.id === v)?.label ?? v ?? "";
export const roundTypeMeta = (v?: string): OptionMeta<TaskRoundType> => ROUND_TYPES.find((r) => r.id === v) ?? ROUND_TYPES[0];

export const taskFormat = (t: Pick<CatalogTask, "format">): TaskFormat => t.format ?? "any";
export const taskRarity = (t: Pick<CatalogTask, "rarity">): TaskRarity => rarityMeta(t.rarity).id;
export const taskRoundType = (t: Pick<CatalogTask, "roundType">): TaskRoundType => roundTypeMeta(t.roundType).id;

export const MIN_POINTS = 1;
export const MAX_POINTS = 10;
const DEFAULT_TASK_POINTS = 2;
const DEFAULT_TIMED_POINTS = 1;

/** Баллы по умолчанию: обычное задание - 2, на время - 1. Редкость на них не влияет. */
export function defaultPoints(timed: boolean): number {
  return timed ? DEFAULT_TIMED_POINTS : DEFAULT_TASK_POINTS;
}

/** Баллы из поля, если это целое в допустимых пределах; иначе null. */
export function parsePoints(v: string): number | null {
  if (!/^\d+$/.test(v.trim())) return null;
  const n = Number(v);
  return n >= MIN_POINTS && n <= MAX_POINTS ? n : null;
}

/** Общие характеристики задания: одни и те же в форме одного задания и во вставке списком. */
export interface TaskSettings {
  format: TaskFormat;
  kind: TaskKind;
  rarity: TaskRarity;
  timed: boolean;
  roundType: TaskRoundType;
  mapCodes: string[];
  /** Строкой, чтобы поле можно было стереть и вписать заново. */
  points: string;
  /** Баллы правили руками - от переключения «На время» они уже не меняются. */
  pointsTouched: boolean;
  source: "official" | "boosty";
  author: string;
  title: string;
}

export function defaultSettings(over: Partial<TaskSettings> = {}): TaskSettings {
  return {
    format: "1x1",
    kind: "pvp",
    rarity: "common",
    timed: false,
    roundType: "any",
    mapCodes: [],
    points: String(defaultPoints(false)),
    pointsTouched: false,
    source: "official",
    author: "",
    title: "",
    ...over,
  };
}

/** Переключает «На время»; неправленые баллы переходят на значение по умолчанию. */
export function withTimed(s: TaskSettings, timed: boolean): TaskSettings {
  return { ...s, timed, points: s.pointsTouched ? s.points : String(defaultPoints(timed)) };
}

/** Тело запроса из общих характеристик; одно и то же для создания, правки и вставки списком. */
export function settingsBody(s: TaskSettings, points: number) {
  return {
    kind: s.kind,
    format: s.format,
    rarity: s.rarity,
    tag: s.timed ? "timed" : "normal",
    roundType: s.roundType,
    mapCodes: s.mapCodes,
    points,
    valueType: "fixed",
    source: s.source,
    author: s.source === "boosty" ? s.author : "",
    title: s.source === "boosty" ? s.title : "",
  };
}

/** Строка для предпросмотра: «2×2 / PvP / Эпическое / На время / Платный раунд». */
export function describeSettings(s: TaskSettings, mapName: (code: string) => string): string {
  const parts: string[] = [formatLabel(s.format)];
  parts.push(kindLabel(s.kind));
  parts.push(rarityMeta(s.rarity).label);
  if (s.timed) parts.push(TIMED_META.label);
  if (s.roundType !== "any") parts.push(roundTypeMeta(s.roundType).label);
  parts.push(s.mapCodes.length ? s.mapCodes.map(mapName).join(", ") : "все карты");
  parts.push(`${s.points || "?"} б.`);
  return parts.join(" / ");
}

/** Фильтры списка заданий в кабинете; "all" - без ограничения по этой характеристике. */
export interface TaskFilter {
  format: TaskFormat | "all";
  kind: TaskKind | "all";
  rarity: TaskRarity | "all";
  timed: "all" | "timed" | "normal";
  roundType: TaskRoundType | "all";
  /** "all", "universal" (без карты) или код карты. */
  map: string;
  source: "all" | "official" | "boosty";
  showOff: boolean;
  query: string;
}

/** Задание проходит все выбранные фильтры сразу (И). */
export function matchesFilter(t: CatalogTask, f: TaskFilter): boolean {
  const q = f.query.trim().toLowerCase();
  return (
    (f.showOff || t.active) &&
    (f.format === "all" || taskFormat(t) === f.format) &&
    (f.kind === "all" || t.kind === f.kind) &&
    (f.rarity === "all" || taskRarity(t) === f.rarity) &&
    (f.timed === "all" || (f.timed === "timed") === (t.tag === "timed")) &&
    (f.roundType === "all" || taskRoundType(t) === f.roundType) &&
    (f.map === "all" || (f.map === "universal" ? !t.mapCodes.length : t.mapCodes.includes(f.map))) &&
    (f.source === "all" || t.source === f.source) &&
    (!q || `${t.name ?? ""} ${t.text}`.toLowerCase().includes(q))
  );
}

/** Плашка задания в матче и виджете: «На время» оранжевая, остальные - редкость своим цветом. */
export interface TaskBadge {
  label: string;
  color: string;
  ink: string;
}

export function taskBadge(t: { tag?: string; rarity?: string }): TaskBadge {
  if (t.tag === "timed") return { label: TIMED_META.label, color: TIMED_META.color, ink: TIMED_META.ink };
  const r = rarityMeta(t.rarity);
  return { label: r.label, color: r.color, ink: r.ink };
}
