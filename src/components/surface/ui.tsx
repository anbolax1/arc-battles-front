import type { CSSProperties, ReactNode } from "react";
import { initials } from "@/lib/format";
import type { UserTag } from "@/lib/types";

/** Стрелка «дальше» у ссылок-переходов. */
export function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowBack() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4v16l13-8z" />
    </svg>
  );
}

export function ReplayGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />
    </svg>
  );
}

/** Иконки строк расписания. */
export const ScheduleIcon = {
  star: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M16 3.5l3.6 7.6 8.2 1-6 5.7 1.5 8.2L16 22l-7.3 4 1.5-8.2-6-5.7 8.2-1z" />
    </svg>
  ),
  live: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="16" cy="16" r="4" fill="currentColor" />
      <path d="M8.5 8.5a10.6 10.6 0 0 0 0 15M23.5 8.5a10.6 10.6 0 0 1 0 15M4.5 4.5a16 16 0 0 0 0 23M27.5 4.5a16 16 0 0 1 0 23" />
    </svg>
  ),
  aim: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="16" cy="16" r="10" />
      <circle cx="16" cy="16" r="3" />
      <path d="M16 2v6M16 24v6M2 16h6M24 16h6" />
    </svg>
  ),
};

/** Аватар: фото игрока или инициалы с уголком из лент. */
export function SfAvatar({ name, src, className = "" }: { name?: string | null; src?: string | null; className?: string }) {
  return (
    <span className={`sf-ava ${src ? "has-img" : ""} ${className}`} aria-hidden>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- аватар со стороннего CDN
        <img src={src} alt="" loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

function tagStyle(t: Pick<UserTag, "color">): CSSProperties {
  return { "--tag": t.color || undefined } as CSSProperties;
}

/** Теги, которые видны на сайте: роль и выданные организатором. */
export function visibleTags(tags?: UserTag[]): UserTag[] {
  return (tags ?? []).filter((t) => t.visible && !t.hiddenByUser);
}

/** Теги штампами - для крупных мест (чемпион, профиль). */
export function TagStamps({ tags, className = "" }: { tags?: UserTag[]; className?: string }) {
  const list = visibleTags(tags);
  if (!list.length) return null;
  return (
    <div className={`sf-stamps ${className}`}>
      {list.map((t) => (
        <span key={t.id} className="sf-stamp sf-tag" style={tagStyle(t)}>
          {t.name}
        </span>
      ))}
    </div>
  );
}

/** Теги мелкими плашками - для строк таблиц. */
export function TagChips({ tags }: { tags?: UserTag[] }) {
  const list = visibleTags(tags);
  if (!list.length) return null;
  return (
    <>
      {list.map((t) => (
        <span key={t.id} className="sf-tagchip" style={tagStyle(t)}>
          {t.name}
        </span>
      ))}
    </>
  );
}

/** Знаковое изменение MMR: «+128», «−72», «±0». */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0";
}

/** Заголовок раздела: подпись сверху и крупное слово с янтарной точкой. */
export function SecHead({ eyebrow, title, action, id }: { eyebrow?: ReactNode; title: string; action?: ReactNode; id?: string }) {
  return (
    <div className="sf-sec-head">
      <div>
        {eyebrow && <p className="sf-eyebrow">{eyebrow}</p>}
        <h2 className="sf-h-big" id={id}>
          {title}
          <span className="sf-dot">.</span>
        </h2>
      </div>
      {action}
    </div>
  );
}

/** Пустое место вместо списка. */
export function SfEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="sf-empty">
      <b>{title}</b>
      {hint && <span>{hint}</span>}
    </div>
  );
}
