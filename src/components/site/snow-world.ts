/* Мир снега: снежинки не просто падают, а ложатся. Здесь три вещи:
   - сугробы на буквах ников давно не игравших: оседают снежинки, сугроб сползает по склонам,
     ветер и курсор сдувают его комьями;
   - сугроб на дне экрана: копится, пока страницу не крутят, и разлетается брызгами при прокрутке;
   - частицы (комья и брызги) с тяжестью и сопротивлением воздуха.
   Рисует всё цикл снегопада (snowfall.tsx), он же подаёт ветер и курсор; ники регистрирует snow-nicks.tsx. */

export type Level = 1 | 2 | 3;

const MAX_PARTICLES = 1500;
const MAX_WORD = 900; // px: слово шире не считаем
const REPOSE = 0.9; // допустимый перепад поверхности соседних колонок слова, px
const NICK_DEPTH = [0.22, 0.38, 0.55]; // толщина сугроба на нике по ступеням, доля размера шрифта
const NICK_FILL = [0.5, 0.95]; // с какой частью от максимума сугроб лежит при загрузке страницы
const NICK_REFRESH_MS = 250; // как часто пересматриваем все ники (видимые - каждый кадр)
const GRAVITY = 520; // px/с²
const AIR_DRAG = 0.7; // 1/с
const WIND_BLOW = 45; // px/с: с такого ветра начинает сдувать снег
const MOUSE_SHED_RADIUS = 28; // px вокруг курсора, где сбивается снег с ника
const SHED_CHUNK = 1.1; // px² снега в одном сбитом комке

const GROUND_STEP = 2; // px на колонку
const GROUND_MAX_WIDE = 34; // высота сугроба внизу экрана
const GROUND_MAX_NARROW = 22;
const NARROW_VIEW = 700;
const GROUND_GAIN = 12; // снег внизу копится быстрее, чем на никах: его хочется увидеть за минуту
const GROUND_REPOSE = 1; // перепад соседних колонок (по 2 px), мягкий снег сползает
const GROUND_SMOOTH = 0.35; // насколько за кадр выравнивается гребень: сугроб без колючек
const SCATTER_CHUNK = 14; // px² снега в одной брызге при разбрасывании
const SCATTER_PER_PX = 90; // сколько px прокрутки разбрасывают весь сугроб

type Particle = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number };

type Drift = {
  el: HTMLElement;
  level: Level;
  text: string;
  fs: number;
  n: number; // колонок по ширине слова, 1 px каждая
  top: Float32Array; // верх букв в колонке, px от верха области текста
  bot: Float32Array; // низ букв
  snow: Float32Array; // толщина снега в колонке
  max: number;
  icicles: { x: number; len: number; w: number }[];
  left: number; // положение слова на экране
  boxTop: number;
  on: boolean;
  shed: number; // накопленный сбитый снег, px²
};

export const world = {
  wind: 0, // px/с, подаёт цикл снегопада
  mouse: { x: -9999, y: -9999, vx: 0, vy: 0 },
};

const drifts = new Map<HTMLElement, Drift>();
let active: Drift[] = [];
const particles: Particle[] = [];
let ground = new Float32Array(0);
let scatterAcc = new Float32Array(0);
let groundTmp = new Float32Array(0);
let groundMax = GROUND_MAX_WIDE;
let viewW = 0;
let viewH = 0;
let lastFull = 0;
let time = 0;
const rangeBox = typeof document === "undefined" ? null : document.createRange();

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Детерминированный генератор по строке: у одного слова сугроб всегда один и тот же. */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function spawn(x: number, y: number, vx: number, vy: number, r: number, life: number) {
  if (particles.length >= MAX_PARTICLES) return;
  particles.push({ x, y, vx, vy, r, life, max: life });
}

/* ---------- ники ---------- */

/** Силуэт слова: где у каждой колонки верх и низ букв. Рисуем то же слово тем же шрифтом и ищем чернила. */
function buildDrift(el: HTMLElement, level: Level): Drift | null {
  if (!rangeBox) return null;
  rangeBox.selectNodeContents(el);
  const rects = rangeBox.getClientRects();
  if (rects.length !== 1) return null; // слово в несколько строк не считаем
  const r = rects[0];
  const n = Math.ceil(r.width);
  if (n < 6 || n > MAX_WORD) return null;

  const cs = getComputedStyle(el);
  const fs = parseFloat(cs.fontSize) || 16;
  const raw = el.textContent ?? "";
  const text = cs.textTransform === "uppercase" ? raw.toUpperCase() : cs.textTransform === "lowercase" ? raw.toLowerCase() : raw;
  const h = Math.ceil(fs * 2);
  const cv = document.createElement("canvas");
  cv.width = n;
  cv.height = h;
  const c = cv.getContext("2d", { willReadFrequently: true });
  if (!c) return null;
  c.font = cs.font || `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  (c as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
  c.textBaseline = "alphabetic";
  const m = c.measureText(text);
  const asc = m.fontBoundingBoxAscent ?? fs * 0.9;
  const sx = m.width > 0 ? Math.min(Math.max(r.width / m.width, 0.7), 1.4) : 1;
  c.setTransform(sx, 0, 0, 1, 0, 0);
  c.fillStyle = "#000";
  c.fillText(text, 0, asc);
  const data = c.getImageData(0, 0, n, h).data;

  const top = new Float32Array(n).fill(-1);
  const bot = new Float32Array(n).fill(-1);
  const ink = new Uint8Array(n);
  let any = false;
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < h; y++) {
      if (data[(y * n + x) * 4 + 3] > 90) {
        top[x] = y;
        ink[x] = 1;
        any = true;
        break;
      }
    }
    if (ink[x]) {
      for (let y = h - 1; y >= 0; y--) {
        if (data[(y * n + x) * 4 + 3] > 90) {
          bot[x] = y;
          break;
        }
      }
    }
  }
  if (!any) return null;
  // Между буквами снег ложится мостиком: промежутки берут высоту ближайших букв.
  for (const arr of [top, bot]) {
    let prev = -1;
    for (let x = 0; x < n; x++) {
      if (!ink[x]) continue;
      if (prev < 0) for (let k = 0; k < x; k++) arr[k] = arr[x];
      else if (x - prev > 1) {
        for (let k = prev + 1; k < x; k++) arr[k] = arr[prev] + ((arr[x] - arr[prev]) * (k - prev)) / (x - prev);
      }
      prev = x;
    }
    for (let k = prev + 1; k < n; k++) arr[k] = arr[prev];
  }

  const rnd = seeded(text + level);
  const max = fs * NICK_DEPTH[level - 1];
  const snow = new Float32Array(n);
  const phase = rnd() * 6.28;
  for (let x = 0; x < n; x++) {
    const bump = 0.5 + 0.5 * Math.sin(x * 0.19 + phase) * Math.cos(x * 0.07 + phase * 2);
    const edge = Math.min(1, Math.min(x, n - 1 - x) / (fs * 0.4)); // к краям слова снега меньше
    snow[x] = max * (NICK_FILL[0] + (NICK_FILL[1] - NICK_FILL[0]) * bump) * (0.4 + 0.6 * edge);
  }
  const icicles: Drift["icicles"] = [];
  if (level >= 2) {
    const len = level === 2 ? [0.12, 0.3] : [0.2, 0.5];
    for (let x = 3 + rnd() * 6; x < n - 3; x += 8 + rnd() * 8) {
      if (!ink[Math.round(x)]) continue;
      icicles.push({ x, len: fs * (len[0] + rnd() * (len[1] - len[0])), w: 1.2 + rnd() * 1.3 });
    }
  }
  return { el, level, text: raw, fs, n, top, bot, snow, max, icicles, left: r.left, boxTop: r.top, on: false, shed: 0 };
}

/** Список ников со ступенями: новым считает силуэт, пропавшие убирает, прежние не трогает. */
export function syncDrifts(found: Map<HTMLElement, Level>) {
  for (const el of Array.from(drifts.keys())) {
    if (!found.has(el)) drifts.delete(el);
  }
  found.forEach((level, el) => {
    const old = drifts.get(el);
    if (old && old.level === level && old.text === (el.textContent ?? "")) return;
    const d = buildDrift(el, level);
    if (d) drifts.set(el, d);
    else drifts.delete(el);
  });
  lastFull = 0;
}

export function clearDrifts() {
  drifts.clear();
  active = [];
}

/** Положение слов на экране: видимые - каждый кадр, остальные раз в четверть секунды. */
function refreshRects(now: number) {
  if (!rangeBox) return;
  const full = now - lastFull > NICK_REFRESH_MS;
  if (full) lastFull = now;
  const list = full ? Array.from(drifts.values()) : active;
  const next: Drift[] = [];
  for (const item of list) {
    let d = item;
    if (!d.el.isConnected) {
      drifts.delete(d.el);
      continue;
    }
    rangeBox.selectNodeContents(d.el);
    const rects = rangeBox.getClientRects();
    const r = rects[0];
    if (!r || !r.width || rects.length !== 1) {
      d.on = false;
      continue;
    }
    if (Math.abs(r.width - d.n) > 3) {
      // Слово перестроилось (шрифт подгрузился, окно изменилось) - считаем силуэт заново.
      const fresh = buildDrift(d.el, d.level);
      if (!fresh) {
        drifts.delete(d.el);
        continue;
      }
      drifts.set(d.el, fresh);
      d = fresh;
    }
    d.left = r.left;
    d.boxTop = r.top;
    d.on = r.bottom > -60 && r.top < viewH + 60 && r.right > -60 && r.left < viewW + 60;
    if (d.on) next.push(d);
  }
  active = next;
}

function pile(d: Drift, i: number, vol: number) {
  const w = [0.1, 0.2, 0.4, 0.2, 0.1];
  for (let k = -2; k <= 2; k++) {
    const j = i + k;
    if (j >= 0 && j < d.n) d.snow[j] = Math.min(d.max, d.snow[j] + vol * w[k + 2]);
  }
}

/* ---------- сугроб внизу экрана ---------- */

export function resizeWorld(w: number, h: number) {
  viewW = w;
  viewH = h;
  groundMax = w < NARROW_VIEW ? GROUND_MAX_NARROW : GROUND_MAX_WIDE;
  const cols = Math.ceil(w / GROUND_STEP) + 1;
  if (ground.length !== cols) {
    const old = ground;
    ground = new Float32Array(cols);
    ground.set(old.subarray(0, Math.min(old.length, cols)));
    scatterAcc = new Float32Array(cols);
    groundTmp = new Float32Array(cols);
  }
}

/** Прокрутка взметает сугроб внизу: чем резче крутят, тем больше разлетается. */
export function scatterGround(dy: number) {
  const k = Math.min(1, Math.abs(dy) / SCATTER_PER_PX);
  if (k <= 0) return;
  for (let i = 0; i < ground.length; i++) {
    const h = ground[i];
    if (h < 0.3) continue;
    const take = h * k;
    ground[i] = h - take;
    scatterAcc[i] += take * GROUND_STEP;
    while (scatterAcc[i] >= SCATTER_CHUNK) {
      scatterAcc[i] -= SCATTER_CHUNK;
      const speed = Math.abs(dy);
      spawn(
        i * GROUND_STEP + rand(0, GROUND_STEP),
        viewH - ground[i] - rand(0, take),
        rand(-1, 1) * (140 + speed * 3) + world.wind * 0.5,
        -(rand(90, 280) + speed * 4.5),
        rand(1.3, 2.9),
        rand(0.9, 2),
      );
    }
  }
}

/* ---------- посадка снежинок ---------- */

/** Снежинка долетела до ника или до сугроба внизу: true - она осела и исчезает. */
export function landFlake(px: number, py: number, vol: number): boolean {
  for (const d of active) {
    const x = px - d.left;
    if (x < 0 || x >= d.n) continue;
    const i = x | 0;
    const surface = d.boxTop + d.top[i] - d.snow[i];
    if (py >= surface - 2 && py <= surface + 8 && d.snow[i] < d.max) {
      pile(d, i, vol);
      return true;
    }
  }
  if (ground.length && py >= viewH - ground[Math.min(ground.length - 1, Math.max(0, (px / GROUND_STEP) | 0))]) {
    const i = Math.min(ground.length - 1, Math.max(0, (px / GROUND_STEP) | 0));
    const add = (vol * GROUND_GAIN) / GROUND_STEP;
    const taps = [0.04, 0.1, 0.18, 0.36, 0.18, 0.1, 0.04];
    for (let k = -3; k <= 3; k++) {
      const j = i + k;
      if (j >= 0 && j < ground.length) ground[j] = Math.min(groundMax, ground[j] + add * taps[k + 3]);
    }
    return true;
  }
  return false;
}

/* ---------- физика ---------- */

function relaxDrift(d: Drift) {
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < d.n - 1; i++) {
      const diff = d.top[i + 1] - d.snow[i + 1] - (d.top[i] - d.snow[i]); // > 0: колонка i выше
      if (diff > REPOSE && d.snow[i] > 0) {
        const t = Math.min(d.snow[i], (diff - REPOSE) * 0.3);
        d.snow[i] -= t;
        d.snow[i + 1] = Math.min(d.max * 1.3, d.snow[i + 1] + t);
      } else if (-diff > REPOSE && d.snow[i + 1] > 0) {
        const t = Math.min(d.snow[i + 1], (-diff - REPOSE) * 0.3);
        d.snow[i + 1] -= t;
        d.snow[i] = Math.min(d.max * 1.3, d.snow[i] + t);
      }
    }
  }
}

function stepDrift(d: Drift, dt: number) {
  relaxDrift(d);
  const gust = Math.abs(world.wind);
  if (gust > WIND_BLOW) {
    // Сильный ветер срывает снег с гребней и уносит.
    const blow = ((gust - WIND_BLOW) / 120) * dt * 3;
    for (let k = 0; k < 3; k++) {
      const i = (Math.random() * d.n) | 0;
      const a = Math.min(d.snow[i], blow * d.max);
      if (a <= 0.01) continue;
      d.snow[i] -= a;
      d.shed += a;
      if (d.shed >= SHED_CHUNK) {
        d.shed -= SHED_CHUNK;
        spawn(d.left + i, d.boxTop + d.top[i] - d.snow[i], world.wind * rand(0.6, 1), rand(-25, 15), rand(0.8, 1.6), rand(0.8, 1.6));
      }
    }
  }
  const m = world.mouse;
  const mx = m.x - d.left;
  if (mx > -MOUSE_SHED_RADIUS && mx < d.n + MOUSE_SHED_RADIUS && m.y > d.boxTop - 40 && m.y < d.boxTop + d.fs * 1.6 + 20) {
    // Курсор сбивает снег: чем быстрее ведут мышь, тем сильнее.
    const speed = Math.hypot(m.vx, m.vy);
    const strength = (0.25 + Math.min(speed / 500, 1)) * dt * 5;
    for (let i = Math.max(0, Math.floor(mx - MOUSE_SHED_RADIUS)); i < Math.min(d.n, mx + MOUSE_SHED_RADIUS); i++) {
      const w = (1 - Math.abs(i - mx) / MOUSE_SHED_RADIUS) ** 2;
      const a = d.snow[i] * Math.min(1, strength * w);
      if (a <= 0.005) continue;
      d.snow[i] -= a;
      d.shed += a;
      if (d.shed >= SHED_CHUNK) {
        d.shed -= SHED_CHUNK;
        spawn(d.left + i, d.boxTop + d.top[i] - d.snow[i], m.vx * 0.15 + rand(-45, 45), -rand(25, 95), rand(0.9, 1.9), rand(0.8, 1.5));
      }
    }
  }
}

function stepGround(dt: number) {
  const n = ground.length;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < n - 1; i++) {
      const diff = ground[i] - ground[i + 1];
      if (Math.abs(diff) > GROUND_REPOSE) {
        const t = (Math.abs(diff) - GROUND_REPOSE) * 0.25;
        if (diff > 0) {
          ground[i] -= t;
          ground[i + 1] += t;
        } else {
          ground[i + 1] -= t;
          ground[i] += t;
        }
      }
    }
  }
  // Сглаживание: гребень становится плавным, как у настоящего сугроба.
  for (let i = 0; i < n; i++) {
    const l = ground[Math.max(0, i - 1)];
    const r = ground[Math.min(n - 1, i + 1)];
    groundTmp[i] = ground[i] + ((l + r) / 2 - ground[i]) * GROUND_SMOOTH;
  }
  ground.set(groundTmp);
  const gust = Math.abs(world.wind);
  if (gust > WIND_BLOW) {
    // Порыв срывает снег с гребней сугроба.
    const blow = ((gust - WIND_BLOW) / 100) * dt * 6;
    for (let k = 0; k < 6; k++) {
      const i = (Math.random() * n) | 0;
      const a = Math.min(ground[i], blow);
      if (a < 0.05) continue;
      ground[i] -= a;
      spawn(i * GROUND_STEP, viewH - ground[i], world.wind * rand(0.5, 1), -rand(10, 60), rand(1, 2.2), rand(0.9, 1.8));
    }
  }
}

function stepParticles(dt: number) {
  const drag = Math.exp(-AIR_DRAG * dt);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vx = p.vx * drag + world.wind * 0.35 * dt;
    p.vy = p.vy * drag + GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0 || p.y > viewH + 10) particles.splice(i, 1);
  }
}

export function stepWorld(dt: number, now: number) {
  time += dt;
  refreshRects(now);
  for (const d of active) stepDrift(d, dt);
  stepGround(dt);
  stepParticles(dt);
}

/* ---------- рисование ---------- */

const RIM = "rgba(105, 155, 220, 0.8)";

function drawDrift(ctx: CanvasRenderingContext2D, d: Drift) {
  const { n, top, snow, left, boxTop } = d;
  let i = 0;
  while (i < n) {
    while (i < n && snow[i] < 0.35) i++;
    const a = i;
    while (i < n && snow[i] >= 0.35) i++;
    const b = i - 1;
    if (b - a < 1) continue;
    ctx.beginPath();
    ctx.moveTo(left + a, boxTop + top[a] + 2);
    for (let x = a; x <= b; x++) ctx.lineTo(left + x + 0.5, boxTop + top[x] - snow[x]);
    for (let x = b; x >= a; x--) ctx.lineTo(left + x + 0.5, boxTop + top[x] + 2);
    ctx.closePath();
    ctx.fillStyle = "#f6fbff";
    ctx.fill();
    ctx.strokeStyle = RIM;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Сосульки под буквами.
  if (d.icicles.length) {
    ctx.fillStyle = "#e8f4ff";
    ctx.strokeStyle = RIM;
    ctx.lineWidth = 0.8;
    for (const ic of d.icicles) {
      const bx = left + ic.x;
      const by = boxTop + d.bot[Math.round(ic.x)] - 1;
      ctx.beginPath();
      ctx.moveTo(bx - ic.w, by);
      ctx.lineTo(bx + ic.w, by);
      ctx.lineTo(bx, by + ic.len);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // Блестки на снегу.
  ctx.fillStyle = "#fff";
  for (let k = 0; k < Math.min(8, Math.round(n / 24)); k++) {
    const x = ((k * 53 + d.level * 17) % n) | 0;
    if (snow[x] < 0.8) continue;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 3 + k * 1.7);
    ctx.fillRect(left + x, boxTop + top[x] - snow[x] * 0.7, 1.6, 1.6);
  }
  ctx.globalAlpha = 1;
}

function drawGround(ctx: CanvasRenderingContext2D) {
  const n = ground.length;
  let any = false;
  for (let i = 0; i < n; i++) {
    if (ground[i] > 0.4) {
      any = true;
      break;
    }
  }
  if (!any) return;
  const g = ctx.createLinearGradient(0, viewH - groundMax, 0, viewH);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.5, "#eef6ff");
  g.addColorStop(1, "#c9def4");
  ctx.beginPath();
  ctx.moveTo(0, viewH + 2);
  for (let i = 0; i < n; i++) ctx.lineTo(i * GROUND_STEP, viewH - ground[i]);
  ctx.lineTo(viewW + GROUND_STEP, viewH + 2);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  // Светлая кромка по гребню и блёстки, чтобы сугроб был виден и на светлых страницах.
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const y = viewH - ground[i];
    if (i === 0) ctx.moveTo(0, y);
    else ctx.lineTo(i * GROUND_STEP, y);
  }
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  for (let k = 0; k < 24; k++) {
    const i = Math.floor(((k * 97) % 1000) / 1000 * n);
    if (ground[i] < 3) continue;
    ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, Math.sin(time * 2.6 + k * 2.3));
    ctx.fillRect(i * GROUND_STEP, viewH - ground[i] + 2 + (k % 3) * 2, 1.8, 1.8);
  }
  ctx.globalAlpha = 1;
}

export function drawWorld(ctx: CanvasRenderingContext2D) {
  drawGround(ctx);
  for (const d of active) drawDrift(ctx, d);
  if (particles.length) {
    ctx.fillStyle = "#f8fcff";
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life / (p.max * 0.5)) * 0.95;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
