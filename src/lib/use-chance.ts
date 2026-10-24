"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CHANCE_JUMP } from "@/lib/chance";

// Сколько числу ехать до нового значения.
const TWEEN_MS = 600;

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

/** Число плавно доезжает до нового значения; при reduced-motion меняется сразу. */
export function useTween(value: number): number {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce) return;
    const start = from.current;
    if (start === value) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / TWEEN_MS);
      const v = Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3)));
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return reduce ? value : shown;
}

/** Последний заметный скачок числа: стрелка висит у него пару секунд. */
export function useJump(value: number, hold = 1600): number {
  const prev = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [jump, setJump] = useState(0);
  useEffect(() => {
    const d = value - prev.current;
    prev.current = value;
    if (Math.abs(d) < CHANCE_JUMP) return;
    const raf = requestAnimationFrame(() => setJump(d));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setJump(0), hold);
    return () => cancelAnimationFrame(raf);
  }, [value, hold]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return jump;
}
