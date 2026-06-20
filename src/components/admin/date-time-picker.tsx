"use client";

import * as React from "react";
import { createPortal } from "react-dom";

/* Кастомный выбор даты (и времени) в МСК. Поповер рендерится в портал (document.body)
   с fixed-позицией — чтобы не обрезался границей модалки.
   - по умолчанию: дата+время, value/onChange в формате "YYYY-MM-DDTHH:mm";
   - dateOnly: только дата, формат "YYYY-MM-DD", выбор дня сразу закрывает поповер;
   - clearable: кнопка «Убрать дату» (onChange("")), для необязательных полей. */

const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const pad = (n: number) => String(n).padStart(2, "0");
const POP_W = 304;
const POP_H = 380;

type Parts = { y: number; mo: number; d: number; hh: number; mm: number };

function parse(value: string, dateOnly: boolean): Parts | null {
  if (dateOnly) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return null;
    return { y: +m[1], mo: +m[2], d: +m[3], hh: 0, mm: 0 };
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], hh: +m[4], mm: +m[5] };
}
function compose(p: Parts, dateOnly: boolean): string {
  if (dateOnly) return `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.hh)}:${pad(p.mm)}`;
}

export function DateTimePicker({
  value,
  onChange,
  dateOnly = false,
  clearable = false,
}: {
  value: string;
  onChange: (v: string) => void;
  dateOnly?: boolean;
  clearable?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popRef = React.useRef<HTMLDivElement>(null);
  const parsed = parse(value, dateOnly);

  const today = new Date();
  const [view, setView] = React.useState(() =>
    parsed ? { y: parsed.y, mo: parsed.mo } : { y: today.getFullYear(), mo: today.getMonth() + 1 },
  );

  const place = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - POP_W - 8));
    let top = r.bottom + 6;
    if (top + POP_H > window.innerHeight && r.top - POP_H - 6 > 0) top = r.top - POP_H - 6;
    setPos({ top, left });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    const onDoc = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open, place]);

  const hh = parsed?.hh ?? 12;
  const mm = parsed?.mm ?? 0;

  function pickDay(d: number) {
    onChange(compose({ y: view.y, mo: view.mo, d, hh, mm }, dateOnly));
    if (dateOnly) setOpen(false);
  }
  function setTime(nh: number, nm: number) {
    const base = parsed ?? { y: view.y, mo: view.mo, d: today.getDate(), hh: 12, mm: 0 };
    onChange(compose({ ...base, hh: nh, mm: nm }, dateOnly));
  }
  function clear() {
    onChange("");
    setOpen(false);
  }
  function shiftMonth(delta: number) {
    let y = view.y;
    let mo = view.mo + delta;
    if (mo < 1) {
      mo = 12;
      y--;
    } else if (mo > 12) {
      mo = 1;
      y++;
    }
    setView({ y, mo });
  }

  const firstDow = (new Date(view.y, view.mo - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.mo, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateLabel = parsed ? `${pad(parsed.d)}.${pad(parsed.mo)}.${parsed.y}` : "";
  const placeholder = dateOnly ? "Выберите дату" : "Выберите дату и время";
  const label = parsed ? (dateOnly ? dateLabel : `${dateLabel} · ${pad(parsed.hh)}:${pad(parsed.mm)}`) : placeholder;
  const isToday = (d: number) => view.y === today.getFullYear() && view.mo === today.getMonth() + 1 && d === today.getDate();
  const isSel = (d: number) => parsed && parsed.y === view.y && parsed.mo === view.mo && parsed.d === d;

  return (
    <>
      <button type="button" ref={triggerRef} className="input flex w-full items-center justify-between text-left" onClick={() => setOpen((o) => !o)}>
        <span className={parsed ? "" : "text-muted"}>{label}</span>
        <span className="text-muted">🗓</span>
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: POP_W }}
            className="panel glow-edge z-[300] space-y-3 p-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => shiftMonth(-1)} aria-label="предыдущий месяц">
                <span>‹</span>
              </button>
              <span className="font-display text-sm uppercase">
                {MONTHS[view.mo - 1]} {view.y}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => shiftMonth(1)} aria-label="следующий месяц">
                <span>›</span>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {WD.map((w) => (
                <span key={w} className="text-[0.62rem] uppercase tracking-wide text-muted">
                  {w}
                </span>
              ))}
              {cells.map((d, i) =>
                d === null ? (
                  <span key={`e${i}`} />
                ) : (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pickDay(d)}
                    aria-pressed={!!isSel(d)}
                    className={[
                      "flex h-9 items-center justify-center text-sm transition [clip-path:polygon(12%_0,100%_0,88%_100%,0_100%)]",
                      isSel(d)
                        ? "bg-[var(--primary)] text-black"
                        : isToday(d)
                          ? "bg-surface-2 text-primary-2 shadow-[inset_0_0_0_1px_var(--border)]"
                          : "bg-surface-2 text-fg hover:text-primary-2",
                    ].join(" ")}
                  >
                    {d}
                  </button>
                ),
              )}
            </div>

            {!dateOnly && (
              <div className="flex items-center gap-2 border-t border-[var(--border)] pt-3">
                <span className="field-label flex-none">Время</span>
                <select className="select flex-1" value={hh} onChange={(e) => setTime(Number(e.target.value), mm)}>
                  {Array.from({ length: 24 }, (_, i) => i).map((x) => (
                    <option key={x} value={x}>
                      {pad(x)}
                    </option>
                  ))}
                </select>
                <span className="text-muted">:</span>
                <select className="select flex-1" value={mm} onChange={(e) => setTime(hh, Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((x) => (
                    <option key={x} value={x}>
                      {pad(x)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
              {clearable && parsed ? (
                <button type="button" className="btn btn-ghost btn-sm text-muted" onClick={clear}>
                  <span>Убрать дату</span>
                </button>
              ) : (
                <span />
              )}
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
                <span>Готово</span>
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
