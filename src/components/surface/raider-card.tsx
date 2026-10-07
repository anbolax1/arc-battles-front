"use client";

import * as React from "react";
import { initials } from "@/lib/format";
import type { Rarity } from "@/components/surface/patch-meta";
import "@/components/surface/patches.css";

const STRIPES = ["var(--sf-s1)", "var(--sf-s2)", "var(--sf-s3)", "var(--sf-s4)"];

/** Кольцо из четырёх лент вокруг монограммы. */
function Ring() {
  const arc = (k: number) => {
    const a0 = ((-90 + k * 90 + 6) * Math.PI) / 180, a1 = a0 + (78 * Math.PI) / 180;
    const p = (a: number) => `${(50 + 48 * Math.cos(a)).toFixed(2)} ${(50 + 48 * Math.sin(a)).toFixed(2)}`;
    return `M${p(a0)} A48 48 0 0 1 ${p(a1)}`;
  };
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      {STRIPES.map((c, k) => (
        <path key={c} d={arc(k)} fill="none" stroke={c} strokeWidth={3} strokeLinecap="round" />
      ))}
    </svg>
  );
}

export interface CardStat {
  k: string;
  v: string;
  /** Слово, а не число: мельче и узким шрифтом. */
  word?: boolean;
}

/** Карточка рейдера: редкость по MMR сезона. Мышью наклоняется, блик едет за курсором. */
export function RaiderCard({
  name,
  avatarUrl,
  rarity,
  seasonName,
  sub,
  stats,
}: {
  name: string;
  avatarUrl?: string;
  rarity: Rarity & { label: string };
  seasonName: string;
  sub: string;
  stats: CardStat[];
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef(0);

  function move(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--ry", `${((x - 0.5) * 16).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${((0.5 - y) * 14).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
      el.classList.add("hot");
    });
  }

  function leave() {
    const el = ref.current;
    cancelAnimationFrame(frame.current);
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.classList.remove("hot");
  }

  return (
    <div
      ref={ref}
      className="pt-card"
      data-rar={rarity.key}
      style={{ "--rar": rarity.color } as React.CSSProperties}
      onPointerMove={move}
      onPointerLeave={leave}
      aria-label={`Карточка рейдера ${name}: ${rarity.label.toLowerCase()}, ${seasonName.toLowerCase()}`}
      role="img"
    >
      <div className="pt-card-in">
        <div className="pt-holo" aria-hidden />
        <div className="pt-card-top" aria-hidden>
          <b>{rarity.label}</b>
          <span>{seasonName}</span>
        </div>
        <div className="pt-card-mono" aria-hidden>
          <Ring />
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- аватар со стороннего CDN
            <img src={avatarUrl} alt="" />
          ) : (
            <b>{initials(name)}</b>
          )}
        </div>
        <div className="pt-card-name" aria-hidden>
          {name}
        </div>
        <div className="pt-card-sub" aria-hidden>
          {sub}
        </div>
        <dl className="pt-card-stats" aria-hidden>
          {stats.map((s) => (
            <div key={s.k}>
              <dt>{s.k}</dt>
              <dd className={s.word ? "sm" : undefined}>{s.v}</dd>
            </div>
          ))}
        </dl>
        <div className="pt-card-foot" aria-hidden>
          <span>brouhub.ru</span>
          <span>
            {STRIPES.map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
