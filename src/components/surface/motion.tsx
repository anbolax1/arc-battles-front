"use client";

/* Движение нового дизайна: счётчики, отсчёт с перелистыванием цифр, наклон плаката,
   параллакс героя, добивание на табло. Всё показывает итоговое значение и без JavaScript. */

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

/** Полосы растут, когда список попал в кадр (через класс go). До кадра - класс wait: высокие полосы под ним
    прячут, чтобы не мелькнули готовыми. На сервере reduce = true, так что без JavaScript всё видно сразу. */
export function GrowOnView({ as: Tag = "div", className = "", children }: { as?: "div" | "ol" | "ul"; className?: string; children: React.ReactNode }) {
  const [ref, seen] = useSeen<HTMLElement>();
  const reduce = useReducedMotion();
  const El = Tag as "div";
  return (
    <El ref={ref as React.RefObject<HTMLDivElement>} className={`${className} ${seen ? "go" : reduce ? "" : "wait"}`}>
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

/** Отсчёт до начала плитками: дни, часы, минуты, секунды. Матч начинает организатор, поэтому
    после назначенного времени отсчёт стоит на нулях с подписью, а не объявляет эфир. */
export function FlipCountdown({ to, label }: { to: string; label?: string }) {
  const left = useSecondsLeft(to);
  const s = Math.max(0, left ?? 0);
  const parts = [
    { v: Math.floor(s / 86400), l: "дней" },
    { v: Math.floor((s % 86400) / 3600), l: "часов" },
    { v: Math.floor((s % 3600) / 60), l: "минут" },
    { v: s % 60, l: "секунд" },
  ];
  return (
    <>
      <div className="sf-cd" role="timer" aria-label={label ?? "До начала"}>
        {parts.map((p) => (
          <div key={p.l}>
            <b key={left === null ? "x" : p.v}>{left === null ? "--" : pad(p.v)}</b>
            <small>{p.l}</small>
          </div>
        ))}
      </div>
      {left !== null && left <= 0 && <p className="sf-cd-soon">матч скоро начнётся</p>}
    </>
  );
}

/** Короткий отсчёт строкой: «2 д 21:41:05»; после назначенного времени - soon, пока матч не начали. */
export function ShortCountdown({ to, prefix = "", soon = "скоро начнётся" }: { to: string; prefix?: string; soon?: string }) {
  const left = useSecondsLeft(to);
  if (left === null) return <span>{prefix}скоро</span>;
  if (left <= 0) return <span>{soon}</span>;
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

/**
 * Табло: ник в одну строку. Длинный ник сдвигает счёт к сопернику, а если оба ника со счётом
 * не влезают в строку - стороны встают друг под другом, каждая со своим счётом.
 */
export function FitBoard({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const board = ref.current;
    if (!board) return;
    const names = [...board.querySelectorAll<HTMLElement>(".sf-side-name")];
    const score = board.querySelector<HTMLElement>(".sf-score");
    if (names.length !== 2) return;
    // Счёт при показе досчитывает до итога и сначала уже - берём самый широкий, иначе табло прыгало бы между видами.
    const widest = { at: 0, row: 0, stacked: 0 };
    const fit = () => {
      if (board.clientWidth !== widest.at) Object.assign(widest, { at: board.clientWidth, row: 0, stacked: 0 });
      names.forEach((el) => (el.style.fontSize = ""));
      board.classList.remove("stacked");
      const cs = getComputedStyle(board);
      const gap = parseFloat(cs.columnGap) || 0;
      // На узком экране счёт стоит строкой выше, и ники делят всю ширину.
      const inRow = cs.gridTemplateColumns.split(" ").length === 3;
      if (inRow && score) widest.row = Math.max(widest.row, score.getBoundingClientRect().width);
      const widths = names.map((el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return r.getBoundingClientRect().width;
      });
      if (widths[0] + widths[1] <= board.clientWidth - gap * (inRow ? 2 : 1) - (inRow ? widest.row : 0)) return;
      board.classList.add("stacked");
      widest.stacked = Math.max(widest.stacked, parseFloat(getComputedStyle(board).gridTemplateColumns.split(" ")[1]) || 0);
      // Ник не влез даже рядом со своим счётом - ужимается.
      const room = board.clientWidth - gap - widest.stacked;
      names.forEach((el, i) => {
        if (room <= 0 || widths[i] <= room) return;
        const size = parseFloat(getComputedStyle(el).fontSize) * (room / widths[i]);
        el.style.fontSize = `${Math.floor(size * 10) / 10}px`;
      });
    };
    fit();
    // Подгонка - в следующем кадре: высота табло зависит от ников, и правка внутри ResizeObserver дала бы ошибку цикла.
    let raf = 0;
    const later = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };
    const ro = new ResizeObserver(later);
    ro.observe(board);
    if (score) [score, ...score.querySelectorAll("b")].forEach((el) => ro.observe(el));
    const mo = new MutationObserver(later);
    names.forEach((el) => mo.observe(el, { characterData: true, childList: true, subtree: true }));
    document.fonts?.ready.then(fit).catch(() => {});
    return () => {
      ro.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [children]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Вся сцена добивания, мс: прыжок, корона, полоса и блик - как в surface.css у .is-stomp. */
const STOMP_MS = 3000;
/** Пауза перед первым добиванием, мс: сначала счёт докручивается до итога (CountUp - 1 с). */
const STOMP_DELAY_MS = 1100;

type StompScene = "leap" | "pound";

/**
 * Добивание на табло последнего рейда: ник победителя втаптывает ник проигравшего - прыжком на него
 * или ударом в землю с волной. Играет, когда табло попало в кадр, и снова - при наведении или нажатии.
 */
export function Stomp({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const box = ref.current;
    const win = box?.querySelector<HTMLElement>(".is-win .sf-side-name");
    const lose = box?.querySelector<HTMLElement>(".is-lose .sf-side-name");
    if (!box || !win || !lose || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let busy = false;
    let start = 0;
    let stop = 0;
    let bag: StompScene[] = [];
    const play = () => {
      if (busy) return;
      busy = true;
      // Путь прыжка - по тому, как ники стоят сейчас: табло перестраивается от ширины экрана.
      const w = win.getBoundingClientRect();
      const l = lose.getBoundingClientRect();
      const px = (name: string, v: number) => box.style.setProperty(name, `${Math.round(v)}px`);
      // Счёт над никами (узкий экран) - только удар в землю: прыжок закрыл бы цифры. Стороны друг под другом -
      // только прыжок: волне до соперника не дойти. В строку - обе сцены по очереди в случайном порядке.
      const score = box.querySelector(".sf-score")?.getBoundingClientRect();
      const above = !!score && score.bottom <= w.top;
      let scene: StompScene;
      if (above) scene = "pound";
      else if (box.querySelector(".sf-board.stacked")) scene = "leap";
      else {
        if (!bag.length) bag = Math.random() < 0.5 ? ["leap", "pound"] : ["pound", "leap"];
        scene = bag.shift() ?? "leap";
      }
      box.classList.toggle("is-pound", scene === "pound");
      if (scene === "pound") {
        const r = box.getBoundingClientRect();
        const right = l.left > w.left;
        const from = (right ? w.right : w.left) - r.left;
        const to = l.left + l.width / 2 - r.left;
        px("--up", Math.max(6, Math.min(w.height * 0.8, above ? w.top - score.bottom - 4 : Infinity)));
        px("--wx", Math.min(from, to));
        px("--ww", Math.abs(to - from));
        px("--wy", w.bottom - r.top);
        box.style.setProperty("--wo", right ? "left" : "right");
      } else {
        px("--sx", l.left + l.width / 2 - (w.left + w.width / 2));
        px("--sy", l.top - w.bottom + l.height * 0.3);
        px("--sp", l.height * 0.5);
        px("--up", w.height * 1.2);
      }
      box.classList.add("is-stomp");
      stop = window.setTimeout(() => {
        box.classList.remove("is-stomp");
        busy = false;
      }, STOMP_MS);
    };
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        io.disconnect();
        start = window.setTimeout(play, STOMP_DELAY_MS);
      },
      { threshold: 0.5 },
    );
    io.observe(box);
    box.addEventListener("pointerenter", play);
    box.addEventListener("click", play);
    return () => {
      io.disconnect();
      clearTimeout(start);
      clearTimeout(stop);
      box.removeEventListener("pointerenter", play);
      box.removeEventListener("click", play);
    };
  }, []);
  return (
    <div ref={ref} className="sf-stomp">
      {children}
    </div>
  );
}
