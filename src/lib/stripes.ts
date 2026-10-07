/* Ленты нового дизайна: четыре параллельные полосы (и широкая подложка) вдоль кривой Безье.
   Чистая геометрия без DOM - рисуется на сервере. */

type Pt = { x: number; y: number };

export interface StripesConfig {
  viewBox: string;
  /** Кривая: начальная точка и кубические сегменты [c1x, c1y, c2x, c2y, x, y]. */
  start: [number, number];
  curves: Array<[number, number, number, number, number, number]>;
  /** Толщина полосы и зазор между полосами. */
  width: number;
  gap: number;
  /** Широкая подложка за полосами: толщина и цвет. */
  band?: number;
  bandColor?: string;
  bandOpacity?: number;
  preserve?: string;
}

const SAMPLES_PER_CURVE = 70;

function bezier(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p3.x, y: a * p0.y + b * c1.y + c * c2.y + d * p3.y };
}

function sample(cfg: StripesConfig): Pt[] {
  const pts: Pt[] = [];
  let p0: Pt = { x: cfg.start[0], y: cfg.start[1] };
  for (const [c1x, c1y, c2x, c2y, x, y] of cfg.curves) {
    const c1 = { x: c1x, y: c1y }, c2 = { x: c2x, y: c2y }, p3 = { x, y };
    for (let i = pts.length ? 1 : 0; i <= SAMPLES_PER_CURVE; i++) pts.push(bezier(p0, c1, c2, p3, i / SAMPLES_PER_CURVE));
    p0 = p3;
  }
  return pts;
}

/** Кривая, сдвинутая по нормали на offset. */
function offsetPath(pts: Pt[], offset: number): string {
  const n = pts.length - 1;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const x = pts[i].x + (-dy / len) * offset, y = pts[i].y + (dx / len) * offset;
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

export interface StripePath {
  d: string;
  stroke: string;
  width: number;
  opacity?: number;
}

const COLORS = ["var(--sf-s4)", "var(--sf-s3)", "var(--sf-s2)", "var(--sf-s1)"];

/** Пути полос: сначала подложка, потом четыре цветные полосы. */
export function stripePaths(cfg: StripesConfig): StripePath[] {
  const pts = sample(cfg);
  const step = cfg.width + cfg.gap;
  const out: StripePath[] = [];
  if (cfg.band) {
    const off = 3 * step + cfg.width / 2 + cfg.gap + cfg.band / 2;
    out.push({ d: offsetPath(pts, off), stroke: cfg.bandColor ?? "var(--sf-deep)", width: cfg.band, opacity: cfg.bandOpacity });
  }
  for (let k = 0; k < 4; k++) out.push({ d: offsetPath(pts, k * step), stroke: COLORS[k], width: cfg.width });
  return out;
}

/** Готовые изгибы под места на страницах. */
export const STRIPES = {
  hero: { viewBox: "0 0 1440 760", start: [1580, -60], curves: [[1380, 90, 1210, 230, 1135, 410], [1080, 540, 1072, 660, 1095, 860]], width: 15, gap: 7, band: 70, bandOpacity: 0.85 },
  head: { viewBox: "0 0 640 360", start: [720, -40], curves: [[560, 60, 470, 140, 430, 250], [405, 320, 404, 360, 410, 420]], width: 11, gap: 5, band: 40, bandOpacity: 0.8 },
  corner: { viewBox: "0 0 520 300", start: [250, -40], curves: [[300, 60, 390, 130, 600, 170]], width: 11, gap: 5, band: 40, bandOpacity: 0.8 },
  cta: { viewBox: "0 0 620 420", start: [700, -40], curves: [[520, 60, 400, 170, 350, 290], [320, 360, 315, 420, 320, 480]], width: 16, gap: 7, band: 120, bandColor: "var(--sf-night)" },
  poster: { viewBox: "0 0 400 500", start: [-50, 284], curves: [[70, 266, 190, 232, 280, 162], [335, 118, 370, 52, 450, -60]], width: 9, gap: 4, preserve: "xMidYMid slice" },
  badge: { viewBox: "0 0 130 40", start: [70, -10], curves: [[90, 10, 105, 25, 140, 34]], width: 4, gap: 2 },
} satisfies Record<string, StripesConfig>;
