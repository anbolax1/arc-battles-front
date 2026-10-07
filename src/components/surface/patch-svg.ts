/* Рисунок нашивки: вышитый значок без надписей. Строка SVG - её рисует и страница, и картинка для
   ссылок. Слои: кант оверлоком, саржа, строчка, значок гладью с тенью. */

import type { PatchCode } from "@/lib/types";

type Shape = "shield" | "circle" | "hex" | "square";

/** Ткань, кант и нитки значка. */
interface Colors {
  base: string;
  rim: string;
  ink: string;
  acc: string;
}

/** Форма - по группе нашивки: рейтинг - щит, матчи - круг, ноки и карты - шестиугольник, сезон - квадрат. */
const LOOK: Record<PatchCode, Colors & { shape: Shape }> = {
  top1: { shape: "shield", base: "#1c0f22", rim: "#f1aa1c", ink: "#f1aa1c", acc: "#ece2d0" },
  belt: { shape: "shield", base: "#7a1626", rim: "#f1aa1c", ink: "#1a0e1e", acc: "#f1aa1c" },
  regicide: { shape: "shield", base: "#2a1931", rim: "#ff5a47", ink: "#f1aa1c", acc: "#ece2d0" },
  streak: { shape: "circle", base: "#c9301f", rim: "#f9cf0a", ink: "#fff3cf", acc: "#f9cf0a" },
  flawless: { shape: "circle", base: "#13314a", rim: "#7fede6", ink: "#7fede6", acc: "#dafffb" },
  david: { shape: "circle", base: "#0f7a43", rim: "#2bef83", ink: "#ece2d0", acc: "#f9cf0a" },
  comeback: { shape: "circle", base: "#7fede6", rim: "#1a0e1e", ink: "#1a0e1e", acc: "#1a0e1e" },
  double: { shape: "circle", base: "#f9cf0a", rim: "#1a0e1e", ink: "#1a0e1e", acc: "#1a0e1e" },
  photo: { shape: "circle", base: "#2a6fdb", rim: "#ece2d0", ink: "#1a0e1e", acc: "#f5eedf" },
  shutout: { shape: "circle", base: "#ece2d0", rim: "#c0261a", ink: "#c0261a", acc: "#c0261a" },
  revenge: { shape: "circle", base: "#9163d5", rim: "#1a0e1e", ink: "#ece2d0", acc: "#ece2d0" },
  hunter: { shape: "hex", base: "#4b5320", rim: "#c47a3a", ink: "#ece2d0", acc: "#ff5a47" },
  clear: { shape: "hex", base: "#1a0e1e", rim: "#ff5a47", ink: "#ece2d0", acc: "#ff5a47" },
  topknock: { shape: "hex", base: "#8f1d14", rim: "#f1aa1c", ink: "#ece2d0", acc: "#f1aa1c" },
  pacifist: { shape: "hex", base: "#ece2d0", rim: "#2bef83", ink: "#0f7a43", acc: "#0f7a43" },
  king: { shape: "hex", base: "#1440a8", rim: "#7fede6", ink: "#ece2d0", acc: "#f1aa1c" },
  first: { shape: "square", base: "#2bef83", rim: "#1a0e1e", ink: "#1a0e1e", acc: "#1a0e1e" },
  final: { shape: "square", base: "#1c0f22", rim: "#ff5a47", ink: "#ff5a47", acc: "#ff5a47" },
  marathon: { shape: "square", base: "#5b4a57", rim: "#ece2d0", ink: "#ece2d0", acc: "#f1aa1c" },
  veteran: { shape: "square", base: "#0f4d4b", rim: "#f1aa1c", ink: "#f1aa1c", acc: "#ece2d0" },
};

/** Кант «Охотника» по ступеням: бронза, серебро, золото. */
const HUNTER_RIM = ["#c47a3a", "#c47a3a", "#d7dbe2", "#f1aa1c"];
/** Несобранная нашивка - слепое тиснение по бумаге. */
const GHOST: Colors = { base: "#e3d7c1", rim: "#d5c7ad", ink: "#c3b399", acc: "#c3b399" };

const f1 = (n: number) => String(Math.round(n * 10) / 10);
type Pt = [number, number];

function roundPoly(pts: Pt[], r: number): string {
  const n = pts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const l1 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]), l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const a: Pt = [p1[0] + ((p0[0] - p1[0]) / l1) * r, p1[1] + ((p0[1] - p1[1]) / l1) * r];
    const b: Pt = [p1[0] + ((p2[0] - p1[0]) / l2) * r, p1[1] + ((p2[1] - p1[1]) / l2) * r];
    d += `${i ? " L" : "M"}${f1(a[0])} ${f1(a[1])} Q${f1(p1[0])} ${f1(p1[1])} ${f1(b[0])} ${f1(b[1])}`;
  }
  return d + " Z";
}

const SHAPE_D: Record<Shape, string> = {
  circle: "M5 60 A55 55 0 1 0 115 60 A55 55 0 1 0 5 60 Z",
  shield: "M60 5 C76 12 90 14 103 14 Q107 14 107 18 L107 58 C107 87 87 105 60 116 C33 105 13 87 13 58 L13 18 Q13 14 17 14 C30 14 44 12 60 5 Z",
  hex: roundPoly([[60, 3], [110, 31.5], [110, 88.5], [60, 117], [10, 88.5], [10, 31.5]], 10),
  square: roundPoly([[7, 7], [113, 7], [113, 113], [7, 113]], 26),
};

const scale = (s: number) => `transform="translate(60 60) scale(${s}) translate(-60 -60)"`;
function rgb(h: string): number[] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(h: string, to: string, t: number): string {
  const a = rgb(h), b = rgb(to);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
}
function lum(h: string): number {
  const [r, g, b] = rgb(h);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function polar(cx: number, cy: number, r: number, deg: number): Pt {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function arrowHead(tip: Pt, from: Pt, len: number, half: number, fill: string): string {
  const dx = tip[0] - from[0], dy = tip[1] - from[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
  const bx = tip[0] - ux * len, by = tip[1] - uy * len;
  return `<path d="M${f1(tip[0])} ${f1(tip[1])} L${f1(bx - uy * half)} ${f1(by + ux * half)} L${f1(bx + uy * half)} ${f1(by - ux * half)} Z" fill="${fill}" stroke="${fill}" stroke-width="1.5" stroke-linejoin="round"/>`;
}
/** Корона с тремя зубцами в рамке x..x+w, y..y+h. */
function crown(x: number, y: number, w: number, h: number, fill: string): string {
  const k = w / 40;
  const pts = [[x + 4 * k, y + h], [x, y + h * 0.3], [x + 11 * k, y + h * 0.58], [x + 20 * k, y], [x + 29 * k, y + h * 0.58], [x + 40 * k, y + h * 0.3], [x + 36 * k, y + h]];
  return `<path d="${pts.map((p, i) => `${i ? "L" : "M"}${f1(p[0])} ${f1(p[1])}`).join(" ")} Z" fill="${fill}" stroke="${fill}" stroke-width="2" stroke-linejoin="round"/>`;
}
function star(cx: number, cy: number, big: number, small: number, fill: string): string {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const p = polar(cx, cy, i % 2 ? small : big, -90 + i * 36);
    d += `${i ? " L" : "M"}${f1(p[0])} ${f1(p[1])}`;
  }
  return `<path d="${d} Z" fill="${fill}"/>`;
}

/** Нитки одного прохода: значок рисуется трижды - тень, цвет и маска для фактуры глади. */
interface Ink {
  ink: string;
  acc: string;
  cut: string;
  tier?: string;
}

const ICON: Record<PatchCode, (c: Ink, id: string, tier: number) => string> = {
  top1: (c) =>
    crown(41, 22, 38, 22, c.ink) +
    `<rect x="41" y="47" width="38" height="5" rx="1.5" fill="${c.ink}"/>` +
    `<path d="M70 57 V94 H60 V68 L50.5 72.5 V63 L61.5 57 Z" fill="${c.acc}"/>`,
  belt: (c) =>
    `<path d="M24 53 Q60 47 96 53 V69 Q60 63 24 69 Z" fill="${c.ink}"/>` +
    `<rect x="28" y="52.5" width="11" height="13" rx="2.5" fill="${c.acc}"/><rect x="81" y="52.5" width="11" height="13" rx="2.5" fill="${c.acc}"/>` +
    `<path d="M60 35 L78 42 V62 Q78 76 60 84 Q42 76 42 62 V42 Z" fill="${c.acc}"/>` +
    `<path d="M60 41 L73 46.5 V62 Q73 72 60 78 Q47 72 47 62 V46.5 Z" fill="none" stroke="${c.ink}" stroke-width="2"/>` +
    star(60, 59, 9.5, 4, c.ink),
  regicide: (c) =>
    `<g transform="rotate(-12 60 62)">${crown(39, 44, 42, 24, c.ink)}<rect x="39.5" y="71" width="41" height="6" rx="1.5" fill="${c.ink}"/></g>` +
    `<g transform="rotate(36 60 60)"><path d="M60 14 L65 23 V72 H55 V23 Z" fill="${c.acc}"/>` +
    `<path d="M60 24 V70" stroke="${c.cut}" stroke-opacity=".45" stroke-width="1.4"/>` +
    `<rect x="46" y="72" width="28" height="6" rx="3" fill="${c.acc}"/><rect x="57" y="78" width="6" height="13" rx="1.5" fill="${c.acc}"/>` +
    `<circle cx="60" cy="95" r="4.6" fill="${c.acc}"/></g>`,
  streak: (c) =>
    `<path d="M60 22 C63 34 79 42 79 62 C79 78 71 89 60 89 C49 89 41 79 41 65 C41 53 49 48 51 38 C54 45 57 49 61 51 C62 42 59 32 60 22 Z" fill="${c.acc}"/>` +
    `<path d="M60 56 C64 63 70 66 70 75 C70 82 65 87 60 87 C55 87 50 82 50 76 C50 69 56 66 60 56 Z" fill="${c.ink}"/>`,
  flawless: (c) =>
    `<path d="M36 47 L47 32 H73 L84 47 L60 89 Z" fill="${c.ink}"/>` +
    `<path d="M47 32 H73 L67 47 H53 Z" fill="${c.acc}"/>` +
    `<path d="M36 47 H84 M53 47 L60 89 L67 47 M47 32 L53 47 M73 32 L67 47" fill="none" stroke="${c.cut}" stroke-width="1.8" stroke-linejoin="round"/>`,
  david: (c) =>
    `<path d="M60 90 V66 M60 66 C50 62 45 52 45 36 M60 66 C70 62 75 52 75 36" fill="none" stroke="${c.ink}" stroke-width="7.5" stroke-linecap="round"/>` +
    `<path d="M45 38 C48 50 54 55 60 56 C66 55 72 50 75 38" fill="none" stroke="${c.acc}" stroke-width="2.6"/>` +
    `<circle cx="60" cy="55" r="6" fill="${c.acc}"/><rect x="55.5" y="74" width="9" height="13" rx="2" fill="${c.acc}"/>`,
  comeback: (c) =>
    `<path d="M32 46 C35 70 44 84 56 83 C68 82 73 66 78 44" fill="none" stroke="${c.ink}" stroke-width="7.5" stroke-linecap="round"/>` +
    `<circle cx="32" cy="46" r="5" fill="${c.ink}"/>` +
    arrowHead([81, 26], [77.5, 47], 17, 10.5, c.ink),
  double: (c) =>
    `<g transform="rotate(45 40 63)"><rect x="31" y="60" width="18" height="6" rx="1.5" fill="${c.ink}"/><rect x="37" y="54" width="6" height="18" rx="1.5" fill="${c.ink}"/></g>` +
    `<path d="M54 55 C54 47.5 60 43 67.5 43 C75.5 43 81 47.5 81 54.5 C81 60.5 77.5 64.5 71.5 68.5 L65.5 72.5 H81 V81 H53.5 V73.5 L66 64.5 C70.5 61.3 72 58.8 72 55.5 C72 52.5 70.3 50.5 67.5 50.5 C64.5 50.5 62.8 52.6 62.8 56 Z" fill="${c.ink}"/>`,
  photo: (c, id) => {
    const flag = "M43 30 C55 25 65 37 85 30 V60 C65 67 55 55 43 60 Z";
    let sq = "";
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++)
        if ((r + k) % 2 === 0) sq += `<rect x="${43 + k * 10.5}" y="${24 + r * 10.5}" width="10.5" height="10.5" fill="${c.ink}"/>`;
    return (
      `<defs><clipPath id="${id}fl"><path d="${flag}"/></clipPath></defs>` +
      `<path d="${flag}" fill="${c.acc}"/><g clip-path="url(#${id}fl)">${sq}</g>` +
      `<path d="${flag}" fill="none" stroke="${c.ink}" stroke-width="2"/>` +
      `<rect x="37" y="26" width="5" height="64" rx="2.5" fill="${c.acc}"/>`
    );
  },
  shutout: (c) => `<ellipse cx="60" cy="60" rx="15.5" ry="22" fill="none" stroke="${c.ink}" stroke-width="9.5"/>`,
  revenge: (c) => {
    const p = (a: number) => polar(60, 60, 21, a);
    const [a0, a1, b0, b1] = [p(200), p(318), p(20), p(138)];
    return (
      `<path d="M${f1(a0[0])} ${f1(a0[1])} A21 21 0 0 1 ${f1(a1[0])} ${f1(a1[1])} M${f1(b0[0])} ${f1(b0[1])} A21 21 0 0 1 ${f1(b1[0])} ${f1(b1[1])}" fill="none" stroke="${c.ink}" stroke-width="7" stroke-linecap="round"/>` +
      arrowHead(p(340), p(314), 15, 9.5, c.ink) +
      arrowHead(p(160), p(134), 15, 9.5, c.ink)
    );
  },
  hunter: (c, _id, tier) => {
    // прицел и шевроны ступени под ним; вся группа по центру нашивки
    const n = Math.max(1, tier), gap = 7;
    let ch = "";
    for (let i = 0; i < n; i++) {
      const y = 74 + i * gap;
      ch += `<path d="M48.5 ${y + 5} L60 ${y} L71.5 ${y + 5}" fill="none" stroke="${c.tier || c.acc}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    const dy = 60 - (21 + 79 + (n - 1) * gap) / 2;
    return (
      `<g transform="translate(0 ${f1(dy)})"><circle cx="60" cy="44" r="14" fill="none" stroke="${c.ink}" stroke-width="4.4"/>` +
      `<path d="M60 21 V35 M60 53 V67 M37 44 H51 M69 44 H83" stroke="${c.ink}" stroke-width="4.4" stroke-linecap="round"/>` +
      `<circle cx="60" cy="44" r="3.4" fill="${c.acc}"/>${ch}</g>`
    );
  },
  clear: (c) => {
    const eye = (x: number) => `M${x - 7} 53 a7 7.5 0 1 0 14 0 a7 7.5 0 1 0 -14 0 Z`;
    return `<path fill-rule="evenodd" fill="${c.ink}" d="M60 27 C43 27 35 39 35 53 C35 61 39 66 45 69 V79 Q45 84 50 84 H70 Q75 84 75 79 V69 C81 66 85 61 85 53 C85 39 77 27 60 27 Z ${eye(50)} ${eye(70)} M60 61 L55.5 69 H64.5 Z M52.5 74 h3 v10 h-3 Z M58.5 74 h3 v10 h-3 Z M64.5 74 h3 v10 h-3 Z"/>`;
  },
  topknock: (c) =>
    crown(46, 18, 28, 16, c.acc) +
    `<circle cx="60" cy="66" r="15" fill="none" stroke="${c.ink}" stroke-width="4.4"/>` +
    `<path d="M60 42 V57 M60 75 V90 M36 66 H51 M69 66 H84" stroke="${c.ink}" stroke-width="4.4" stroke-linecap="round"/>` +
    `<circle cx="60" cy="66" r="3.4" fill="${c.acc}"/>`,
  pacifist: (c) =>
    `<circle cx="60" cy="60" r="23" fill="none" stroke="${c.ink}" stroke-width="6.5"/>` +
    `<path d="M60 37 V83 M60 60 L43.7 76.3 M60 60 L76.3 76.3" stroke="${c.ink}" stroke-width="6.5" stroke-linejoin="round"/>`,
  king: (c) =>
    `<path fill-rule="evenodd" fill="${c.ink}" d="M60 92 C52 81 37 67 37 52 A23 23 0 0 1 83 52 C83 67 68 81 60 92 Z M60 38 A14 14 0 1 0 60.01 38 Z"/>` +
    crown(50.5, 43, 19, 13, c.acc),
  first: (c) => {
    const rays = [-90, -130, -50, -165, -15]
      .map((a) => {
        const p0 = polar(60, 76, 30, a), p1 = polar(60, 76, 40, a);
        return `M${f1(p0[0])} ${f1(p0[1])} L${f1(p1[0])} ${f1(p1[1])}`;
      })
      .join(" ");
    return (
      `<path d="M36 76 A24 24 0 0 1 84 76 Z" fill="${c.ink}"/><rect x="26" y="79" width="68" height="5.5" rx="2.75" fill="${c.ink}"/>` +
      `<path d="${rays}" stroke="${c.ink}" stroke-width="4.6" stroke-linecap="round"/>`
    );
  },
  final: (c) =>
    `<ellipse cx="45" cy="80" rx="9.5" ry="7" transform="rotate(-22 45 80)" fill="${c.ink}"/>` +
    `<ellipse cx="75" cy="73" rx="9.5" ry="7" transform="rotate(-22 75 73)" fill="${c.ink}"/>` +
    `<path d="M50.5 79 V41 L84 32 V72 H80 V43 L54.5 50 V79 Z" fill="${c.ink}"/>` +
    `<path d="M50.5 38 L84 29 V39 L50.5 48 Z" fill="${c.ink}"/>`,
  marathon: (c) => {
    let ticks = "";
    for (let i = 0; i < 12; i++) {
      const p0 = polar(60, 65, i % 3 ? 17 : 15, i * 30), p1 = polar(60, 65, 19.5, i * 30);
      ticks += `M${f1(p0[0])} ${f1(p0[1])} L${f1(p1[0])} ${f1(p1[1])} `;
    }
    return (
      `<circle cx="60" cy="65" r="24" fill="none" stroke="${c.ink}" stroke-width="5.5"/>` +
      `<rect x="54" y="29" width="12" height="7" rx="2" fill="${c.ink}"/><rect x="57.5" y="34" width="5" height="6" fill="${c.ink}"/>` +
      `<rect x="79" y="36" width="6" height="9" rx="1.5" transform="rotate(45 82 40.5)" fill="${c.ink}"/>` +
      `<path d="${ticks}" stroke="${c.ink}" stroke-width="1.8" stroke-linecap="round"/>` +
      `<path d="M60 65 L60 49 M60 65 L70 72" stroke="${c.acc}" stroke-width="3.8" stroke-linecap="round"/><circle cx="60" cy="65" r="3.2" fill="${c.acc}"/>`
    );
  },
  veteran: (c) => {
    let leaves = "";
    for (const s of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const a = s < 0 ? 112 + i * 27 : 180 - (112 + i * 27);
        const p = polar(60, 58, 27, a), rot = a + 90 + s * 32;
        leaves += `<ellipse cx="${f1(p[0])}" cy="${f1(p[1])}" rx="7" ry="3.3" transform="rotate(${f1(rot)} ${f1(p[0])} ${f1(p[1])})" fill="${c.ink}"/>`;
      }
    }
    const s0 = polar(60, 58, 27, 100), s1 = polar(60, 58, 27, 255), e0 = polar(60, 58, 27, 80), e1 = polar(60, 58, 27, -75);
    return (
      `<path d="M${f1(s0[0])} ${f1(s0[1])} A27 27 0 0 1 ${f1(s1[0])} ${f1(s1[1])} M${f1(e0[0])} ${f1(e0[1])} A27 27 0 0 0 ${f1(e1[0])} ${f1(e1[1])}" fill="none" stroke="${c.ink}" stroke-width="2.4" stroke-linecap="round"/>` +
      leaves +
      star(60, 57, 13, 5.5, c.acc)
    );
  },
};

export interface PatchSvgOptions {
  /** Уникальный префикс id внутри страницы: у узоров и масок каждой нашивки свои. */
  id: string;
  tier?: number;
  /** Несобранная: тиснение без цвета. */
  ghost?: boolean;
  /** На ночном фоне тёмный кант обводится светлой ниткой, иначе край теряется. */
  night?: boolean;
}

/** Содержимое <svg viewBox="0 0 120 120"> нашивки. */
export function patchSvgInner(code: PatchCode, o: PatchSvgOptions): string {
  const look = LOOK[code];
  const tier = o.tier ?? 1;
  const id = o.id;
  const col: Colors = o.ghost ? { ...GHOST } : { base: look.base, rim: look.rim, ink: look.ink, acc: look.acc };
  let tierInk: string | undefined;
  if (code === "hunter" && !o.ghost) {
    col.rim = HUNTER_RIM[Math.min(tier, 3)];
    tierInk = col.rim;
  }
  const d = SHAPE_D[look.shape];
  const icon = ICON[code];
  const dark = lum(col.rim) < 0.4;
  const merrow = mix(col.rim, dark ? "#ffffff" : "#000000", dark ? 0.28 : 0.32);
  const main: Ink = { ink: col.ink, acc: col.acc, cut: col.base, tier: tierInk };
  const lift: Ink = o.ghost
    ? { ink: "#f7f1e6", acc: "#f7f1e6", cut: "#f7f1e6", tier: "#f7f1e6" }
    : { ink: "#000", acc: "#000", cut: "#000", tier: "#000" };
  const mask: Ink = { ink: "#fff", acc: "#fff", cut: "#000", tier: "#fff" };
  return (
    "<defs>" +
    `<pattern id="${id}tw" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><rect width="1.1" height="3.4" fill="#000" fill-opacity=".11"/><rect x="1.7" width=".6" height="3.4" fill="#fff" fill-opacity=".06"/></pattern>` +
    `<pattern id="${id}sa" width="2.1" height="2.1" patternUnits="userSpaceOnUse" patternTransform="rotate(-52)"><rect width=".75" height="2.1" fill="#fff" fill-opacity=".55"/><rect x="1.1" width=".55" height="2.1" fill="#000" fill-opacity=".35"/></pattern>` +
    `<radialGradient id="${id}gl" cx=".32" cy=".2" r=".85"><stop offset="0" stop-color="#fff" stop-opacity="${o.ghost ? 0.2 : 0.26}"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `<mask id="${id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120"><rect width="120" height="120" fill="#000"/>${icon(mask, id + "k", tier)}</mask>` +
    "</defs>" +
    `<path d="${d}" fill="${col.rim}"/>` +
    `<path d="${d}" ${scale(0.94)} fill="none" stroke="${merrow}" stroke-width="6.9" stroke-dasharray="1 1.3"/>` +
    `<path d="${d}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="1"/>` +
    `<path d="${d}" ${scale(0.88)} fill="${col.base}"/>` +
    `<path d="${d}" ${scale(0.88)} fill="url(#${id}tw)"/>` +
    `<path d="${d}" ${scale(0.88)} fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.3"/>` +
    `<path d="${d}" ${scale(0.785)} fill="none" stroke="${o.ghost ? GHOST.ink : col.rim}" stroke-opacity=".85" stroke-width="1.8" stroke-dasharray="3.6 2.6" stroke-linecap="round"/>` +
    `<g transform="translate(0 ${o.ghost ? 1.4 : 1.8})" opacity="${o.ghost ? 0.75 : 0.32}">${icon(lift, id + "s", tier)}</g>` +
    icon(main, id + "c", tier) +
    `<rect width="120" height="120" fill="url(#${id}sa)" mask="url(#${id}m)" opacity="${o.ghost ? 0.25 : 0.4}"/>` +
    `<path d="${d}" fill="url(#${id}gl)"/>` +
    (o.night && dark ? `<path d="${d}" fill="none" stroke="#ece2d0" stroke-opacity=".35" stroke-width="1.6"/>` : "")
  );
}
