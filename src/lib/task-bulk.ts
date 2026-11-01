// Разбор вставленного списка заданий. Чистые функции без React: проверяются тестами в task-bulk.test.mjs.

/** Запись списка: одно задание, возможно из нескольких строк (ячейка таблицы с переносом). */
export interface BulkRecord {
  text: string;
  /** Где запись лежит в исходном тексте: чтобы поправить её, не трогая остальные. */
  start: number;
  end: number;
}

export type BulkProblem = "no-separator" | "empty-name" | "empty-text" | "duplicate" | "exists";

export interface BulkRow {
  /** Номер записи в списке, с 1. */
  n: number;
  name: string;
  text: string;
  /** Есть причина не добавлять строку; пока она не исправлена, строка пропускается. */
  problem?: BulkProblem;
  /** Номер строки, которую эта дублирует. */
  duplicateOf?: number;
  record: BulkRecord;
}

export const PROBLEM_TEXT: Record<BulkProblem, string> = {
  "no-separator": "нет разделителя: напишите «Название:Описание» или «Название | Описание»",
  "empty-name": "пустое название",
  "empty-text": "пустое описание",
  duplicate: "повтор строки выше",
  exists: "такое задание уже есть в каталоге",
};

const squeeze = (s: string) => s.replace(/\s+/g, " ").trim();
const countQuotes = (s: string) => (s.match(/"/g) ?? []).length;

/** Название без обрамляющих «ёлочек» и кавычек. */
const cleanName = (s: string) =>
  squeeze(s)
    .replace(/^["«“]+|["»”]+$/g, "")
    .trim();

/** Делит текст на записи: пустые строки пропускаются, ячейка таблицы в кавычках с переносом остаётся одной записью. */
export function splitRecords(raw: string): BulkRecord[] {
  const out: BulkRecord[] = [];
  const lineRe = /[^\r\n]*(?:\r\n|\n|\r|$)/g;
  let pending: { text: string; start: number } | null = null;
  for (const m of raw.matchAll(lineRe)) {
    const full = m[0];
    if (!full && pending === null) continue;
    const line = full.replace(/[\r\n]+$/, "");
    const lineStart = m.index ?? 0;
    const lineEnd = lineStart + line.length;
    if (pending) {
      pending = { text: `${pending.text} ${line}`, start: pending.start };
    } else if (line.trim()) {
      pending = { text: line, start: lineStart };
    } else {
      continue;
    }
    // Таблица кладёт ячейку с переносом в кавычки: пока кавычки не закрыты, запись продолжается.
    if (pending.text.includes("\t") && countQuotes(pending.text) % 2 === 1 && lineEnd < raw.length) continue;
    out.push({ text: pending.text, start: pending.start, end: lineEnd });
    pending = null;
  }
  if (pending) out.push({ text: pending.text, start: pending.start, end: raw.length });
  return out;
}

/** Делит запись на название и описание. Приоритет разделителей: табуляция (таблица), «|», первое «:». */
export function splitRecord(rec: string): { name: string; text: string; separated: boolean } {
  const tab = rec.indexOf("\t");
  if (tab >= 0) {
    const cells = rec.split("\t").map((c) => {
      const t = c.trim();
      return t.startsWith('"') && t.endsWith('"') && t.length >= 2 ? t.slice(1, -1).replace(/""/g, '"') : t;
    });
    const rest = cells.slice(1).filter(Boolean).join(" ");
    return { name: cleanName(cells[0]), text: squeeze(rest), separated: true };
  }
  for (const sep of ["|", ":"]) {
    const i = rec.indexOf(sep);
    if (i >= 0) return { name: cleanName(rec.slice(0, i)), text: squeeze(rec.slice(i + 1)), separated: true };
  }
  return { name: "", text: squeeze(rec), separated: false };
}

/** Ключ для поиска повторов: без регистра и лишних пробелов. */
export const taskKey = (name: string, text: string) => `${squeeze(name)}\u0000${squeeze(text)}`.toLowerCase();

/** Список строк с найденными проблемами. `existing` - ключи заданий, которые уже есть в каталоге. */
export function parseBulk(raw: string, existing: ReadonlySet<string> = new Set()): BulkRow[] {
  const seen = new Map<string, number>();
  return splitRecords(raw).map((record, i) => {
    const n = i + 1;
    const { name, text, separated } = splitRecord(record.text);
    const row: BulkRow = { n, name, text, record };
    if (!separated) row.problem = "no-separator";
    else if (!name) row.problem = "empty-name";
    else if (!text) row.problem = "empty-text";
    else {
      const key = taskKey(name, text);
      const first = seen.get(key);
      if (first !== undefined) {
        row.problem = "duplicate";
        row.duplicateOf = first;
      } else if (existing.has(key)) {
        row.problem = "exists";
      } else {
        seen.set(key, n);
      }
    }
    return row;
  });
}

/** Пишет исправленную строку на место записи; остальной текст не меняется. */
export function replaceRecord(raw: string, rec: BulkRecord, name: string, text: string): string {
  const fixed = `${squeeze(name)} | ${squeeze(text)}`;
  return raw.slice(0, rec.start) + fixed + raw.slice(rec.end);
}

/** Убирает запись из текста вместе с переводом строки. */
export function removeRecord(raw: string, rec: BulkRecord): string {
  let end = rec.end;
  if (raw[end] === "\r") end++;
  if (raw[end] === "\n") end++;
  return raw.slice(0, rec.start) + raw.slice(end);
}
