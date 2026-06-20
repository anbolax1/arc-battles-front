"use client";

import * as React from "react";
import { createPortal } from "react-dom";

export interface ComboItem {
  id: string;
  num: number;
  text: string;
  meta?: string; // напр. «(−10%)» / «(+15%)»
}

const MAX_H = 288;

/** Комбобокс выбора задания/усложнения: печатаешь номер или текст → сразу выпадает
    список совпадений, кликаешь нужное (или Enter — берёт первое). Один виджет вместо
    «поле поиска + отдельный селект». Список рендерится в портал (document.body, fixed),
    чтобы его не обрезала панель с overflow:hidden. Закрывается по клику вне/выбору/Esc. */
export function CatalogCombobox({
  items,
  value,
  onChange,
  placeholder,
  allowNone = false,
  noneLabel = "— нет —",
}: {
  items: ComboItem[];
  value: string; // выбранный id, "" — ничего
  onChange: (id: string) => void;
  placeholder?: string;
  allowNone?: boolean;
  noneLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState<string | null>(null); // null — показываем выбранное; иначе строка поиска
  // top — откидываем ВНИЗ (якорь по верху списка); bottom — откидываем ВВЕРХ
  // (якорь по низу списка, прямо над инпутом), чтобы короткий список липнул к
  // селектору и рос вверх ровно на свою высоту, без разрыва.
  const [pos, setPos] = React.useState<{ left: number; width: number; maxH: number; top?: number; bottom?: number } | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const popRef = React.useRef<HTMLDivElement>(null);

  const place = React.useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const common = { left: r.left, width: r.width };
    if (below < 200 && above > below) {
      setPos({ ...common, bottom: window.innerHeight - r.top + 4, maxH: Math.min(MAX_H, above) });
    } else {
      setPos({ ...common, top: r.bottom + 4, maxH: Math.min(MAX_H, below) });
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    const onDoc = (e: MouseEvent) => {
      if (inputRef.current?.contains(e.target as Node)) return;
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setTyped(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open, place]);

  const selected = items.find((i) => i.id === value) ?? null;
  const labelOf = (i: ComboItem) => `${i.num}. ${i.text}${i.meta ? ` ${i.meta}` : ""}`;
  const display = typed !== null ? typed : selected ? labelOf(selected) : "";

  const q = (typed ?? "").trim().toLowerCase();
  const filtered = q
    ? items.filter((i) => {
        const n = String(i.num);
        return n === q || n.startsWith(q) || i.text.toLowerCase().includes(q);
      })
    : items;

  function pick(id: string) {
    onChange(id);
    setTyped(null);
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className="input pr-7"
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
        }}
        onChange={(e) => {
          setTyped(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && open) {
            e.preventDefault();
            if (filtered[0]) pick(filtered[0].id);
          } else if (e.key === "Escape") {
            setOpen(false);
            setTyped(null);
          }
        }}
      />
      {value && (
        <button
          type="button"
          title="очистить"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
          onMouseDown={(e) => {
            e.preventDefault();
            onChange("");
            setTyped(null);
          }}
        >
          ✕
        </button>
      )}
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popRef}
            data-combo-pop
            style={{
              position: "fixed",
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxH,
              ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
            }}
            className="z-[300] overflow-y-auto rounded-md bg-[var(--surface)] shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_0_0_1px_var(--border)]"
          >
            {allowNone && !q && (
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-muted hover:bg-[var(--surface-2)]"
                onClick={() => pick("")}
              >
                {noneLabel}
              </button>
            )}
            {filtered.slice(0, 50).map((i) => (
              <button
                key={i.id}
                type="button"
                className={`flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)] ${i.id === value ? "bg-[var(--surface-2)]" : ""}`}
                onClick={() => pick(i.id)}
              >
                <span className="w-7 flex-none text-right text-muted tnum">{i.num}.</span>
                <span className="min-w-0 flex-1 truncate">{i.text}</span>
                {i.meta && <span className="flex-none text-xs text-muted">{i.meta}</span>}
              </button>
            ))}
            {!filtered.length && <div className="px-3 py-3 text-xs text-muted">Ничего не найдено</div>}
          </div>,
          document.body,
        )}
    </div>
  );
}
