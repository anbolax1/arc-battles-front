"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

type Phase = "idle" | "in" | "hold" | "out";

const IN_MS = 420;
const OUT_MS = 480;
// Если страница грузится дольше - открываем то, что есть, а не держим экран закрытым.
const SAFETY_MS = 2500;

/** Пропускаем то, что не меняет страницу сайта: другие вкладки, якоря, кабинет и оверлей. */
function wipeTarget(e: MouseEvent): boolean {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const a = (e.target as Element | null)?.closest?.("a");
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return false;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname === location.pathname) return false;
  return !/^\/(admin|overlay|api|media)(\/|$)/.test(url.pathname);
}

/** Переход между страницами: ленты закрывают экран, пока грузится новая страница, и уходят вправо. */
export function PageWipe() {
  const pathname = usePathname();
  const [phase, setPhase] = React.useState<Phase>("idle");
  const started = React.useRef<number | null>(null);
  const timers = React.useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const reveal = React.useCallback(() => {
    if (started.current === null) return;
    const wait = Math.max(0, IN_MS - (performance.now() - started.current));
    started.current = null;
    clear();
    later(() => {
      setPhase("out");
      later(() => setPhase("idle"), OUT_MS);
    }, wait);
  }, []);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onClick = (e: MouseEvent) => {
      if (!wipeTarget(e)) return;
      clear();
      started.current = performance.now();
      setPhase("in");
      later(() => setPhase((p) => (p === "in" ? "hold" : p)), IN_MS);
      later(reveal, SAFETY_MS);
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      clear();
    };
  }, [reveal]);

  React.useEffect(() => {
    reveal();
  }, [pathname, reveal]);

  return (
    <div className="sf-wipe" data-phase={phase} aria-hidden>
      <div className="sf-wipe-band">
        <i className="c4" />
        <i className="c3" />
        <i className="c2" />
        <i className="c1" />
        <i className="dp" />
        <i className="nt" />
        <i className="dp" />
        <i className="c1" />
        <i className="c2" />
        <i className="c3" />
        <i className="c4" />
      </div>
    </div>
  );
}
