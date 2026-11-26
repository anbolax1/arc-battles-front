/* Полотно знамени одной картинкой: она натягивается на ткань, поэтому весь рисунок - на canvas. */

import type { PatchCode } from "@/lib/types";
import { patchSvgInner } from "@/components/surface/patch-svg";

export const BANNER_W = 250;
export const BANNER_H = 440;
/** Высота выреза «ласточкин хвост» по центру, доля высоты полотна. */
const NOTCH = 0.89;
const TRIM = 5;
/** Больше карт на полотне не помещается: остальные - числом. */
const MAPS_SHOWN = 3;

export interface BannerFace {
  code: PatchCode;
  title: string;
  maps: string[];
  /** Номера сезонов: «2·3». */
  numbers: string;
  word: string;
}

interface Look {
  cloth: string;
  cloth2: string;
  trim: string;
  digits: string;
}

const LOOKS: Partial<Record<PatchCode, Look>> = {
  top1: { cloth: "#3a2147", cloth2: "#1c0f22", trim: "#f1aa1c", digits: "#f9cf0a" },
  flawless: { cloth: "#1c466b", cloth2: "#0c2133", trim: "#7fede6", digits: "#7fede6" },
  topknock: { cloth: "#a32218", cloth2: "#57100b", trim: "#f1aa1c", digits: "#ffd469" },
  king: { cloth: "#1a4cbd", cloth2: "#0b2260", trim: "#ece2d0", digits: "#ffffff" },
};

export function bannerLook(code: PatchCode): Look {
  return LOOKS[code] ?? LOOKS.top1!;
}

function outline(ctx: CanvasRenderingContext2D, inset: number) {
  const w = BANNER_W, h = BANNER_H;
  ctx.beginPath();
  ctx.moveTo(inset, 0);
  ctx.lineTo(w - inset, 0);
  ctx.lineTo(w - inset, h - inset * 1.4);
  ctx.lineTo(w / 2, h * NOTCH - inset);
  ctx.lineTo(inset, h - inset * 1.4);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Уменьшает кегль, пока строка не влезет в ширину. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, px: number, max: number) {
  let size = px;
  ctx.font = font(size);
  while (size > 9 && ctx.measureText(text).width > max) ctx.font = font(--size);
}

/** Рисует полотно с учётом плотности экрана. Шрифты берутся из стилей элемента, где висит знамя. */
export async function paintBanner(host: Element, face: BannerFace, scale: number): Promise<HTMLCanvasElement> {
  const css = getComputedStyle(host);
  const family = (name: string) => css.getPropertyValue(name).trim() || "sans-serif";
  const cond = family("--sf-ff-cc"), mono = family("--sf-ff-m"), wide = family("--sf-ff-x");
  const title = face.title.toUpperCase();
  const maps = face.maps.map((m) => m.toUpperCase());
  const sample = `${title}${maps.join("")}${face.word.toUpperCase()}GOARC.PRO${face.numbers}ЕЩЁ+`;
  // без загрузки шрифта canvas молча нарисует запасным
  await Promise.all(
    [`900 32px ${cond}`, `800 15px ${cond}`, `700 10px ${mono}`, `900 56px ${wide}`].map((f) => document.fonts.load(f, sample).catch(() => [])),
  );
  const look = bannerLook(face.code);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="480" height="480">${patchSvgInner(face.code, { id: "bn", night: true })}</svg>`;
  const patch = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(BANNER_W * scale);
  canvas.height = Math.round(BANNER_H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  outline(ctx, 0);
  ctx.fillStyle = look.trim;
  ctx.fill();
  outline(ctx, TRIM);
  ctx.save();
  ctx.clip();
  const bg = ctx.createLinearGradient(0, 0, 0, BANNER_H);
  bg.addColorStop(0, look.cloth);
  bg.addColorStop(1, look.cloth2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, BANNER_W, BANNER_H);
  // саржа: вертикальные и поперечные нити
  ctx.fillStyle = "rgba(255,255,255,.045)";
  for (let x = 0; x < BANNER_W; x += 5) ctx.fillRect(x, 0, 2, BANNER_H);
  ctx.fillStyle = "rgba(0,0,0,.08)";
  for (let y = 0; y < BANNER_H; y += 4) ctx.fillRect(0, y, BANNER_W, 1);
  // тень под перекладиной
  const top = ctx.createLinearGradient(0, 0, 0, 34);
  top.addColorStop(0, "rgba(0,0,0,.45)");
  top.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, BANNER_W, 34);
  ctx.restore();

  ctx.strokeStyle = "rgba(236,226,208,.32)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  outline(ctx, TRIM + 7);
  ctx.stroke();
  ctx.setLineDash([]);

  const cx = BANNER_W / 2, room = BANNER_W - 40;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const text = (s: string, y: number, color: string, spacing = 0) => {
    ctx.fillStyle = color;
    ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(s, cx + spacing / 2, y);
    ctx.letterSpacing = "0px";
  };

  ctx.font = `700 9px ${mono}`;
  text("GOARC.PRO", 20, "#ece2d0", 2);

  const shown = maps.slice(0, MAPS_SHOWN);
  if (maps.length > MAPS_SHOWN) shown.push(`+ ЕЩЁ ${maps.length - MAPS_SHOWN}`);
  const size = shown.length ? 116 : 136;
  const words = title.split(" ");
  const lines = words.length > 1 ? [words[0], words.slice(1).join(" ")] : words;
  // высоты блоков: нашивка, название, карты, полосы, номера с подписью
  const blocks = [size, lines.length * 31, shown.length * 17, 18, 74];
  const from = 36, to = BANNER_H * NOTCH - 18;
  const used = blocks.reduce((a, b) => a + b, 0);
  const gap = Math.max(2, (to - from - used) / (blocks.filter(Boolean).length - 1));
  let y = from;
  const next = (h: number) => {
    if (h) y += h + gap;
  };

  ctx.shadowColor = "rgba(0,0,0,.45)";
  ctx.shadowBlur = 8 * scale;
  ctx.shadowOffsetY = 8 * scale;
  ctx.drawImage(patch, cx - size / 2, y, size, size);
  ctx.shadowColor = "transparent";
  next(blocks[0]);

  lines.forEach((line, i) => {
    fit(ctx, line, (px) => `900 ${px}px ${cond}`, 33, room);
    text(line, y + i * 31, "#fff6e0", 0.6);
  });
  next(blocks[1]);

  shown.forEach((line, i) => {
    fit(ctx, line, (px) => `800 ${px}px ${cond}`, 15, room);
    text(line, y + i * 17, "#ffd469", 0.8);
  });
  next(blocks[2]);

  ["#7fede6", "#2bef83", "#f9cf0a", "#f2271c"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(cx - 60, y + i * 5, 120, 3);
  });
  next(blocks[3]);

  fit(ctx, face.numbers, (px) => `900 ${px}px ${wide}`, 56, room);
  ctx.fillStyle = "rgba(0,0,0,.4)";
  ctx.fillText(face.numbers, cx, y + 3);
  text(face.numbers, y, look.digits);
  ctx.font = `700 10px ${mono}`;
  text(face.word.toUpperCase(), y + 61, "#ece2d0", 2);
  return canvas;
}
