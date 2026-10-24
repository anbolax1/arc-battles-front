"use client";

import * as React from "react";
import type { CSSProperties, PointerEvent as RPointerEvent } from "react";
import type { LiveState, OverlayBg, OverlayLayout, WidgetInstance, WidgetType } from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { STAGE_W, STAGE_H } from "@/components/overlay/overlay-stage";
import { DEFAULT_LAYOUT, makeWidget } from "@/components/overlay/default-layout";
import { PreviewBgLayer, PreviewBgSwitch, type PreviewBg } from "@/components/overlay/preview-bg";
import { accentVars } from "@/components/overlay/accent";
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
const HAS_TITLE = new Set<string>(["roundTasks", "bonusTasks", "tasksV2", "standings", "complications", "round", "chance"]);

/** Слои снизу вверх, как их рисует сцена: по z, а при равном z выше тот, кто позже в раскладке. */
function bottomUp(widgets: WidgetInstance[]): WidgetInstance[] {
  return widgets
    .map((w, i) => ({ w, i }))
    .sort((a, b) => a.w.z - b.w.z || a.i - b.i)
    .map((x) => x.w);
}

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

/** Группа настроек панели: подпись и содержимое. */
function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 border-t border-[var(--border)] pt-2.5">
      <div className="text-[0.65rem] uppercase tracking-[0.14em] text-muted">{title}</div>
      {children}
    </div>
  );
}

/** Что виджет показывает: одна кнопка-переключатель на настройку. */
type ShowOption = { key: string; label: string; title: string; on: boolean; patch: (on: boolean) => Partial<WidgetInstance> };

function showOptions(w: WidgetInstance): ShowOption[] {
  const out: ShowOption[] = [];
  if (HAS_TITLE.has(w.type)) {
    out.push({ key: "title", label: "Заголовок", title: "подпись или шапка виджета", on: !w.hideTitle, patch: (on) => ({ hideTitle: !on }) });
  }
  if (w.type === "scoreboard") {
    out.push(
      { key: "round", label: "Счёт за раунд", title: "очки за текущий раунд в скобках у счёта", on: !!w.showRoundScore, patch: (on) => ({ showRoundScore: on }) },
      { key: "mmr", label: "MMR", title: "текущий MMR сторон под ником", on: !!w.showMmr, patch: (on) => ({ showMmr: on }) },
      { key: "place", label: "Место в таблице", title: "место сторон в таблице сезона рядом с ником", on: !!w.showPlace, patch: (on) => ({ showPlace: on }) },
      { key: "belt", label: "Пояс", title: "значок пояса под ником носителя и «за пояс» по центру табло", on: !!w.showBelt, patch: (on) => ({ showBelt: on }) },
      { key: "chance", label: "Шанс на победу", title: "шанс сторон под счётом и шанс ничьей по центру табло", on: !!w.showChance, patch: (on) => ({ showChance: on }) },
      { key: "chanceBar", label: "Полоса шанса", title: "полоса под табло: доли сторон, их шансы по краям и шанс ничьей", on: !!w.showChanceBar, patch: (on) => ({ showChanceBar: on }) },
    );
  }
  if (w.type === "bonusTasks") {
    out.push(
      { key: "opp", label: "Задания противника", title: "задания противника, которые сторона в рейде может украсть за +1", on: !!w.showOpponentContracts, patch: (on) => ({ showOpponentContracts: on }) },
      { key: "tags", label: "Тег «карта»", title: "плашка «карта» у заданий на карту раунда", on: !!w.showTags, patch: (on) => ({ showTags: on }) },
    );
  }
  return out;
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
    добавление/удаление. Пишет раскладку через onChange — превью и ссылки
    оверлея обновляются тем же документом. */
export function OverlayEditor({
  state,
  layout,
  onChange,
  onClose,
  history,
  top = null,
  note,
}: {
  state: LiveState;
  layout: OverlayLayout;
  onChange: (next: OverlayLayout) => void;
  /** Кнопка «Готово» есть, только когда редактор открыт поверх превью и его можно закрыть. */
  onClose?: () => void;
  history?: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean };
  /** Блок над сценой (список сцен); на весь экран - над панелью справа. */
  top?: React.ReactNode;
  /** Плашка поверх макета (например, что данные - пример); в OBS её нет. */
  note?: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const targets = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const dragRef = React.useRef<DragState | null>(null);
  const [scale, setScale] = React.useState(0);
  const [box, setBox] = React.useState({ w: 0, h: 0 }); // размер контейнера сцены (для центровки)
  const [selId, setSelId] = React.useState(""); // ничего не выбрано - панель показывает настройки сцены
  const [guides, setGuides] = React.useState<Guide[]>([]);
  const [addOpen, setAddOpen] = React.useState(false);
  const [fs, setFs] = React.useState(false); // полноэкранный режим редактора
  const [bg, setBg] = React.useState<PreviewBg>("day");
  const [posOpen, setPosOpen] = React.useState(false); // раскрыта ли группа «Положение»
  const [confirm, setConfirm] = React.useState<{ kind: "widget"; id: string } | { kind: "reset" } | null>(null);

  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y. По коду клавиши, чтобы работало и в русской раскладке;
  // в полях ввода сочетания отменяют набранный текст, а не правку сцены.
  React.useEffect(() => {
    if (!history) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (e.code === "KeyZ" && !e.shiftKey) {
        e.preventDefault();
        history.undo();
      } else if ((e.code === "KeyZ" && e.shiftKey) || e.code === "KeyY") {
        e.preventDefault();
        history.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history]);

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

  const ordered = bottomUp(layout.widgets);
  const sel = byId(selId) ?? null;
  const selPos = sel ? ordered.findIndex((w) => w.id === sel.id) : -1;
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
    const wide = type === "scoreboard" || type === "complications" || type === "standings" || type === "chance";
    const w = makeWidget(id, type, { x: 0.4, y: 0.4, z: maxZ + 1, ...(wide ? { w: 0.3 } : {}) });
    onChange({ ...layout, widgets: [...layout.widgets, w] });
    setSelId(id);
    setAddOpen(false);
  }
  // Выше или ниже ровно на одну позицию: меняемся местами с соседом, и номера слоёв идут подряд,
  // чтобы сцена и список «Слои» не расходились на равных номерах.
  function raise(id: string, dir: 1 | -1) {
    const order = bottomUp(layout.widgets);
    const i = order.findIndex((w) => w.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    const z = new Map(order.map((w, k) => [w.id, k + 1]));
    onChange({ ...layout, widgets: layout.widgets.map((w) => ({ ...w, z: z.get(w.id) ?? w.z })) });
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
    onChange({ ...(JSON.parse(JSON.stringify(DEFAULT_LAYOUT)) as OverlayLayout), activePresetId: layout.activePresetId });
    setSelId("");
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
      onPointerDown={(e) => {
        // Клик мимо виджетов снимает выбор: панель показывает настройки сцены.
        if (!(e.target as HTMLElement).closest("[data-widget]")) setSelId("");
      }}
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
            ...accentVars(layout.accent),
          }}
        >
          <PreviewBgLayer bg={bg} />
          {layout.stageBg?.on && (
            <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${layout.stageBg.opacity})` }} aria-hidden />
          )}
          {ordered.map((w) => {
            const Cmp = WIDGET_REGISTRY[w.type];
            if (!Cmp) return null;
            const selected = w.id === selId;
            // Скрытый виджет на сцене не виден, как и в эфире; выбранный в «Слоях» показан одной рамкой.
            // Он остаётся в разметке, чтобы привязка к краю считалась от настоящего размера.
            const hidden = !w.visible;
            return (
              <div
                key={w.id}
                ref={setRef(w.id)}
                data-widget=""
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
                  visibility: hidden && !selected ? "hidden" : undefined,
                  outline: selected ? `2px ${hidden ? "dashed" : "solid"} var(--accent)` : "1px dashed rgba(255,255,255,0.28)",
                  outlineOffset: 2,
                  cursor: w.locked ? "default" : "move",
                  touchAction: "none",
                }}
              >
                <div style={{ pointerEvents: "none", width: "100%", height: "100%", visibility: hidden ? "hidden" : undefined }}>
                  <Cmp state={state} instance={w} preview />
                </div>
                {hidden && selected && scale > 0 && (
                  <span
                    className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 font-semibold uppercase tracking-wider text-accent"
                    style={{ fontSize: 12 / (scale * (w.scale || 1)) }}
                  >
                    скрыт
                  </span>
                )}
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
  // Над макетом, а не на нём: на макете плашка закрыла бы виджеты.
  const noteBar = note ? (
    <div className="rounded-md border border-[rgba(34,211,238,0.4)] bg-[rgba(34,211,238,0.08)] px-3 py-1.5 text-xs font-semibold text-accent">{note}</div>
  ) : null;

  const opts = sel ? showOptions(sel) : [];
  const posSummary = sel
    ? `${sel.anchor ? ANCHOR_TITLE[sel.anchor as AnchorPos] : "свободно"} · ${Math.round(sel.scale * 100)}%${sel.w ? ` · ширина ${Math.round(sel.w * 100)}%` : ""}`
    : "";
  const confirmWidget = confirm?.kind === "widget" ? byId(confirm.id) : undefined;
  const undoHint = history ? " Отменить можно через Ctrl+Z." : "";

  const controls = (
    <>
      {/* Тулбар: действия с макетом и подложка превью */}
      <div className="flex flex-wrap items-center gap-2">
        {onClose && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            <span>Готово</span>
          </button>
        )}
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
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-pressed={!sel}
          onClick={() => setSelId("")}
          title="настройки всей сцены: отступ края, фон, акцент"
        >
          <span>⚙ Сцена</span>
        </button>
        {history && (
          <>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!history.canUndo} onClick={history.undo} title="отменить (Ctrl+Z)" aria-label="отменить">
              <span>↶</span>
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={!history.canRedo} onClick={history.redo} title="повторить (Ctrl+Shift+Z)" aria-label="повторить">
              <span>↷</span>
            </button>
          </>
        )}
      </div>
      <PreviewBgSwitch value={bg} onChange={setBg} />

      {sel ? (
        <div className="space-y-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
          {/* Шапка: имя + видимость/замок/удалить */}
          <div className="flex items-center justify-between gap-2">
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
              <button type="button" className="ml-1 text-xs text-muted hover:text-danger" onClick={() => setConfirm({ kind: "widget", id: sel.id })}>
                Удалить
              </button>
              <button
                type="button"
                className="ml-1 rounded px-1.5 text-sm text-muted hover:bg-[var(--surface)] hover:text-fg"
                title="снять выбор: настройки сцены"
                aria-label="снять выбор"
                onClick={() => setSelId("")}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Содержимое: текст (виджет «Текст») или URL картинки (виджет «Логотип») */}
          {(sel.type === "text" || sel.type === "logo") && (
            <PanelSection title="Содержимое">
              {sel.type === "text" ? (
                <input
                  className="input w-full"
                  value={typeof sel.props?.text === "string" ? sel.props.text : ""}
                  onChange={(e) => patch(sel.id, { props: { ...sel.props, text: e.target.value } })}
                  placeholder="Текст на оверлее (напр. ник кастера)"
                  aria-label="текст виджета"
                />
              ) : (
                <input
                  className="input w-full"
                  value={typeof sel.props?.url === "string" ? sel.props.url : ""}
                  onChange={(e) => patch(sel.id, { props: { ...sel.props, url: e.target.value } })}
                  placeholder="https://… (ссылка на картинку/лого)"
                  aria-label="ссылка на картинку"
                />
              )}
            </PanelSection>
          )}

          {opts.length > 0 && (
            <PanelSection title="Показывать">
              {/* Клетки сетки одной ширины, галочка всегда на своём месте: включение не сдвигает соседей. */}
              <div className="grid grid-cols-2 gap-1.5">
                {opts.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={o.on}
                    title={o.title}
                    onClick={() => patch(sel.id, o.patch(!o.on))}
                    className={`flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                      o.on
                        ? "border-[var(--primary)] bg-[rgba(255,106,26,0.12)] text-fg"
                        : "border-[var(--border)] text-muted hover:border-[var(--border-strong)] hover:text-fg"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-4 w-4 flex-none place-items-center rounded-[4px] border text-[0.65rem] font-bold leading-none ${
                        o.on ? "border-[var(--primary)] bg-[var(--primary)] text-[#150800]" : "border-[var(--border-strong)]"
                      }`}
                    >
                      {o.on ? "✓" : ""}
                    </span>
                    <span className="min-w-0 truncate">{o.label}</span>
                  </button>
                ))}
              </div>
            </PanelSection>
          )}

          {/* Фон: тумблер + ползунок прозрачности (всегда на месте, гаснет при выключенном фоне) */}
          <PanelSection title="Вид">
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
            {sel.type === "tasksV2" && (
              <SettingRow label="Тема">
                <div className="seg" role="group" aria-label="тема виджета">
                  {(["dark", "light"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="seg-btn"
                      aria-pressed={(sel.props?.theme === "light" ? "light" : "dark") === t}
                      onClick={() => patch(sel.id, { props: { ...sel.props, theme: t } })}
                    >
                      <span>{t === "dark" ? "Тёмная" : "Светлая"}</span>
                    </button>
                  ))}
                </div>
              </SettingRow>
            )}
          </PanelSection>

          {/* Положение свёрнуто в сводку: обычно виджет двигают на макете. */}
          <details open={posOpen} onToggle={(e) => setPosOpen(e.currentTarget.open)} className="border-t border-[var(--border)] pt-2.5">
            <summary className="flex cursor-pointer select-none items-center justify-between gap-2 text-[0.65rem] uppercase tracking-[0.14em] text-muted hover:text-fg">
              <span>Положение {posOpen ? "▾" : "▸"}</span>
              <span className="truncate text-[0.7rem] normal-case tracking-normal">{posSummary}</span>
            </summary>
            <div className="space-y-2 pt-2">
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
                <button type="button" className="btn btn-ghost btn-sm" disabled={selPos === ordered.length - 1} onClick={() => raise(sel.id, 1)} title="выше">
                  <span>↑ выше</span>
                </button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={selPos <= 0} onClick={() => raise(sel.id, -1)} title="ниже">
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

              <p className="text-[0.7rem] leading-snug text-muted">
                На макете: тяни за <span className="text-fg">угол</span> — масштаб всего виджета (со шрифтом); за <span className="text-fg">середину стороны</span> — ширина/высота коробки.
              </p>
            </div>
          </details>
        </div>
      ) : (
        <div className="space-y-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-sm uppercase">Сцена</span>
            <span className="text-[0.7rem] text-muted">виджет - кликом по макету или в слоях</span>
          </div>
          <PanelSection title="Вид сцены">
            <SettingRow label="Отступ края">
              <input
                type="range"
                min={0}
                max={160}
                step={2}
                value={pad}
                onChange={(e) => setPad(Number(e.target.value))}
                className="flex-1 accent-[var(--primary)]"
                aria-label="отступ от края"
                title="отступ от края при выравнивании; двигает все привязанные к краю виджеты"
              />
              <span className="w-9 text-right text-xs text-muted tnum">{Math.round(pad)}px</span>
            </SettingRow>
            <SettingRow label="Фон сцены">
              <Switch on={!!layout.stageBg?.on} onChange={(v) => setStageBg({ on: v })} title="затемнение всей сцены" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={layout.stageBg?.opacity ?? 0.4}
                disabled={!layout.stageBg?.on}
                onChange={(e) => setStageBg({ opacity: Number(e.target.value) })}
                className={`flex-1 accent-[var(--primary)] ${layout.stageBg?.on ? "" : "pointer-events-none opacity-30"}`}
                aria-label="прозрачность фона сцены"
              />
              <span className="w-9 text-right text-xs text-muted tnum">{layout.stageBg?.on ? `${Math.round(layout.stageBg.opacity * 100)}%` : "—"}</span>
            </SettingRow>
            <SettingRow label="Основной цвет">
              <input
                type="color"
                value={layout.accent ?? "#ff6a1a"}
                onChange={(e) => onChange({ ...layout, accent: e.target.value })}
                className="h-6 w-8 flex-none cursor-pointer rounded border border-[var(--border)] bg-transparent p-0"
                aria-label="основной цвет сцены"
                title="вместо оранжевого: сторона A на табло, свои задания и их очки"
              />
              <span className="min-w-0 text-[0.7rem] leading-snug text-muted">сторона A, свои задания и очки</span>
              {layout.accent && (
                <button
                  type="button"
                  className="ml-auto flex-none text-xs text-muted hover:text-fg"
                  onClick={() => onChange({ ...layout, accent: undefined })}
                  title="вернуть оранжевый цвет лиги"
                >
                  ↺ как у лиги
                </button>
              )}
            </SettingRow>
          </PanelSection>
          <div className="border-t border-[var(--border)] pt-2.5">
            <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => setConfirm({ kind: "reset" })}>
              <span>Сбросить макет</span>
            </button>
          </div>
        </div>
      )}

      {/* Слои */}
      <div className="rounded-lg border border-[var(--border)]">
        <div className="border-b border-[var(--border)] px-3 py-1.5 text-xs uppercase tracking-wide text-muted">Слои</div>
        <ul className="max-h-48 overflow-auto">
          {[...ordered]
            .reverse()
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

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === "reset" ? "Сбросить макет сцены?" : "Удалить виджет?"}
        message={
          confirm?.kind === "reset"
            ? `На сцене останутся только табло и протоколы, как в раскладке по умолчанию.${undoHint}`
            : `«${confirmWidget ? WIDGET_LABELS[confirmWidget.type] : ""}» пропадёт со сцены и из её ссылки для OBS.${undoHint}`
        }
        confirmLabel={confirm?.kind === "reset" ? "Сбросить" : "Удалить"}
        onConfirm={() => {
          if (confirm?.kind === "reset") reset();
          else if (confirm?.kind === "widget") remove(confirm.id);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  );

  if (fs) {
    return (
      <div className="fixed inset-0 z-[150] flex flex-col bg-[var(--bg)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
          <span className="font-display text-sm uppercase">Редактор макета — на весь экран</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFs(false)}>
            <span>⤢ Свернуть (Esc)</span>
          </button>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
            {noteBar}
            <div className="flex min-h-0 flex-1 items-center justify-center">{stagePane}</div>
          </div>
          <div className="w-[380px] flex-none space-y-3 overflow-y-auto border-l border-[var(--border)] p-4">
            {top}
            {controls}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {top}
      {noteBar}
      {stagePane}
      {controls}
    </div>
  );
}
