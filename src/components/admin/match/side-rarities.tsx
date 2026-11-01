"use client";

import * as React from "react";
import { RARITIES } from "@/lib/task-meta";
import type { TaskRarity } from "@/lib/types";

/** Одна сторона матча: какие по редкости задания ей выдавать. По умолчанию - из профиля игроков,
    организатор может поменять вручную только для этого матча. */
export function SideRarities({
  title,
  profile,
  manual,
  onChange,
}: {
  title: string;
  /** Что игроки стороны выбрали в профиле (у команды - объединение). */
  profile: TaskRarity[];
  /** Ручная настройка на этот матч; null - берётся профиль. */
  manual: TaskRarity[] | null;
  onChange: (next: TaskRarity[] | null) => void;
}) {
  const current = manual ?? profile;
  const toggle = (r: TaskRarity) => {
    const next = current.includes(r) ? current.filter((x) => x !== r) : [...current, r];
    if (!next.length) return; // хотя бы одна редкость должна остаться
    const ordered = RARITIES.map((x) => x.id).filter((x) => next.includes(x));
    // Совпало с профилем - ручная настройка не нужна, профиль останется главным.
    onChange(ordered.length === profile.length && ordered.every((x, i) => x === profile[i]) ? null : ordered);
  };
  return (
    <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-start">
      <span className="truncate pt-2 text-sm font-semibold" title={title}>
        {title}
      </span>
      <div className="space-y-1.5">
        <div className="seg seg-wrap">
          {RARITIES.map((r) => {
            const on = current.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                className="seg-btn"
                aria-pressed={on}
                data-tone=""
                style={{ "--tone": r.color, "--ink": r.ink } as React.CSSProperties}
                onClick={() => toggle(r.id)}
              >
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted">
          {manual ? "Настроено вручную на этот матч. " : "Из профиля игрока. "}
          {manual && (
            <button type="button" className="underline hover:text-fg" onClick={() => onChange(null)}>
              Вернуть из профиля
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
