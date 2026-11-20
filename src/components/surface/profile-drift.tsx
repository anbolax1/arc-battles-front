"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { loadIdle } from "@/lib/snow-idle";
import { daysWord, idleLevel, inSnowSeason, type IdleLevel } from "@/lib/snow-season";
import "./profile-drift.css";

/* Снег на карточке игрока, который давно не играл: сугробы в углах и иней на фото, чем дольше без матчей,
   тем гуще. Стирается курсором или пальцем, как запотевшее стекло; после перезагрузки возвращается.
   Сугроб на самом имени лежит в мире снега (snow-world.ts). */

const BRUSH = 26; // радиус стирания, px
const SETTLE_MS = 1000; // через сколько перерисовать: карточка уже въехала
const NOISE_SEED = 9301;

/** Детерминированное «случайное» по строке: у одного игрока сугроб всегда одинаковый. */
function seeded(seed: string): () => number {
  let h = NOISE_SEED;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function drift(ctx: CanvasRenderingContext2D, w: number, h: number, level: IdleLevel, seed: string, photo: DOMRect | null) {
  const rnd = seeded(seed);

  // Сугробы в нижних углах: со второй ступени.
  if (level >= 2) {
    const r = level === 3 ? 130 : 80;
    for (const side of [0, 1]) {
      const cx = side ? w - r * 0.35 : r * 0.35;
      const g = ctx.createRadialGradient(cx, h, 0, cx, h, r);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.8, "#e4f0fd");
      g.addColorStop(1, "rgba(190, 220, 248, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, h, r, r * 0.42, 0, Math.PI, 0);
      ctx.fill();
    }
  }

  // Иней на фото: с третьей ступени фото почти не видно, со второй - только края.
  if (photo && level >= 2) {
    const a = level === 3 ? 0.9 : 0.45;
    const g = ctx.createLinearGradient(photo.left, photo.top, photo.right, photo.bottom);
    g.addColorStop(0, `rgba(240, 248, 255, ${a})`);
    g.addColorStop(0.5, `rgba(214, 233, 252, ${a * 0.85})`);
    g.addColorStop(1, `rgba(244, 250, 255, ${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(photo.left, photo.top, photo.width, photo.height);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const x = photo.left + rnd() * photo.width;
      const y = photo.top + rnd() * photo.height;
      const len = 8 + rnd() * 22;
      const ang = rnd() * Math.PI;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }
  }
}

const noSubscribe = () => () => {};

export function ProfileDrift({ login, seed }: { login: string; seed: string }) {
  const show = useSyncExternalStore(noSubscribe, inSnowSeason, () => false);
  const [days, setDays] = useState(0);
  const [wiped, setWiped] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!show) return;
    let alive = true;
    void loadIdle().then((m) => {
      if (alive) setDays(m.get(login.toLowerCase()) ?? 0);
    });
    return () => {
      alive = false;
    };
  }, [show, login]);

  const level = idleLevel(days);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const host = box?.parentElement;
    if (!level || !box || !canvas || !ctx || !host) return;

    const paint = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = host.clientWidth;
      const h = host.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const hostRect = host.getBoundingClientRect();
      const ph = host.querySelector(".sf-id-photo")?.getBoundingClientRect();
      const photo = ph
        ? new DOMRect(ph.left - hostRect.left, ph.top - hostRect.top, ph.width, ph.height)
        : null;
      drift(ctx, w, h, level, seed, photo);
    };
    paint();
    // Карточка въезжает с анимацией, а шрифты подгружаются позже - перерисовываем, когда всё встало на место.
    const settle = window.setTimeout(paint, SETTLE_MS);
    host.addEventListener("animationend", paint);
    void document.fonts?.ready.then(paint);
    const resize = new ResizeObserver(paint);
    resize.observe(host);

    let last: { x: number; y: number } | null = null;
    const erase = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x < -BRUSH || y < -BRUSH || x > r.width + BRUSH || y > r.height + BRUSH) {
        last = null;
        return;
      }
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineWidth = BRUSH * 2;
      ctx.beginPath();
      ctx.moveTo(last?.x ?? x, last?.y ?? y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      last = { x, y };
      setWiped(true);
    };
    const stop = () => {
      last = null;
    };
    host.addEventListener("pointermove", erase);
    host.addEventListener("pointerleave", stop);
    return () => {
      window.clearTimeout(settle);
      host.removeEventListener("animationend", paint);
      resize.disconnect();
      host.removeEventListener("pointermove", erase);
      host.removeEventListener("pointerleave", stop);
    };
  }, [level, seed]);

  if (!show || !level) return null;
  return (
    <div ref={boxRef} className="pf-drift" data-level={level}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <p className="pf-drift-note">
        <span aria-hidden>❄</span> Не играл {daysWord(days)}
        {!wiped && <small>Сотрите снег мышью</small>}
      </p>
    </div>
  );
}
