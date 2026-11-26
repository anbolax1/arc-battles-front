"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { inSnowSeason, SNOW_ATTR } from "@/lib/snow-season";
import { drawWorld, landFlake, resizeWorld, scatterGround, stepWorld, world } from "./snow-world";
import "./snowfall.css";

/* Падающий снег на всю витрину: три слоя глубины, ветер с порывами, снег отталкивается
   курсором и сдвигается при прокрутке. Рисуем на canvas спрайтами - сотни снежинок без нагрузки.
   Поверх контента, клики не перехватывает. Отключается кнопкой (запоминается в браузере)
   и у тех, кто просит убрать анимации в системе. */

const STORAGE_KEY = "goarc-snow";
const AREA_PER_FLAKE = 3800; // px² экрана на одну снежинку
const MAX_FLAKES = 480;
const MOBILE_WIDTH = 700;
const MOBILE_SHARE = 0.55; // на телефонах снега меньше
const MAX_DPR = 2;
// Порыв ветра: плавно набирает силу, держится и так же плавно стихает, иначе снег дёргается скачком.
const GUST_MIN = 25; // px/с
const GUST_MAX = 65;
const GUST_RISE = 1.6; // сек: за сколько порыв набирает силу
const GUST_FALL = 3.2; // сек: за сколько стихает
const GUST_HOLD_MIN = 1.5; // сек: сколько держится пик
const GUST_HOLD_MAX = 3.5;
const FLAKE_INERTIA = 1.2; // 1/с: как быстро снежинка подхватывает ветер; лёгкие дальние - быстрее
const LAND_VOLUME = 0.28; // сколько снега даёт снежинка при посадке: радиус² на это
const LAND_VOLUME_MAX = 3.5;
const MAX_FRAME = 0.05; // сек: после паузы вкладки снег не прыгает
const FADE_IN = 2.2; // сек: плавное появление при включении
const MOUSE_RADIUS = 150;
const SPRITE = 96; // сторона спрайта, px

type Kind = 0 | 1 | 2; // 0 - точка, 1 - расфокус (боке), 2 - кристалл

type Flake = {
  x: number;
  y: number;
  z: number; // глубина: 0 далеко, 1 близко
  r: number; // радиус, px
  fall: number; // скорость падения, px/с
  amp: number; // размах покачивания, px
  freq: number;
  phase: number;
  alpha: number;
  kind: Kind;
  rot: number;
  spin: number;
  twinkle: number; // 0 - не мерцает
  wx: number; // скорость, которую снежинка набрала от ветра: она подхватывает его не мгновенно
  vx: number; // добавка скорости от курсора и порывов
  vy: number;
  tint: 0 | 1;
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Заготовки снежинок: круглая, мягкая (расфокус) и шестилучевой кристалл, белые и чуть голубые. */
function makeSprites(): HTMLCanvasElement[][] {
  const tints: [string, string][] = [
    ["255,255,255", "150,196,245"],
    ["214,236,255", "120,176,238"],
  ];
  return tints.map(([core, rim]) => {
    const make = (draw: (c: CanvasRenderingContext2D, s: number) => void) => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = SPRITE;
      const c = cv.getContext("2d");
      if (c) draw(c, SPRITE);
      return cv;
    };
    const dot = make((c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, `rgba(${core},1)`);
      g.addColorStop(0.5, `rgba(${core},0.96)`);
      g.addColorStop(0.68, `rgba(${rim},0.5)`);
      g.addColorStop(1, `rgba(${rim},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, s, s);
    });
    const bokeh = make((c, s) => {
      const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, `rgba(${core},0.9)`);
      g.addColorStop(0.55, `rgba(${core},0.55)`);
      g.addColorStop(0.8, `rgba(${rim},0.28)`);
      g.addColorStop(1, `rgba(${rim},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, s, s);
    });
    const crystal = make((c, s) => {
      const h = s / 2;
      const glow = c.createRadialGradient(h, h, 0, h, h, h);
      glow.addColorStop(0, `rgba(${rim},0.45)`);
      glow.addColorStop(1, `rgba(${rim},0)`);
      c.fillStyle = glow;
      c.fillRect(0, 0, s, s);
      c.translate(h, h);
      c.lineCap = "round";
      for (const pass of [0, 1]) {
        c.strokeStyle = pass === 0 ? `rgba(${rim},0.6)` : `rgba(${core},1)`;
        c.lineWidth = pass === 0 ? 7 : 3.4;
        for (let i = 0; i < 6; i++) {
          c.save();
          c.rotate((Math.PI / 3) * i);
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(0, -h * 0.82);
          for (const [at, len] of [[0.5, 0.26], [0.7, 0.18]]) {
            const y = -h * 0.82 * at;
            const l = h * len;
            c.moveTo(0, y);
            c.lineTo(-l, y - l);
            c.moveTo(0, y);
            c.lineTo(l, y - l);
          }
          c.stroke();
          c.restore();
        }
      }
      c.fillStyle = `rgba(${core},1)`;
      c.beginPath();
      c.arc(0, 0, 4.5, 0, Math.PI * 2);
      c.fill();
    });
    return [dot, bokeh, crystal];
  });
}

function makeFlake(w: number, h: number, scatter: boolean): Flake {
  const roll = Math.random();
  // Слои: 55% далёких мелких, 33% средних, 12% близких крупных.
  const z = roll < 0.55 ? rand(0, 0.35) : roll < 0.88 ? rand(0.35, 0.7) : rand(0.7, 1);
  let kind: Kind = 0;
  let r = 1.6 + z * 3;
  if (z > 0.7) {
    const k = Math.random();
    if (k < 0.4) {
      kind = 2;
      r = rand(8, 14);
    } else if (k < 0.75) {
      kind = 1;
      r = rand(10, 22);
    } else {
      r = rand(4, 6.5);
    }
  } else if (z > 0.55 && Math.random() < 0.2) {
    kind = 1;
    r = rand(6, 10);
  }
  return {
    x: Math.random() * w,
    y: scatter ? Math.random() * h : -r * 2 - Math.random() * 60,
    z,
    r,
    fall: (16 + z * z * 95) * rand(0.8, 1.25),
    amp: rand(5, 22) * (0.4 + z),
    freq: rand(0.35, 1.1),
    phase: Math.random() * Math.PI * 2,
    alpha: kind === 1 ? rand(0.3, 0.55) : 0.55 + z * 0.4 * rand(0.7, 1),
    kind,
    rot: Math.random() * Math.PI * 2,
    spin: rand(-0.7, 0.7),
    twinkle: Math.random() < 0.22 ? rand(1.5, 4) : 0,
    wx: 0,
    vx: 0,
    vy: 0,
    tint: Math.random() < 0.35 ? 1 : 0,
  };
}

function targetCount(w: number, h: number): number {
  const base = Math.min(MAX_FLAKES, Math.round((w * h) / AREA_PER_FLAKE));
  return w < MOBILE_WIDTH ? Math.round(base * MOBILE_SHARE) : base;
}

const CHANGE_EVENT = "goarc-snow-change";
let memoryOff = false; // если localStorage недоступен - выбор держится до перезагрузки

function subscribeOn(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(CHANGE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CHANGE_EVENT, cb);
  };
}
function readOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return !memoryOff;
  }
}
function subscribeMotion(cb: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", cb);
  return () => media.removeEventListener("change", cb);
}
function readMotionAllowed(): boolean {
  return inSnowSeason(new Date()) && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const on = useSyncExternalStore(subscribeOn, readOn, () => true);
  const allowed = useSyncExternalStore(subscribeMotion, readMotionAllowed, () => true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!on || !allowed || !canvas || !ctx) return;

    const sprites = makeSprites();
    let w = 0;
    let h = 0;
    let dpr = 1;
    let flakes: Flake[] = [];
    let raf = 0;
    let last = performance.now();
    let t = 0;
    let gust = 0; // сила порыва сейчас
    let gustGoal = 0; // к чему она тянется
    let gustHold = 0; // сколько ещё держится пик
    let gustIn = rand(3, 7);
    let lastScroll = window.scrollY;
    const mouse = { x: -9999, y: -9999, vx: 0, vy: 0, seen: 0 };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      resizeWorld(w, h);
      const pool = targetCount(w, h);
      if (flakes.length > pool) flakes = flakes.slice(0, pool);
      while (flakes.length < pool) flakes.push(makeFlake(w, h, true));
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const now = performance.now();
      const dt = Math.max((now - mouse.seen) / 1000, 0.008);
      if (mouse.seen && dt < 0.2) {
        mouse.vx = mouse.vx * 0.6 + ((e.clientX - mouse.x) / dt) * 0.4;
        mouse.vy = mouse.vy * 0.6 + ((e.clientY - mouse.y) / dt) * 0.4;
      }
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.seen = now;
    };
    const onLeave = () => {
      mouse.x = mouse.y = -9999;
      mouse.seen = 0;
    };
    const onScroll = () => {
      const dy = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      // Снег «остаётся в мире»: при прокрутке ближние снежинки смещаются заметнее дальних.
      scatterGround(dy); // сугроб внизу взметается
      for (const f of flakes) {
        f.y -= dy * (0.06 + f.z * 0.3);
        if (f.y < -f.r * 2) f.y += h + f.r * 4;
        else if (f.y > h + f.r * 2) f.y -= h + f.r * 4;
      }
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, MAX_FRAME);
      last = now;
      t += dt;

      gustIn -= dt;
      if (gustIn <= 0) {
        gustGoal = (Math.random() < 0.5 ? -1 : 1) * rand(GUST_MIN, GUST_MAX);
        gustHold = rand(GUST_HOLD_MIN, GUST_HOLD_MAX);
        gustIn = rand(9, 20);
      }
      if (gustHold > 0) gustHold -= dt;
      else gustGoal = 0;
      gust += (gustGoal - gust) * (1 - Math.exp(-dt / (gustGoal === 0 ? GUST_FALL : GUST_RISE)));
      const wind = Math.sin(t * 0.07) * 16 + Math.sin(t * 0.23 + 1.3) * 7 + gust;
      mouse.vx *= Math.exp(-dt * 3);
      mouse.vy *= Math.exp(-dt * 3);
      const fade = Math.min(t / FADE_IN, 1);
      const damp = Math.exp(-dt * 1.6);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Мир снега: сугробы на никах и внизу экрана, брызги. Снежинки рисуются поверх.
      world.wind = wind;
      world.mouse.x = mouse.x;
      world.mouse.y = mouse.y;
      world.mouse.vx = mouse.vx;
      world.mouse.vy = mouse.vy;
      stepWorld(dt, now);
      drawWorld(ctx);

      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        const near = 0.35 + f.z * 0.9;
        if (mouse.x > -9000) {
          const dx = f.x - mouse.x;
          const dy = f.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < MOUSE_RADIUS && d > 0.5) {
            const k = (1 - d / MOUSE_RADIUS) ** 2 * near;
            f.vx += ((dx / d) * 260 + mouse.vx * 0.55) * k * dt * 6;
            f.vy += ((dy / d) * 260 + mouse.vy * 0.55) * k * dt * 6;
          }
        }
        f.vx *= damp;
        f.vy *= damp;
        f.wx += (wind * near - f.wx) * (1 - Math.exp(-dt * FLAKE_INERTIA * (1.6 - f.z)));
        f.x += (f.wx + f.vx) * dt;
        f.y += (f.fall + f.vy) * dt;
        f.rot += f.spin * dt;

        if (f.y > h + f.r * 2) {
          f.y = -f.r * 2;
          f.x = Math.random() * w;
        }
        // Снег уносит ветром за край - возвращаем с противоположной стороны.
        if (f.x < -f.r * 2 - 40) f.x += w + f.r * 4 + 80;
        else if (f.x > w + f.r * 2 + 40) f.x -= w + f.r * 4 + 80;

        const px = f.x + Math.sin(f.phase + t * f.freq) * f.amp;
        if (f.kind !== 1 && f.y > 0 && landFlake(px, f.y + f.r * 0.4, Math.min(f.r * f.r * LAND_VOLUME, LAND_VOLUME_MAX))) {
          f.y = -f.r * 2 - Math.random() * 60; // осела на ник или в сугроб внизу, новая начинает путь сверху
          f.x = Math.random() * w;
          continue;
        }
        let a = f.alpha * fade;
        if (f.twinkle) a *= 0.65 + 0.35 * Math.sin(f.phase + t * f.twinkle);
        ctx.globalAlpha = a;
        const size = f.r * 2;
        const img = sprites[f.tint][f.kind];
        if (f.kind === 2) {
          ctx.save();
          ctx.translate(px, f.y);
          ctx.rotate(f.rot);
          ctx.drawImage(img, -f.r, -f.r, size, size);
          ctx.restore();
        } else {
          ctx.drawImage(img, px - f.r, f.y - f.r, size, size);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [on, allowed]);

  // Остальное снежное оформление (ники, профили) прячется, когда снег выключен.
  useEffect(() => {
    if (!allowed) return;
    document.documentElement.setAttribute(SNOW_ATTR, on ? "on" : "off");
    return () => document.documentElement.removeAttribute(SNOW_ATTR);
  }, [on, allowed]);

  const toggle = () => {
    const next = !on;
    memoryOff = !next;
    try {
      localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      /* не сохранилось - действует до перезагрузки */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  if (!allowed) return null;

  return (
    <>
      {on && <canvas ref={canvasRef} className="snowfall" aria-hidden="true" />}
      <button
        type="button"
        className="snowfall-toggle"
        data-off={on ? undefined : "true"}
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? "Выключить снег" : "Включить снег"}
        title={on ? "Выключить снег" : "Включить снег"}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M12 2v20M3.34 7l17.32 10M3.34 17 20.66 7" />
          <path d="m9.5 3.8 2.5 2 2.5-2M9.5 20.2l2.5-2 2.5 2M4 9.5l3.1-.3-.9-3M20 14.5l-3.1.3.9 3M4 14.5l3.1.3-.9 3M20 9.5l-3.1-.3.9-3" />
          {!on && <path d="M4 4l16 16" strokeWidth="2.2" />}
        </svg>
      </button>
    </>
  );
}
