/* Ткань знамени: сетка точек на связях, верхний край держит перекладина, остальное несёт ветер.
   Чистый расчёт без DOM. Единицы - пиксели полотна, z смотрит на зрителя. */

export const COLS = 18;
export const ROWS = 30;
/** Шаг расчёта, секунды: постоянный, чтобы ткань вела себя одинаково на любом экране. */
export const STEP = 1 / 120;

const GRAVITY = 900;
/** Доля скорости, остающаяся после шага. */
const DAMPING = 0.986;
/** Насколько сильно ветер давит на ткань, 1/с. */
const PRESSURE = 1.15;
/** Тяга к ровному положению, 1/с²: без неё полотно скручивается и надписи не прочесть. */
const SHAPE = 48;
const ITERATIONS = 3;

export interface Cloth {
  pos: Float32Array;
  normals: Float32Array;
  uv: Float32Array;
  index: Uint16Array;
  /** Шаг расчёта; time - секунды, phase сдвигает порывы, чтобы ветер шёл от знамени к знамени. */
  step: (time: number, phase: number) => void;
  /** Толчок курсором в точке полотна со скоростью vx, vy. */
  poke: (x: number, y: number, vx: number, vy: number) => void;
  updateNormals: () => void;
}

export function createCloth(width: number, height: number): Cloth {
  const nx = COLS + 1, ny = ROWS + 1, n = nx * ny;
  const dx = width / COLS, dy = height / ROWS;
  const pos = new Float32Array(n * 3), prev = new Float32Array(n * 3), rest = new Float32Array(n * 3);
  const acc = new Float32Array(n * 3), normals = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  const at = (c: number, r: number) => r * nx + c;

  for (let r = 0; r < ny; r++) {
    for (let c = 0; c < nx; c++) {
      const i = at(c, r), v = r / ROWS;
      rest.set([c * dx, r * dy, 0], i * 3);
      // стартовый изгиб: знамя расправляется на глазах
      pos.set([c * dx, r * dy, Math.sin(v * Math.PI * 2.5) * 22 * v], i * 3);
      uv.set([c / COLS, v], i * 2);
    }
  }
  prev.set(pos);

  const links: number[] = [];
  const lengths: number[] = [];
  const stiff: number[] = [];
  const link = (a: number, b: number, k: number) => {
    links.push(a, b);
    lengths.push(Math.hypot(rest[a * 3] - rest[b * 3], rest[a * 3 + 1] - rest[b * 3 + 1]));
    stiff.push(k);
  };
  const tri: number[] = [];
  for (let r = 0; r < ny; r++) {
    for (let c = 0; c < nx; c++) {
      if (c < COLS) link(at(c, r), at(c + 1, r), 1);
      if (r < ROWS) link(at(c, r), at(c, r + 1), 1);
      if (c < COLS && r < ROWS) {
        link(at(c, r), at(c + 1, r + 1), 0.7);
        link(at(c + 1, r), at(c, r + 1), 0.7);
        tri.push(at(c, r), at(c + 1, r), at(c, r + 1), at(c + 1, r), at(c + 1, r + 1), at(c, r + 1));
      }
      // связи через точку не дают ткани мяться в гармошку
      if (c < COLS - 1) link(at(c, r), at(c + 2, r), 0.35);
      if (r < ROWS - 1) link(at(c, r), at(c, r + 2), 0.22);
    }
  }
  const index = new Uint16Array(tri);
  const first = nx; // верхний ряд закреплён

  function wind(time: number, phase: number) {
    const t = time - phase * 0.35;
    const calm = 0.62 + 0.38 * Math.sin(t * 0.73) * Math.sin(t * 0.29 + 1.7);
    // редкий сильный порыв
    const gust = Math.pow(Math.max(0, Math.sin(t * 0.47)), 8);
    for (let i = 0; i < index.length; i += 3) {
      const a = index[i] * 3, b = index[i + 1] * 3, c = index[i + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      let px = uy * vz - uz * vy, py = uz * vx - ux * vz, pz = ux * vy - uy * vx;
      const len = Math.sqrt(px * px + py * py + pz * pz) || 1;
      px /= len;
      py /= len;
      pz /= len;
      const x = rest[a], y = rest[a + 1];
      // волны бегут от перекладины вниз и чуть наискось
      const wave = Math.sin(y * 0.031 - t * 5.4 + x * 0.013) + 0.55 * Math.sin(y * 0.018 - t * 3.3 - x * 0.022 + 2.1);
      const wz = calm * 330 * wave + gust * 260;
      const wx = calm * 170 * Math.sin(t * 0.9 + y * 0.007) + gust * 260;
      const rx = wx - (pos[a] - prev[a]) / STEP;
      const ry = -(pos[a + 1] - prev[a + 1]) / STEP;
      const rz = wz - (pos[a + 2] - prev[a + 2]) / STEP;
      // ветер давит поперёк ткани; боковой снос - малая его часть
      const f = (px * rx + py * ry + pz * rz) * PRESSURE;
      const side = (wx * 0.9) / 3;
      for (const k of [a, b, c]) {
        acc[k] += (px * f) / 3 + side / 3;
        acc[k + 1] += (py * f) / 3;
        acc[k + 2] += (pz * f) / 3;
      }
    }
  }

  function step(time: number, phase: number) {
    acc.fill(0);
    wind(time, phase);
    for (let i = first; i < n; i++) {
      const k = i * 3;
      const pull = SHAPE * (1 - uv[i * 2 + 1] * 0.7);
      for (let d = 0; d < 3; d++) {
        const a = acc[k + d] + (rest[k + d] - pos[k + d]) * pull + (d === 1 ? GRAVITY : 0);
        const cur = pos[k + d];
        pos[k + d] = cur + (cur - prev[k + d]) * DAMPING + a * STEP * STEP;
        prev[k + d] = cur;
      }
    }
    for (let it = 0; it < ITERATIONS; it++) {
      for (let j = 0; j < lengths.length; j++) {
        const a = links[j * 2], b = links[j * 2 + 1];
        const wa = a < first ? 0 : 1, wb = b < first ? 0 : 1;
        if (!wa && !wb) continue;
        const i = a * 3, k = b * 3;
        const ex = pos[k] - pos[i], ey = pos[k + 1] - pos[i + 1], ez = pos[k + 2] - pos[i + 2];
        const len = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
        const s = ((len - lengths[j]) / len / (wa + wb)) * stiff[j];
        pos[i] += ex * s * wa;
        pos[i + 1] += ey * s * wa;
        pos[i + 2] += ez * s * wa;
        pos[k] -= ex * s * wb;
        pos[k + 1] -= ey * s * wb;
        pos[k + 2] -= ez * s * wb;
      }
    }
    // точка не дальше от своей опоры, чем по ровной ткани: полотно не тянется под весом
    for (let i = first; i < n; i++) {
      const k = i * 3, p = (i % nx) * 3;
      const max = Math.floor(i / nx) * dy * 1.01;
      const ex = pos[k] - pos[p], ey = pos[k + 1] - pos[p + 1], ez = pos[k + 2] - pos[p + 2];
      const len = Math.sqrt(ex * ex + ey * ey + ez * ez);
      if (len > max) {
        const s = max / len;
        pos[k] = pos[p] + ex * s;
        pos[k + 1] = pos[p + 1] + ey * s;
        pos[k + 2] = pos[p + 2] + ez * s;
      }
    }
  }

  function poke(x: number, y: number, vx: number, vy: number) {
    const radius = 62;
    const speed = Math.min(Math.hypot(vx, vy), 1400);
    if (speed < 20) return;
    const scale = speed / Math.hypot(vx, vy);
    for (let i = first; i < n; i++) {
      const k = i * 3;
      const d = Math.hypot(pos[k] - x, pos[k + 1] - y);
      if (d > radius) continue;
      const f = (1 - d / radius) ** 2 * STEP * 0.16;
      // сдвиг прошлого положения задаёт скорость; рука ещё и отталкивает ткань от зрителя
      prev[k] -= vx * scale * f;
      prev[k + 1] -= vy * scale * f * 0.4;
      prev[k + 2] += speed * f * 0.9;
    }
  }

  function updateNormals() {
    for (let r = 0; r < ny; r++) {
      for (let c = 0; c < nx; c++) {
        const a = at(Math.max(c - 1, 0), r) * 3, b = at(Math.min(c + 1, COLS), r) * 3;
        const u = at(c, Math.max(r - 1, 0)) * 3, d = at(c, Math.min(r + 1, ROWS)) * 3;
        const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
        const vx = pos[d] - pos[u], vy = pos[d + 1] - pos[u + 1], vz = pos[d + 2] - pos[u + 2];
        const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
        const len = Math.hypot(x, y, z) || 1;
        normals.set([x / len, y / len, z / len], at(c, r) * 3);
      }
    }
  }

  return { pos, normals, uv, index, step, poke, updateNormals };
}
