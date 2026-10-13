import * as React from "react";

// Ссылка в тексте до пробела; точка или скобка в конце - уже знак препинания, а не часть адреса.
const URL_RE = /(https?:\/\/[^\s<>]*[^\s<>.,!?:;'"»)\]])/g;

function paragraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function linkify(line: string): React.ReactNode[] {
  return line.split(URL_RE).map((part, i) =>
    i % 2 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      part
    ),
  );
}

/** Текст новости: абзацы через пустую строку, переносы строк внутри абзаца, ссылки кликабельны. */
export function NewsBody({ text, className = "" }: { text: string; className?: string }) {
  const ps = paragraphs(text);
  if (!ps.length) return null;
  return (
    <div className={`nw-body ${className}`}>
      {ps.map((p, i) => (
        <p key={i}>
          {p.split("\n").map((ln, j) => (
            <React.Fragment key={j}>
              {j > 0 && <br />}
              {linkify(ln)}
            </React.Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}

/** Начало новости для ленты и описания страницы: первый абзац без переносов, не длиннее max. */
export function newsExcerpt(text: string, max = 220): string {
  const first = (paragraphs(text)[0] ?? "").replace(/\s+/g, " ");
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}
