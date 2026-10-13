/* Текст новости без разметки - для ленты и описания страницы. HTML уже очищен сервером. */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? m;
    const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
  });
}

const strip = (s: string) => s.replace(/<[^>]+>/g, "");

/** Абзацы новости простым текстом; спойлер закрыт блоками, как в уведомлениях Телеграма. */
export function newsParagraphs(html: string): string[] {
  const hidden = html.replace(/<span class="tg-spoiler">([\s\S]*?)<\/span>/g, (_, inner: string) =>
    "▒".repeat(Math.min(12, Math.max(4, decode(strip(inner)).length))),
  );
  return hidden
    .split(/<\/p>|<\/blockquote>/)
    .map((block) => decode(strip(block.replace(/<br\s*\/?>/g, " "))).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Начало новости для ленты и описания страницы: первый абзац, не длиннее max. */
export function newsExcerpt(html: string, max = 220): string {
  const first = newsParagraphs(html)[0] ?? "";
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}
