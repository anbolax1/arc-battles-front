"use client";

import * as React from "react";
import { BANNER_H, BANNER_W, paintBanner, type BannerFace } from "@/components/surface/banner-art";
import { PAD_BOTTOM, PAD_X, createClothView } from "@/components/surface/banner-gl";
import { STEP, createCloth } from "@/components/surface/banner-physics";

/** Расчётов до первого кадра: знамя появляется уже на ветру. */
const WARMUP = 150;
/** Больше расчётов за кадр не догоняем: после паузы ткань не должна дёргаться. */
const MAX_STEPS = 4;

function hang(canvas: HTMLCanvasElement, texture: HTMLCanvasElement, phase: number, scale: number): () => void {
  canvas.width = Math.round((BANNER_W + PAD_X * 2) * scale);
  canvas.height = Math.round((BANNER_H + PAD_BOTTOM) * scale);
  const cloth = createCloth(BANNER_W, BANNER_H);
  const view = createClothView(canvas, cloth, texture);
  if (!view) {
    canvas.getContext("2d")?.drawImage(texture, PAD_X * scale, 0);
    return () => {};
  }
  let time = 0;
  const advance = () => cloth.step((time += STEP), phase);
  for (let i = 0; i < WARMUP; i++) advance();
  view.draw();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return view.dispose;

  let frame = 0, last = 0, debt = 0;
  const tick = (now: number) => {
    debt = Math.min(debt + (last ? (now - last) / 1000 : STEP), STEP * MAX_STEPS);
    last = now;
    while (debt >= STEP) {
      advance();
      debt -= STEP;
    }
    view.draw();
    frame = requestAnimationFrame(tick);
  };
  // за пределами экрана знамя не считается
  const seen = new IntersectionObserver(([e]) => {
    cancelAnimationFrame(frame);
    last = 0;
    if (e.isIntersecting) frame = requestAnimationFrame(tick);
  });
  seen.observe(canvas);

  let from: { x: number; y: number; at: number } | null = null;
  const move = (e: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * (BANNER_W + PAD_X * 2) - PAD_X;
    const y = ((e.clientY - box.top) / box.height) * (BANNER_H + PAD_BOTTOM);
    if (from && e.timeStamp - from.at < 120) {
      const dt = Math.max(e.timeStamp - from.at, 8) / 1000;
      cloth.poke(x, y, (x - from.x) / dt, (y - from.y) / dt);
    }
    from = { x, y, at: e.timeStamp };
  };
  canvas.addEventListener("pointermove", move);

  return () => {
    cancelAnimationFrame(frame);
    seen.disconnect();
    canvas.removeEventListener("pointermove", move);
    view.dispose();
  };
}

/** Полотно знамени на ветру. Текст знамени для чтения с экрана - в разметке рядом. */
export function BannerCloth({ face, index }: { face: BannerFace; index: number }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);
  const key = JSON.stringify(face);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let gone = false;
    let stop = () => {};
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    paintBanner(canvas, JSON.parse(key) as BannerFace, scale)
      .then((texture) => {
        if (gone) return;
        stop = hang(canvas, texture, index, scale);
        setReady(true);
      })
      .catch((e) => console.error("знамя не нарисовалось", e));
    return () => {
      gone = true;
      stop();
    };
  }, [key, index]);

  return (
    <div className={`tr-cloth ${ready ? "ready" : ""}`} aria-hidden>
      <canvas ref={ref} />
    </div>
  );
}
