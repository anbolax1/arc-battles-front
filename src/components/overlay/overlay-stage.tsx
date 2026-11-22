"use client";

import * as React from "react";
import type { CSSProperties } from "react";
import type { LiveState, OverlayLayout } from "@/lib/types";
import { DEFAULT_LAYOUT } from "./default-layout";
import { WIDGET_REGISTRY } from "./widgets/registry";
import { PatchToasts } from "./patch-toasts";
import { PreviewBgLayer, type PreviewBg } from "./preview-bg";
import { accentVars } from "./accent";

export const STAGE_W = 1920;
export const STAGE_H = 1080;
export const DEFAULT_PAD = 48; // отступ от края для закреплённых виджетов, px сцены (по умолчанию)

const ANCHOR_FLEX = { t: "flex-start", m: "center", b: "flex-end", l: "flex-start", c: "center", r: "flex-end" } as const;
const ANCHOR_ORIGIN = { t: "top", m: "center", b: "bottom", l: "left", c: "center", r: "right" } as const;

/** Закреплённый виджет ("tl".."br") прижимается к краю самим CSS, а не сохранёнными x/y:
    когда содержимое вытягивается (список заданий), он растёт от края внутрь и не уезжает за экран. */
function parseAnchor(anchor?: string): { v: "t" | "m" | "b"; h: "l" | "c" | "r" } | null {
  switch (anchor) {
    case "tl": return { v: "t", h: "l" };
    case "tc": return { v: "t", h: "c" };
    case "tr": return { v: "t", h: "r" };
    case "ml": return { v: "m", h: "l" };
    case "c": return { v: "m", h: "c" };
    case "mr": return { v: "m", h: "r" };
    case "bl": return { v: "b", h: "l" };
    case "bc": return { v: "b", h: "c" };
    case "br": return { v: "b", h: "r" };
    default: return null;
  }
}

/** Раскладка: явный пропс → из состояния → дефолт. Единый источник истины
    для /overlay, превью в кабинете и редактора. */
export function resolveLayout(state: LiveState, layout?: OverlayLayout | null): OverlayLayout {
  if (layout) return layout;
  // Сцена без виджетов остаётся пустой: раскладку по умолчанию рисуем, только когда сцена не выбрана.
  if (state.layout && Array.isArray(state.layout.widgets)) return state.layout;
  return DEFAULT_LAYOUT;
}

/**
 * Сцена оверлея: фиксированный холст 1920×1080, масштабируемый под контейнер
 * (transform: scale), с абсолютно позиционированными виджетами раскладки.
 * Один и тот же рендер для:
 *   - /overlay (mode="overlay") — холст на весь экран OBS-источника;
 *   - превью в кабинете (mode="preview") — контейнер 16:9 любой ширины.
 * `children` — слой редактора (react-rnd, Фаза 2) поверх сцены в тех же координатах.
 */
export function OverlayStage({
  state,
  layout,
  mode = "overlay",
  bg = "off",
  className = "",
  children,
}: {
  state: LiveState;
  layout?: OverlayLayout | null;
  mode?: "overlay" | "preview";
  /** Подложка под оверлеем (геймплей с HUD или шахматка) — ТОЛЬКО в режиме preview,
      чтобы оценить читаемость поверх игры. На /overlay (mode=overlay) игнорируется. */
  bg?: PreviewBg;
  className?: string;
  children?: React.ReactNode;
}) {
  const lay = resolveLayout(state, layout);
  const ref = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0); // 0 — ещё не измерили (прячем до первого замера)

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const s = Math.min(r.width / STAGE_W, r.height / STAGE_H);
      setScale(s > 0 ? s : 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const outerStyle: CSSProperties =
    mode === "overlay"
      ? { position: "fixed", inset: 0, overflow: "hidden" }
      : { position: "relative", width: "100%", aspectRatio: `${STAGE_W} / ${STAGE_H}`, overflow: "hidden" };

  const stageStyle: CSSProperties = {
    width: STAGE_W,
    height: STAGE_H,
    position: "absolute",
    top: 0,
    left: 0,
    // zoom (а не transform: scale) — даунскейл пере-растрирует текст в нативном
    // разрешении (резко), тогда как transform: scale мылит при уменьшении.
    zoom: scale,
    opacity: scale > 0 ? 1 : 0,
    transition: "opacity 200ms ease",
    ...accentVars(lay.accent),
  };

  const widgets = [...lay.widgets].filter((w) => w.visible).sort((a, b) => a.z - b.z);

  return (
    <div ref={ref} style={outerStyle} className={className}>
      {mode === "preview" && <PreviewBgLayer bg={bg} />}
      <div style={stageStyle}>
        {lay.stageBg?.on && (
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${lay.stageBg.opacity})` }} aria-hidden />
        )}
        {widgets.map((inst) => {
          const Cmp = WIDGET_REGISTRY[inst.type];
          if (!Cmp) return null;
          const size: CSSProperties = {
            width: inst.w ? inst.w * STAGE_W : undefined,
            height: inst.h ? inst.h * STAGE_H : undefined,
          };
          const sc = inst.scale && inst.scale !== 1 ? `scale(${inst.scale})` : undefined;
          const a = parseAnchor(inst.anchor);
          if (a) {
            // Слой на всю сцену с отступом: виджет внутри прижат к краю, масштаб растёт от этого края.
            const pad = lay.pad ?? DEFAULT_PAD;
            return (
              <div
                key={inst.id}
                style={{
                  position: "absolute",
                  inset: 0,
                  padding: pad,
                  boxSizing: "border-box",
                  display: "flex",
                  justifyContent: ANCHOR_FLEX[a.h],
                  alignItems: ANCHOR_FLEX[a.v],
                  pointerEvents: "none",
                  zIndex: inst.z,
                  ...accentVars(inst.accent),
                }}
              >
                <div style={{ ...size, flex: "0 0 auto", transform: sc, transformOrigin: `${ANCHOR_ORIGIN[a.v]} ${ANCHOR_ORIGIN[a.h]}` }}>
                  <Cmp state={state} instance={inst} />
                </div>
              </div>
            );
          }
          const wStyle: CSSProperties = {
            position: "absolute",
            left: inst.x * STAGE_W,
            top: inst.y * STAGE_H,
            ...size,
            transform: sc,
            transformOrigin: "top left",
            zIndex: inst.z,
            ...accentVars(inst.accent),
          };
          return (
            <div key={inst.id} style={wStyle}>
              <Cmp state={state} instance={inst} />
            </div>
          );
        })}
        <PatchToasts flashes={state.patchFlashes} />
        {children}
      </div>
    </div>
  );
}
