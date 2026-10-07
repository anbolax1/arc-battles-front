"use client";

/* Движение нового дизайна: счётчики, отсчёт с перелистыванием цифр, наклон плаката,
   параллакс героя. Всё показывает итоговое значение и без JavaScript. */

import * as React from "react";

function useReducedMotion(): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

/** Когда элемент впервые попал в кадр. */
function useSeen<T extends Element>(threshold = 0.35): [React.RefObject<T | null>, boolean] {
  const ref = React.useRef<T>(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

/** Число докручивается до значения, когда попадает в кадр. */
export function CountUp({ value, className, format }: { value: number; className?: string; format?: (n: number) => string }) {
  const [ref, seen] = useSeen<HTMLSpanElement>();
  const reduce = useReducedMotion();
  const [shown, setShown] = React.useState(value);
  React.useEffect(() => {
    if (!seen || reduce) return;
    const from = Math.max(0, value - Math.max(9, Math.round(Math.abs(value) * 0.3)));
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1000);
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seen, reduce, value]);
  return (
    <span ref={ref} className={className}>
      {format ? format(shown) : shown}
    </span>
  );
}

/** Полосы растут, когда список попал в кадр (через класс go). */
export function GrowOnView({ as: Tag = "div", className = "", children }: { as?: "div" | "ol" | "ul"; className?: string; children: React.ReactNode }) {
  const [ref, seen] = useSeen<HTMLElement>();
  const El = Tag as "div";
  return (
    <El ref={ref as React.RefObject<HTMLDivElement>} className={`${className} ${seen ? "go" : ""}`}>
      {children}
    </El>
  );
}

const subscribeSecond = (cb: () => void) => {
  const t = setInterval(cb, 1000);
  return () => clearInterval(t);
};
const nowSec = () => Math.floor(Date.now() / 1000);

/** Секунды до момента (на сервере времени зрителя нет - null). */
export function useSecondsLeft(to?: string | null): number | null {
  const now = React.useSyncExternalStore(subscribeSecond, nowSec, () => null);
  if (now === null || !to) return null;
  return Math.floor(new Date(to).getTime() / 1000) - now;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Отсчёт до начала плитками: дни, часы, минуты, секунды. */
export function FlipCountdown({ to, live = "Эфир идёт", over = "Матч сыгран", label }: { to: string; live?: string; over?: string; label?: string }) {
  const left = useSecondsLeft(to);
  if (left !== null && left <= 0) return <p className="sf-cd-state">{left > -3 * 3600 ? live : over}</p>;
  const s = Math.max(0, left ?? 0);
  const parts = [
    { v: Math.floor(s / 86400), l: "дней" },
    { v: Math.floor((s % 86400) / 3600), l: "часов" },
    { v: Math.floor((s % 3600) / 60), l: "минут" },
    { v: s % 60, l: "секунд" },
  ];
  return (
    <div className="sf-cd" role="timer" aria-label={label ?? "До начала"}>
      {parts.map((p) => (
        <div key={p.l}>
          <b key={left === null ? "x" : p.v}>{left === null ? "--" : pad(p.v)}</b>
          <small>{p.l}</small>
        </div>
      ))}
    </div>
  );
}

/** Короткий отсчёт строкой: «2 д 21:41:05». */
export function ShortCountdown({ to, prefix = "", live = "эфир идёт", over = "сыгран" }: { to: string; prefix?: string; live?: string; over?: string }) {
  const left = useSecondsLeft(to);
  if (left === null) return <span>{prefix}скоро</span>;
  if (left <= 0) return <span>{left > -3 * 3600 ? live : over}</span>;
  const d = Math.floor(left / 86400);
  return (
    <span className="sf-tnum">
      {prefix}
      {d > 0 ? `${d} д ` : ""}
      {pad(Math.floor((left % 86400) / 3600))}:{pad(Math.floor((left % 3600) / 60))}:{pad(left % 60)}
    </span>
  );
}

/** Сколько прошло от анонса до начала - для полоски под отсчётом. */
export function AnnounceBar({ from, to }: { from?: string | null; to: string }) {
  const left = useSecondsLeft(to);
  const end = new Date(to).getTime();
  const start = from ? new Date(from).getTime() : end - 7 * 86400000;
  const now = left === null ? start : end - left * 1000;
  const p = Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));
  const style = { "--p": `${(p * 100).toFixed(1)}%` } as React.CSSProperties;
  return (
    <div className="sf-bar4" style={style} title="Сколько осталось от анонса до начала">
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}

/** Плакат наклоняется за мышью, по нему ходит блик. */
export function Tilt({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const move = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse") return;
    const el = ref.current?.firstElementChild as HTMLElement | null;
    if (!el || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 12).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 14).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${(x * 100 + 50).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(y * 100 + 50).toFixed(1)}%`);
  };
  const leave = () => {
    const el = ref.current?.firstElementChild as HTMLElement | null;
    el?.style.setProperty("--rx", "0deg");
    el?.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} className={className} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </div>
  );
}

/** Герой: фон и ленты слегка смещаются за мышью. */
export function Parallax({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const move = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width - 0.5) * -14).toFixed(1)}px`);
    ref.current.style.setProperty("--my", `${(((e.clientY - r.top) / r.height - 0.5) * -10).toFixed(1)}px`);
  };
  const leave = () => {
    ref.current?.style.setProperty("--mx", "0px");
    ref.current?.style.setProperty("--my", "0px");
  };
  return (
    <section ref={ref} className={className} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </section>
  );
}

/** Имена на плакате ужимаются, чтобы влезть в одну строку. */
export function FitLine({ children }: { children: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "";
      let size = parseFloat(getComputedStyle(el).fontSize);
      for (let i = 0; i < 40 && el.scrollWidth > el.clientWidth + 1; i++) {
        size *= 0.95;
        el.style.fontSize = `${size.toFixed(1)}px`;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement ?? el);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [children]);
  return <span ref={ref}>{children}</span>;
}
