"use client";

import * as React from "react";

// Часы тикают раз в секунду, пока на них кто-то подписан.
function subscribe(onTick: () => void) {
  const t = setInterval(onTick, 1000);
  return () => clearInterval(t);
}

const nowSec = () => Math.floor(Date.now() / 1000);

const pad = (n: number) => String(n).padStart(2, "0");

/** Сколько осталось до начала. На сервере времени зрителя нет - отсчёт появляется уже в браузере. */
export function Countdown({ to, className = "" }: { to: string; className?: string }) {
  const now = React.useSyncExternalStore(subscribe, nowSec, () => null);
  if (now === null) return null;
  const left = Math.floor(new Date(to).getTime() / 1000) - now;
  if (left <= 0) return <span className={className}>вот-вот начнётся</span>;
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return (
    <span className={`tnum ${className}`}>
      {d > 0 && `${d} д `}
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}
