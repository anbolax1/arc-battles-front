"use client";

import { useEffect } from "react";
import { loadIdle } from "@/lib/snow-idle";
import { daysWord, idleLevel, inSnowSeason } from "@/lib/snow-season";
import { clearDrifts, syncDrifts, type Level } from "./snow-world";
import "./snow-nicks.css";

/* Находит на странице ники давно не игравших и отдаёт их миру снега (snow-world.ts): там на буквах
   лежит сугроб, который растёт от упавших снежинок. Ники на сайте выводятся в сотне мест (ссылки,
   строки таблиц, текст), поэтому ищем их по тексту, а не правим каждое место. */

// Где слово-ник не трогаем: меню с именем самого игрока, подвал, поля ввода.
const SKIP = "header, footer, button, input, textarea, select, option, script, style, svg, canvas, [data-no-snow]";
const MIN_NAME = 2; // короче - слишком часто совпадает с обычным текстом
const MAX_NAME = 40;

export function SnowNicks() {
  useEffect(() => {
    if (!inSnowSeason()) return;
    let idle = new Map<string, number>();
    let frame = 0;

    const mark = () => {
      frame = 0;
      // Ник - элемент, в котором нет ничего, кроме самого слова (в том числе внутри ссылки и строки таблицы).
      const found = new Map<HTMLElement, Level>();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const raw = n.nodeValue;
        if (!raw || raw.length > MAX_NAME + 8) continue;
        const key = raw.trim().toLowerCase();
        if (key.length < MIN_NAME || key.length > MAX_NAME || /^\d+$/.test(key)) continue;
        const days = idle.get(key);
        const el = n.parentElement;
        if (days === undefined || !el || el.childElementCount > 0 || el.closest(SKIP)) continue;
        if (el.textContent?.trim().toLowerCase() !== key) continue;
        const level = idleLevel(days);
        if (!level) continue;
        found.set(el, level);
        if (el.dataset.idle !== String(level)) {
          el.dataset.idle = String(level);
          if (!el.title) el.title = `Не играл ${daysWord(days)}`;
        }
      }
      // Страницу перерисовали - с тех, кто больше не ник, снимаем метку.
      document.querySelectorAll<HTMLElement>("[data-idle]").forEach((el) => {
        if (!found.has(el)) delete el.dataset.idle;
      });
      syncDrifts(found);
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
    // Страницы подгружаются без перезагрузки и таблицы перерисовываются - ищем заново.
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    void document.fonts?.ready.then(schedule);
    return () => {
      alive = false;
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      clearDrifts();
    };
  }, []);

  return null;
}
