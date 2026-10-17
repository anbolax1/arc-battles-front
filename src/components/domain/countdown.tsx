"use client";

import * as React from "react";

// Часы тикают раз в секунду, пока на них кто-то подписан.
function subscribe(onTick: () => void) {
  const t = setInterval(onTick, 1000);
  return () => clearInterval(t);
}

const nowSec = () => Math.floor(Date.now() / 1000);

const pad = (n: number) => String(n).padStart(2, "0");

/** Сколько осталось до начала. На сервере времени зрителя нет - отсчёт появляется уже в браузере.
    Матч начинает организатор: после назначенного времени отсчёт стоит на нулях с подписью. */
export function Countdown({ to, className = "" }: { to: string; className?: string }) {
  const now = React.useSyncExternalStore(subscribe, nowSec, () => null);
  if (now === null) return null;
  const left = Math.max(0, Math.floor(new Date(to).getTime() / 1000) - now);
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return (
    <>
      <span className={`tnum ${className}`}>
        {d > 0 && `${d} д `}
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
      {left === 0 && <span className="text-xs text-muted">матч скоро начнётся</span>}
    </>
  );
}
