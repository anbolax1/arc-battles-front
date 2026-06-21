"use client";

import * as React from "react";
import type { CSSProperties, PointerEvent as RPointerEvent } from "react";
import type { LiveState, OverlayBg, OverlayLayout, OverlayPreset, WidgetInstance, WidgetType } from "@/lib/types";
import { api } from "@/lib/api";
import { STAGE_W, STAGE_H } from "@/components/overlay/overlay-stage";
import { DEFAULT_LAYOUT, makeWidget } from "@/components/overlay/default-layout";
import { WIDGET_LABELS, WIDGET_ORDER, WIDGET_REGISTRY } from "@/components/overlay/widgets/registry";

const DEFAULT_PAD = 48; // отступ от края при выравнивании, px сцены (по умолчанию)
const SNAP = 10; // порог прилипания, px сцены
const CLICK_SLOP = 3; // экранных px: меньше — это клик-выбор (не двигаем и не снимаем привязку), больше — таскание

type AnchorPos = "tl" | "tc" | "tr" | "ml" | "c" | "mr" | "bl" | "bc" | "br";
const ANCHOR_GRID: AnchorPos[] = ["tl", "tc", "tr", "ml", "c", "mr", "bl", "bc", "br"];
const ANCHOR_TITLE: Record<AnchorPos, string> = {
  tl: "сверху-слева", tc: "сверху-центр", tr: "сверху-справа",
  ml: "слева", c: "центр", mr: "справа",
  bl: "снизу-слева", bc: "снизу-центр", br: "снизу-справа",
};

type Guide = { axis: "v" | "h"; pos: number };
type DragState = {
  id: string;
  mode: "move" | "resize";
  dir?: string;
  z: number;
  ws: number;
  px: number;
  py: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  cx: number;
  cy: number;
  cw: number;
  ch: number;
  cScale: number;
  moved: boolean; // указатель реально сдвинулся > CLICK_SLOP → это таскание, а не клик-выбор
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** 8 квадратных ручек ресайза (углы + середины кромок). Не полосы — иначе при
    мелком масштабе превью они перекрывают центр и мешают перетаскиванию; так центр
    виджета всегда остаётся зоной перемещения. */
function ResizeHandles({ scaleFactor, onStart }: { scaleFactor: number; onStart: (dir: string, e: RPointerEvent<HTMLDivElement>) => void }) {
  const hs = 12 / scaleFactor; // ~12 экранных px
  const half = hs / 2;
  const base: CSSProperties = { position: "absolute", width: hs, height: hs, background: "var(--accent)", border: "1px solid rgba(0,0,0,0.4)", touchAction: "none", zIndex: 6 };
  const knobs: Array<[string, CSSProperties, string]> = [
    ["nw", { top: -half, left: -half }, "nwse-resize"],
    ["n", { top: -half, left: "50%", marginLeft: -half }, "ns-resize"],
    ["ne", { top: -half, right: -half }, "nesw-resize"],
    ["e", { top: "50%", marginTop: -half, right: -half }, "ew-resize"],
    ["se", { bottom: -half, right: -half }, "nwse-resize"],
    ["s", { bottom: -half, left: "50%", marginLeft: -half }, "ns-resize"],
    ["sw", { bottom: -half, left: -half }, "nesw-resize"],
    ["w", { top: "50%", marginTop: -half, left: -half }, "ew-resize"],
  ];
  return (
    <>
      {knobs.map(([dir, style, cursor]) => (
        <div key={dir} onPointerDown={(e) => onStart(dir, e)} style={{ ...base, cursor, ...style }} />
      ))}
    </>
  );
}

/** Типы виджетов, у которых есть заголовок/подпись (для тумблера «Заголовок»). */
const HAS_TITLE = new Set<string>(["roundTasks", "bonusTasks", "standings", "complications", "round"]);

/** Аккуратный switch вместо чекбокса. Кругляш позиционируется явным `left` внутри
    дорожки (box-border + p-0), чтобы не вылезал за границу. */
function Switch({ on, onChange, title }: { on: boolean; onChange: (v: boolean) => void; title?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={title}
      onClick={() => onChange(!on)}
      className={`relative box-border h-5 w-9 flex-none rounded-full border-0 p-0 transition-colors ${on ? "bg-[var(--primary)]" : "bg-[var(--border-strong)]"}`}
    >
      <span
        className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow transition-all"
        style={{ left: on ? "calc(100% - 1rem)" : "0.125rem" }}
      />
    </button>
  );
}

/** Строка настройки: фикс-лейбл слева + контрол справа (стабильная сетка, без сдвигов). */
function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[1.75rem] items-center gap-3">
      <span className="w-16 flex-none text-xs text-muted">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  );
}

function uid(type: string, existing: WidgetInstance[]): string {
  let i = 1;
  let id = `${type}-${i}`;
  while (existing.some((w) => w.id === id)) {
    i += 1;
    id = `${type}-${i}`;
  }
  return id;
}

/** Визуальный редактор раскладки оверлея. Перетаскивание — собственная реализация
    на pointer-событиях (масштаб сцены учитываем сами → дельта всегда корректна), с
    прилипанием к краям/центру сцены и к ДРУГИМ виджетам (видимые гайд-линии). Плюс
    видимость/замок/порядок, фон вкл-выкл + прозрачность, размер и ширина, якоря,
    добавление/удаление. Пишет в общий OverlayLayout через onChange — превью и
    /overlay обновляются тем же документом. */
export function OverlayEditor({
  state,
  layout,
  onChange,
  onClose,
  bgImage = null,
  tid,
}: {
  state: LiveState;
  layout: OverlayLayout;
  onChange: (next: OverlayLayout) => void;
  onClose: () => void;
  /** Подложка-геймплей (с HUD) под сценой редактора — для оценки читаемости. */
  bgImage?: string | null;
  /** Id турнира — чтобы запоминать выбранный пресет per-tournament в localStorage. */
  tid?: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const targets = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const dragRef = React.useRef<DragState | null>(null);
  const [scale, setScale] = React.useState(0);
  const [box, setBox] = React.useState({ w: 0, h: 0 }); // размер контейнера сцены (для центровки)
  const [selId, setSelId] = React.useState<string>(layout.widgets[0]?.id ?? "");
  const [guides, setGuides] = React.useState<Guide[]>([]);
  const [addOpen, setAddOpen] = React.useState(false);
  const [fs, setFs] = React.useState(false); // полноэкранный режим редактора
  // Пресеты (общие шаблоны раскладки, хранятся на сервере).
  const [presets, setPresets] = React.useState<OverlayPreset[]>([]);
  // Запоминаем выбранный в селекторе пресет (per-tournament) в localStorage и сразу
  // восстанавливаем его при открытии редактора — иначе после перезахода селектор пуст,
  // хотя сама раскладка из пресета уже подгружена. tid фиксирован на время монтирования
  // (родитель ремонтит редактор по key={tid}), поэтому ключ читаем один раз при init.
  const presetKey = tid ? `rsp_preset_${tid}` : "rsp_preset_global";
  const [presetSel, setPresetSel] = React.useState<string>(() => {
    try {
      return localStorage.getItem(presetKey) ?? "";
    } catch {
      return "";
    }
  });
  const [presetName, setPresetName] = React.useState("");
  const [presetBusy, setPresetBusy] = React.useState(false);
  const [presetMsg, setPresetMsg] = React.useState("");

  React.useEffect(() => {
    let active = true;
    api
      .get<OverlayPreset[]>("/overlay/presets")
      .then((list) => {
        if (!active) return;
        setPresets(list);
        // Сохранённый выбор мог указывать на удалённый пресет — тогда сбрасываем.
        setPresetSel((cur) => (cur && !list.some((p) => p.id === cur) ? "" : cur));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Пишем выбор в localStorage (только внешний эффект, без setState) — переживает перезаход.
  React.useEffect(() => {
    try {
      if (presetSel) localStorage.setItem(presetKey, presetSel);
      else localStorage.removeItem(presetKey);
    } catch {
      /* localStorage недоступен — не критично */
    }
  }, [presetSel, presetKey]);

  const byId = React.useCallback((id: string) => layout.widgets.find((w) => w.id === id), [layout.widgets]);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setBox({ w: r.width, h: r.height });
      setScale(Math.min(r.width / STAGE_W, r.height / STAGE_H) || 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fs]);

  // Esc — выйти из полноэкранного режима.
  React.useEffect(() => {
    if (!fs) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFs(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fs]);

  const setRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) targets.current.set(id, el);
    else targets.current.delete(id);
  };

  const ordered = [...layout.widgets].sort((a, b) => a.z - b.z);
  const sel = byId(selId) ?? null;
  const maxZ = layout.widgets.reduce((m, w) => Math.max(m, w.z), 0);
  const pad = layout.pad ?? DEFAULT_PAD; // текущий отступ края (px сцены)
  // Какой квадрат «К краю» подсветить у выбранного виджета: жёсткий anchor, если задан,
  // иначе — ближайший якорь по факту положения (виджет «у этого края», но не закреплён).
  const selNear = sel && !sel.anchor ? nearestAnchor(sel) : null;

  function patch(id: string, p: Partial<WidgetInstance>) {
    onChange({ ...layout, widgets: layout.widgets.map((w) => (w.id === id ? { ...w, ...p } : w)) });
  }
  function patchBg(id: string, p: Partial<OverlayBg>) {
    const w = byId(id);
    if (w) patch(id, { bg: { ...w.bg, ...p } });
  }
  function remove(id: string) {
    onChange({ ...layout, widgets: layout.widgets.filter((w) => w.id !== id) });
    targets.current.delete(id);
    if (selId === id) setSelId("");
  }
  function add(type: WidgetType) {
    const id = uid(type, layout.widgets);
    const wide = type === "scoreboard" || type === "complications" || type === "standings";
    const w = makeWidget(id, type, { x: 0.4, y: 0.4, z: maxZ + 1, ...(wide ? { w: 0.3 } : {}) });
    onChange({ ...layout, widgets: [...layout.widgets, w] });
    setSelId(id);
    setAddOpen(false);
  }
  function raise(id: string, dir: 1 | -1) {
    patch(id, { z: Math.max(0, (byId(id)?.z ?? 0) + dir) });
  }
  // Размер виджета в долях сцены по факту измеренного бокса (с учётом scale).
  function widgetFrac(w: WidgetInstance): { ww: number; hh: number } {
    const el = targets.current.get(w.id);
    const ww = ((el?.offsetWidth ?? (w.w ? w.w * STAGE_W : 340)) * w.scale) / STAGE_W;
    const hh = ((el?.offsetHeight ?? 130) * w.scale) / STAGE_H;
    return { ww, hh };
  }
  // Ближайший из 9 якорей по положению центра виджета — чтобы подсвечивать «К краю»
  // даже когда виджет не закреплён (anchor === ""), напр. после перетаскивания. Размер
  // берём из сохранённых долей (без обращения к DOM — расчёт идёт во время рендера);
  // для авторазмерных виджетов — те же дефолты, что и в widgetFrac. Точность тут грубая
  // (трети сцены), поэтому отсутствие точного замера не важно.
  function nearestAnchor(w: WidgetInstance): AnchorPos {
    const sc = w.scale || 1;
    const ww = (w.w ?? 340 / STAGE_W) * sc;
    const hh = (w.h ?? 130 / STAGE_H) * sc;
    const cx = w.x + ww / 2;
    const cy = w.y + hh / 2;
    const col = cx < 1 / 3 ? 0 : cx < 2 / 3 ? 1 : 2;
    const row = cy < 1 / 3 ? 0 : cy < 2 / 3 ? 1 : 2;
    return ANCHOR_GRID[row * 3 + col];
  }
  // Позиция (доли x,y) для привязки к краю pos при отступе padPx (px сцены),
  // с учётом фактического размера виджета. Центр (c/tc/bc/ml/mr) от отступа не зависит.
  function posForAnchor(w: WidgetInstance, pos: AnchorPos, padPx: number): { x: number; y: number } {
    const { ww, hh } = widgetFrac(w);
    const px = padPx / STAGE_W;
    const py = padPx / STAGE_H;
    const xs = { l: px, c: (1 - ww) / 2, r: 1 - px - ww };
    const ys = { t: py, m: (1 - hh) / 2, b: 1 - py - hh };
    const m: Record<AnchorPos, [number, number]> = {
      tl: [xs.l, ys.t], tc: [xs.c, ys.t], tr: [xs.r, ys.t],
      ml: [xs.l, ys.m], c: [xs.c, ys.m], mr: [xs.r, ys.m],
      bl: [xs.l, ys.b], bc: [xs.c, ys.b], br: [xs.r, ys.b],
    };
    return { x: clamp01(m[pos][0]), y: clamp01(m[pos][1]) };
  }
  function anchor(id: string, pos: AnchorPos) {
    const w = byId(id);
    if (!w) return;
    const { x, y } = posForAnchor(w, pos, pad);
    patch(id, { x, y, anchor: pos }); // запоминаем привязку → сдвинется при смене отступа
  }
  // Глобальный отступ: меняем pad и СДВИГАЕМ все привязанные к краю виджеты.
  function setPad(padPx: number) {
    const widgets = layout.widgets.map((w) => {
      if (!w.anchor) return w;
      const { x, y } = posForAnchor(w, w.anchor as AnchorPos, padPx);
      return { ...w, x, y };
    });
    onChange({ ...layout, pad: padPx, widgets });
  }
  function reset() {
    onChange(JSON.parse(JSON.stringify(DEFAULT_LAYOUT)) as OverlayLayout);
    setSelId(DEFAULT_LAYOUT.widgets[0]?.id ?? "");
  }

  // ── Пресеты (общие шаблоны раскладки) ────────────────────────────────────
  function applyPreset() {
    const p = presets.find((x) => x.id === presetSel);
    if (p && p.layout && Array.isArray(p.layout.widgets)) {
      onChange(JSON.parse(JSON.stringify(p.layout)) as OverlayLayout);
      setSelId(p.layout.widgets[0]?.id ?? "");
      setPresetMsg(`Загружен «${p.name}»`);
    }
  }
  async function saveNewPreset() {
    const name = presetName.trim();
    if (!name) return;
    setPresetBusy(true);
    setPresetMsg("");
    try {
      const p = await api.post<OverlayPreset>("/overlay/presets", { name, layout });
      setPresets((xs) => [...xs, p]);
      setPresetSel(p.id);
      setPresetName("");
      setPresetMsg(`Сохранён «${p.name}»`);
    } catch {
      setPresetMsg("Не удалось сохранить пресет.");
    } finally {
      setPresetBusy(false);
    }
  }
  async function overwritePreset() {
    const p = presets.find((x) => x.id === presetSel);
    if (!p) return;
    setPresetBusy(true);
    setPresetMsg("");
    try {
      const u = await api.put<OverlayPreset>(`/overlay/presets/${p.id}`, { name: p.name, layout });
      setPresets((xs) => xs.map((x) => (x.id === u.id ? u : x)));
      setPresetMsg(`Обновлён «${u.name}»`);
    } catch {
      setPresetMsg("Не удалось обновить пресет.");
    } finally {
      setPresetBusy(false);
    }
  }
  async function deletePreset() {
    const p = presets.find((x) => x.id === presetSel);
    if (!p) return;
    setPresetBusy(true);
    setPresetMsg("");
    try {
      await api.del(`/overlay/presets/${p.id}`);
      setPresets((xs) => xs.filter((x) => x.id !== p.id));
      setPresetSel("");
      setPresetMsg(`Удалён «${p.name}»`);
    } catch {
      setPresetMsg("Не удалось удалить пресет.");
    } finally {
      setPresetBusy(false);
    }
  }
  function setStageBg(p: Partial<OverlayBg>) {
    onChange({ ...layout, stageBg: { ...layout.stageBg, ...p } });
  }

  // ── Перетаскивание и ресайз (собственные, со снапом; устойчивы к zoom сцены) ──
  // Видимый бокс виджета в px сцены через getBoundingClientRect/zoom — не зависит
  // от того, как именно zoom влияет на offsetWidth в конкретной версии Chrome.
  function visBox(el: HTMLElement | null | undefined, z: number) {
    if (!el) return { w: 200, h: 80 };
    const r = el.getBoundingClientRect();
    return { w: r.width / z, h: r.height / z };
  }

  function snapMove(nx: number, ny: number, wpx: number, hpx: number, id: string, z: number) {
    const vs = [0, STAGE_W / 2, STAGE_W];
    const hs = [0, STAGE_H / 2, STAGE_H];
    for (const w of layout.widgets) {
      if (w.id === id || !w.visible) continue;
      const v = visBox(targets.current.get(w.id), z);
      const ox = w.x * STAGE_W;
      const oy = w.y * STAGE_H;
      vs.push(ox, ox + v.w / 2, ox + v.w);
      hs.push(oy, oy + v.h / 2, oy + v.h);
    }
    const g: Guide[] = [];
    let bv: { d: number; nx: number; line: number } | null = null;
    for (const line of vs) {
      for (const [edge, off] of [[nx, 0], [nx + wpx / 2, wpx / 2], [nx + wpx, wpx]] as const) {
        const d = Math.abs(edge - line);
        if (d <= SNAP && (!bv || d < bv.d)) bv = { d, nx: line - off, line };
      }
    }
    if (bv) { nx = bv.nx; g.push({ axis: "v", pos: bv.line }); }
    let bh: { d: number; ny: number; line: number } | null = null;
    for (const line of hs) {
      for (const [edge, off] of [[ny, 0], [ny + hpx / 2, hpx / 2], [ny + hpx, hpx]] as const) {
        const d = Math.abs(edge - line);
        if (d <= SNAP && (!bh || d < bh.d)) bh = { d, ny: line - off, line };
      }
    }
    if (bh) { ny = bh.ny; g.push({ axis: "h", pos: bh.line }); }
    return { nx, ny, guides: g };
  }

  // Драг ведём через window-листенеры (а не setPointerCapture) — надёжно при zoom.
  function startDrag(w: WidgetInstance, mode: "move" | "resize", dir: string | undefined, px: number, py: number) {
    if (w.locked) return;
    const z = scale || 1;
    const ws = w.scale || 1;
    const v = visBox(targets.current.get(w.id), z); // видимый бокс = бокс × ws
    const sw = w.w ? w.w * STAGE_W : v.w / ws; // бокс в px сцены (без множителя ws)
    const sh = w.h ? w.h * STAGE_H : v.h / ws;
    const st: DragState = {
      id: w.id, mode, dir, z, ws,
      px, py, sx: w.x * STAGE_W, sy: w.y * STAGE_H, sw, sh,
      cx: w.x * STAGE_W, cy: w.y * STAGE_H, cw: sw, ch: sh, cScale: ws,
      moved: false,
    };
    dragRef.current = st;
    const move = (ev: PointerEvent) => dragMove(ev, st);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      dragEnd(st);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  function beginMove(e: RPointerEvent<HTMLDivElement>, w: WidgetInstance) {
    if (w.locked) return;
    e.preventDefault();
    setSelId(w.id);
    startDrag(w, "move", undefined, e.clientX, e.clientY);
  }
  function beginResize(e: RPointerEvent<HTMLDivElement>, w: WidgetInstance, dir: string) {
    if (w.locked) return;
    e.preventDefault();
    e.stopPropagation();
    setSelId(w.id);
    startDrag(w, "resize", dir, e.clientX, e.clientY);
  }
  function dragMove(ev: PointerEvent, st: DragState) {
    if (!st.moved) {
      if (Math.hypot(ev.clientX - st.px, ev.clientY - st.py) < CLICK_SLOP) return; // ещё в пределах клика
      st.moved = true; // вышли за порог → это таскание, можно двигать/снимать привязку
    }
    const { z, ws } = st;
    const el = targets.current.get(st.id);
    if (st.mode === "move") {
      const visW = st.sw * ws;
      const visH = st.sh * ws;
      let nx = st.sx + (ev.clientX - st.px) / z;
      let ny = st.sy + (ev.clientY - st.py) / z;
      const s = snapMove(nx, ny, visW, visH, st.id, z);
      nx = Math.max(0, Math.min(STAGE_W - visW, s.nx));
      ny = Math.max(0, Math.min(STAGE_H - visH, s.ny));
      st.cx = nx;
      st.cy = ny;
      setGuides(s.guides);
      if (el) el.style.transform = `translate(${nx}px, ${ny}px)${ws !== 1 ? ` scale(${ws})` : ""}`;
    } else {
      const dir = st.dir ?? "";
      const Dx = (ev.clientX - st.px) / z; // визуальная дельта, px сцены
      const Dy = (ev.clientY - st.py) / z;
      if (dir.length === 2) {
        // УГОЛ → масштаб всего виджета (пропорционально, вместе со шрифтом).
        // Якорь — верх-левый угол (x,y не меняются); рост по диагонали видимого бокса.
        const dW = dir.includes("e") ? Dx : -Dx;
        const dH = dir.includes("s") ? Dy : -Dy;
        const startVisW = st.sw * st.ws;
        const startVisH = st.sh * st.ws;
        const newVisW = Math.max(24, startVisW + dW);
        const newVisH = Math.max(24, startVisH + dH);
        const startDiag = Math.hypot(startVisW, startVisH) || 1;
        const ns = Math.max(0.5, Math.min(3, st.ws * (Math.hypot(newVisW, newVisH) / startDiag)));
        st.cScale = ns;
        if (el) el.style.transform = `translate(${st.sx}px, ${st.sy}px)${ns !== 1 ? ` scale(${ns})` : ""}`;
      } else {
        // КРАЙ → ширина/высота коробки (текст переносится; форма — напр. квадрат).
        let nx = st.sx;
        let ny = st.sy;
        let nw = st.sw;
        let nh = st.sh;
        if (dir.includes("e")) nw = st.sw + Dx / ws;
        if (dir.includes("w")) { nx = st.sx + Dx; nw = st.sw - Dx / ws; }
        if (dir.includes("s")) nh = st.sh + Dy / ws;
        if (dir.includes("n")) { ny = st.sy + Dy; nh = st.sh - Dy / ws; }
        nw = Math.max(40, nw);
        nh = Math.max(30, nh);
        st.cx = nx;
        st.cy = ny;
        st.cw = nw;
        st.ch = nh;
        if (el) {
          el.style.width = `${nw}px`;
          el.style.height = `${nh}px`;
          el.style.transform = `translate(${nx}px, ${ny}px)${ws !== 1 ? ` scale(${ws})` : ""}`;
        }
      }
    }
  }
  function dragEnd(st: DragState) {
    dragRef.current = null;
    setGuides([]);
    if (!st.moved) return; // чистый клик-выбор: не двигали → не трогаем позицию/размер/привязку
    // Ручное перемещение/ресайз снимает привязку к краю — виджет становится «свободным»
    // (иначе при смене отступа он бы прыгнул обратно к краю).
    if (st.mode === "move") {
      patch(st.id, { x: clamp01(st.cx / STAGE_W), y: clamp01(st.cy / STAGE_H), anchor: "" });
    } else if (st.dir && st.dir.length === 2) {
      patch(st.id, { scale: st.cScale, anchor: "" }); // угол → масштаб
    } else {
      patch(st.id, { x: clamp01(st.cx / STAGE_W), y: clamp01(st.cy / STAGE_H), w: clamp01(st.cw / STAGE_W), h: clamp01(st.ch / STAGE_H), anchor: "" });
    }
  }

  const selLockedWidth = sel?.w ?? 0.3;
  const selLockedHeight = sel?.h ?? 0.15;
  // Центрируем сцену в контейнере (для полноэкранного режима — letterbox по краям).
  const offX = Math.max(0, (box.w - STAGE_W * scale) / 2);
  const offY = Math.max(0, (box.h - STAGE_H * scale) / 2);
  const GRID =
    "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)";

  const stagePane = (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden rounded-lg bg-black/60 ${fs ? "h-full w-full" : "border border-[var(--border)]"}`}
      style={fs ? undefined : { aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
    >
        <div
          ref={stageRef}
          style={{
            width: STAGE_W,
            height: STAGE_H,
            position: "absolute",
            top: offY,
            left: offX,
            // zoom (а не transform: scale) — резкий текст при даунскейле сцены.
            zoom: scale,
            opacity: scale > 0 ? 1 : 0,
            backgroundImage: GRID,
            backgroundSize: "40px 40px",
            ...(layout.accent ? ({ "--primary": layout.accent } as CSSProperties) : {}),
          }}
        >
          {bgImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bgImage} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          )}
          {layout.stageBg.on && (
            <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${layout.stageBg.opacity})` }} aria-hidden />
          )}
          {ordered.map((w) => {
            const Cmp = WIDGET_REGISTRY[w.type];
            if (!Cmp) return null;
            const selected = w.id === selId;
            return (
              <div
                key={w.id}
                ref={setRef(w.id)}
                onPointerDown={(e) => beginMove(e, w)}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transform: `translate(${w.x * STAGE_W}px, ${w.y * STAGE_H}px)${w.scale !== 1 ? ` scale(${w.scale})` : ""}`,
                  transformOrigin: "top left",
                  width: w.w ? w.w * STAGE_W : undefined,
                  height: w.h ? w.h * STAGE_H : undefined,
                  zIndex: w.z,
                  opacity: w.visible ? 1 : 0.35,
                  outline: selected ? "2px solid var(--accent)" : "1px dashed rgba(255,255,255,0.28)",
                  outlineOffset: 2,
                  cursor: w.locked ? "default" : "move",
                  touchAction: "none",
                }}
              >
                <div style={{ pointerEvents: "none", width: "100%", height: "100%" }}>
                  <Cmp state={state} instance={w} />
                </div>
                {selected && !w.locked && scale > 0 && (
                  <ResizeHandles scaleFactor={scale * (w.scale || 1)} onStart={(dir, e) => beginResize(e, w, dir)} />
                )}
              </div>
            );
          })}

          {guides.map((g, i) =>
            g.axis === "v" ? (
              <div key={`v${i}`} style={{ position: "absolute", left: g.pos, top: 0, width: 2, height: STAGE_H, background: "var(--accent)", pointerEvents: "none", zIndex: 9999 }} />
            ) : (
              <div key={`h${i}`} style={{ position: "absolute", top: g.pos, left: 0, height: 2, width: STAGE_W, background: "var(--accent)", pointerEvents: "none", zIndex: 9999 }} />
            ),
          )}
        </div>
    </div>
  );

  const controls = (
    <>
      {/* Пресеты — общие шаблоны раскладки (сохранить/переключать) */}
      <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted">Пресеты</span>
          <select className="select max-w-[12rem] flex-1" value={presetSel} onChange={(e) => setPresetSel(e.target.value)}>
            <option value="">— выбрать —</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-cyan btn-sm" disabled={!presetSel || presetBusy} onClick={applyPreset}>
            <span>Загрузить</span>
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={!presetSel || presetBusy} onClick={overwritePreset} title="перезаписать выбранный пресет текущей раскладкой">
            <span>Перезаписать</span>
          </button>
          <button type="button" className="btn btn-ghost btn-sm text-danger" disabled={!presetSel || presetBusy} onClick={deletePreset}>
            <span>Удалить</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input max-w-[12rem] flex-1"
            placeholder="имя нового пресета"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void saveNewPreset();
              }
            }}
          />
          <button type="button" className="btn btn-primary btn-sm" disabled={!presetName.trim() || presetBusy} onClick={saveNewPreset}>
            <span>Сохранить как новый</span>
          </button>
          {presetMsg && <span className="text-xs text-accent">{presetMsg}</span>}
        </div>
      </div>

      {/* Тулбар */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
          <span>Готово</span>
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFs((v) => !v)} title="редактировать крупно">
          <span>{fs ? "⤢ Свернуть" : "⛶ На весь экран"}</span>
        </button>
        <div className="relative">
          <button type="button" className="btn btn-cyan btn-sm" onClick={() => setAddOpen((v) => !v)}>
            <span>+ Виджет</span>
          </button>
          {addOpen && (
            <div className="absolute z-20 mt-1 w-44 rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
              {WIDGET_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="block w-full px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]"
                  onClick={() => add(t)}
                >
                  {WIDGET_LABELS[t]}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
          <span>Сбросить макет</span>
        </button>

        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted" title="отступ от края при выравнивании; двигает все привязанные к краю виджеты">
          отступ края
          <input
            type="range"
            min={0}
            max={160}
            step={2}
            value={pad}
            onChange={(e) => setPad(Number(e.target.value))}
            className="w-24 accent-[var(--primary)]"
            aria-label="отступ от края"
          />
          <span className="w-9 text-right tnum">{Math.round(pad)}px</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={layout.stageBg.on} onChange={(e) => setStageBg({ on: e.target.checked })} />
          фон сцены
        </label>
        {layout.stageBg.on && (
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={layout.stageBg.opacity}
            onChange={(e) => setStageBg({ opacity: Number(e.target.value) })}
            className="w-24 accent-[var(--primary)]"
            aria-label="прозрачность фона сцены"
          />
        )}
        <label className="flex items-center gap-1.5 text-xs text-muted" title="акцентный цвет">
          акцент
          <input
            type="color"
            value={layout.accent ?? "#ff6a1a"}
            onChange={(e) => onChange({ ...layout, accent: e.target.value })}
            className="h-6 w-8 cursor-pointer rounded border border-[var(--border)] bg-transparent p-0"
          />
        </label>
      </div>

      {/* Контролы выбранного виджета */}
      {sel && (
        <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
          {/* Шапка: имя + видимость/замок/удалить */}
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
            <span className="font-display text-sm uppercase">{WIDGET_LABELS[sel.type]}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title={sel.visible ? "скрыть" : "показать"}
                onClick={() => patch(sel.id, { visible: !sel.visible })}
                className={`rounded px-1.5 py-0.5 text-sm hover:bg-[var(--surface)] ${sel.visible ? "" : "opacity-40"}`}
              >
                👁
              </button>
              <button
                type="button"
                title={sel.locked ? "разблокировать" : "заблокировать (нельзя двигать)"}
                onClick={() => patch(sel.id, { locked: !sel.locked })}
                className={`rounded px-1.5 py-0.5 text-sm hover:bg-[var(--surface)] ${sel.locked ? "" : "opacity-40"}`}
              >
                {sel.locked ? "🔒" : "🔓"}
              </button>
              <button type="button" className="ml-1 text-xs text-muted hover:text-danger" onClick={() => remove(sel.id)}>
                Удалить
              </button>
            </div>
          </div>

          {/* Содержимое: текст (виджет «Текст») или URL картинки (виджет «Логотип») */}
          {sel.type === "text" && (
            <SettingRow label="Текст">
              <input
                className="input flex-1"
                value={typeof sel.props?.text === "string" ? sel.props.text : ""}
                onChange={(e) => patch(sel.id, { props: { ...sel.props, text: e.target.value } })}
                placeholder="Текст на оверлее (напр. ник кастера)"
              />
            </SettingRow>
          )}
          {sel.type === "logo" && (
            <SettingRow label="URL">
              <input
                className="input flex-1"
                value={typeof sel.props?.url === "string" ? sel.props.url : ""}
                onChange={(e) => patch(sel.id, { props: { ...sel.props, url: e.target.value } })}
                placeholder="https://… (ссылка на картинку/лого)"
              />
            </SettingRow>
          )}

          {/* Фон: тумблер + ползунок прозрачности (всегда на месте, гаснет при выключенном фоне) */}
          <SettingRow label="Фон">
            <Switch on={sel.bg.on} onChange={(v) => patchBg(sel.id, { on: v })} title="фон виджета" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sel.bg.opacity}
              disabled={!sel.bg.on}
              onChange={(e) => patchBg(sel.id, { opacity: Number(e.target.value) })}
              className={`flex-1 accent-[var(--primary)] ${sel.bg.on ? "" : "pointer-events-none opacity-30"}`}
              aria-label="прозрачность фона"
            />
            <span className="w-9 text-right text-xs text-muted tnum">{sel.bg.on ? `${Math.round(sel.bg.opacity * 100)}%` : "—"}</span>
          </SettingRow>

          {HAS_TITLE.has(sel.type) && (
            <SettingRow label="Заголовок">
              <Switch on={!sel.hideTitle} onChange={(v) => patch(sel.id, { hideTitle: !v })} title="показывать подпись/шапку виджета" />
              <span className="text-xs text-muted">{sel.hideTitle ? "скрыт" : "показан"}</span>
            </SettingRow>
          )}

          {sel.type === "complications" && (
            <SettingRow label="Плашка штрафа">
              <Switch on={!sel.hidePenalty} onChange={(v) => patch(sel.id, { hidePenalty: !v })} title="показывать «ШТРАФ ×N» при засчитанном штрафе" />
              <span className="text-xs text-muted">{sel.hidePenalty ? "скрыта" : "показана"}</span>
            </SettingRow>
          )}

          {sel.type === "scoreboard" && (
            <SettingRow label="Счёт за раунд">
              <Switch on={!!sel.showRoundScore} onChange={(v) => patch(sel.id, { showRoundScore: v })} title="показывать очки за текущий раунд в скобках у счёта" />
              <span className="text-xs text-muted">{sel.showRoundScore ? "в скобках" : "скрыт"}</span>
            </SettingRow>
          )}

          <SettingRow label="Размер">
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.05}
              value={sel.scale}
              onChange={(e) => patch(sel.id, { scale: Number(e.target.value) })}
              className="flex-1 accent-[var(--primary)]"
              title="то же, что тянуть за УГОЛ виджета"
            />
            <span className="w-9 text-right text-xs text-muted tnum">{Math.round(sel.scale * 100)}%</span>
          </SettingRow>

          <SettingRow label="Ширина">
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.01}
              value={selLockedWidth}
              onChange={(e) => patch(sel.id, { w: Number(e.target.value) })}
              className="flex-1 accent-[var(--primary)]"
              title="то же, что тянуть за СЕРЕДИНУ боковой стороны"
            />
            <span className="w-9 text-right text-xs text-muted tnum">{Math.round(selLockedWidth * 100)}%</span>
          </SettingRow>

          <SettingRow label="Высота">
            <input
              type="range"
              min={0.05}
              max={0.9}
              step={0.01}
              value={selLockedHeight}
              onChange={(e) => patch(sel.id, { h: Number(e.target.value) })}
              className="flex-1 accent-[var(--primary)]"
              title="то же, что тянуть за СЕРЕДИНУ верх/низ; пусто = по содержимому"
            />
            <span className="w-9 text-right text-xs text-muted tnum">{sel.h ? `${Math.round(selLockedHeight * 100)}%` : "авто"}</span>
          </SettingRow>

          <SettingRow label="Слой">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => raise(sel.id, 1)} title="выше">
              <span>↑ выше</span>
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => raise(sel.id, -1)} title="ниже">
              <span>↓ ниже</span>
            </button>
          </SettingRow>

          <SettingRow label="К краю">
            <div className="grid grid-cols-3 gap-1">
              {ANCHOR_GRID.map((a) => {
                const pinned = sel.anchor === a; // жёстко закреплён → залит
                const near = !sel.anchor && selNear === a; // просто у этого края → обведён
                return (
                  <button
                    key={a}
                    type="button"
                    title={ANCHOR_TITLE[a]}
                    onClick={() => anchor(sel.id, a)}
                    className={`h-5 w-5 rounded-sm border transition-colors hover:border-[var(--accent)] ${
                      pinned
                        ? "border-[var(--primary)] bg-[var(--primary)]"
                        : near
                          ? "border-[var(--accent)] bg-[var(--surface)] ring-1 ring-inset ring-[var(--accent)]"
                          : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                    }`}
                  />
                );
              })}
            </div>
            {sel.anchor ? (
              <span className="text-[0.7rem] text-muted">следует за отступом</span>
            ) : (
              selNear && <span className="text-[0.7rem] text-muted">у этого края (не закреплён)</span>
            )}
          </SettingRow>

          <p className="border-t border-[var(--border)] pt-2 text-[0.7rem] leading-snug text-muted">
            На макете: тяни за <span className="text-fg">угол</span> — масштаб всего виджета (со шрифтом); за <span className="text-fg">середину стороны</span> — ширина/высота коробки.
          </p>
        </div>
      )}

      {/* Слои */}
      <div className="rounded-lg border border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-3 py-1.5 text-xs uppercase tracking-wide text-muted">Слои</div>
        <ul className="max-h-48 overflow-auto">
          {[...layout.widgets]
            .sort((a, b) => b.z - a.z)
            .map((w) => (
              <li
                key={w.id}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm ${w.id === selId ? "bg-[var(--surface-2)]" : ""}`}
              >
                <button
                  type="button"
                  title={w.visible ? "скрыть" : "показать"}
                  onClick={() => patch(w.id, { visible: !w.visible })}
                  className={`flex-none ${w.visible ? "text-fg" : "text-muted"}`}
                >
                  {w.visible ? "👁" : "—"}
                </button>
                <button
                  type="button"
                  className={`min-w-0 flex-1 truncate text-left ${w.visible ? "" : "text-muted line-through"}`}
                  onClick={() => setSelId(w.id)}
                >
                  {WIDGET_LABELS[w.type]}
                </button>
                {w.locked && <span className="flex-none text-xs text-muted">🔒</span>}
              </li>
            ))}
        </ul>
      </div>
    </>
  );

  if (fs) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
          <span className="font-display text-sm uppercase">Редактор макета — на весь экран</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFs(false)}>
            <span>⤢ Свернуть (Esc)</span>
          </button>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 items-center justify-center p-4">{stagePane}</div>
          <div className="w-[380px] flex-none space-y-3 overflow-y-auto border-l border-[var(--border)] p-4">{controls}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {stagePane}
      {controls}
    </div>
  );
}
