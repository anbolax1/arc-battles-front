"use client";

import { useEffect } from "react";
import { loadIdle } from "@/lib/snow-idle";
import { daysWord, idleLevel, inSnowSeason } from "@/lib/snow-season";
import "./snow-nicks.css";

/* Снег на никах тех, кто давно не играл: сугроб над ссылкой на профиль, чем дольше без матчей, тем выше.
   Ники по всему сайту - это ссылки /profile/<ник>, поэтому метим их все разом, а не в каждом месте. */

const LINKS = 'a[href^="/profile/"]';

function loginOf(a: HTMLAnchorElement): string | null {
  const m = (a.getAttribute("href") ?? "").match(/^\/profile\/([^/?#]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]).toLowerCase();
  } catch {
    return m[1].toLowerCase();
  }
}

/** Сугроб рисуется псевдоэлементом ссылки; если оба заняты вёрсткой самой ссылки - снега у неё нет. */
function freeSlot(a: HTMLElement): "before" | "after" | null {
  for (const slot of ["before", "after"] as const) {
    const content = getComputedStyle(a, `::${slot}`).content;
    if (content === "none" || content === "normal") return slot;
  }
  return null;
}

export function SnowNicks() {
  useEffect(() => {
    if (!inSnowSeason()) return;
    let idle = new Map<string, number>();
    let frame = 0;

    const mark = () => {
      frame = 0;
      document.querySelectorAll<HTMLAnchorElement>(LINKS).forEach((a) => {
        const login = loginOf(a);
        const days = login ? idle.get(login) : undefined;
        const level = days === undefined ? 0 : idleLevel(days);
        if (!level || days === undefined) {
          if (a.dataset.idle) {
            delete a.dataset.idle;
            delete a.dataset.idleSlot;
          }
          return;
        }
        if (a.dataset.idle === String(level)) return;
        const slot = a.dataset.idleSlot ?? freeSlot(a);
        if (!slot) return;
        a.dataset.idleSlot = slot;
        a.dataset.idle = String(level);
        if (!a.title) a.title = `Не играл ${daysWord(days)}`;
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(mark);
    };

    let alive = true;
    void loadIdle().then((m) => {
      if (!alive) return;
      idle = m;
      schedule();
    });
    // Страницы подгружаются без перезагрузки и таблицы перерисовываются - метим заново.
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      alive = false;
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
