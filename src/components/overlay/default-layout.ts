import type { OverlayBg, OverlayLayout, WidgetInstance, WidgetType } from "@/lib/types";

const DEFAULT_BG: OverlayBg = { on: true, opacity: 0.85 };

/** Дефолты экземпляра виджета + переопределения. Позиция/размер — долями 1920×1080. */
export function makeWidget(
  id: string,
  type: WidgetType,
  partial: Partial<WidgetInstance> = {},
): WidgetInstance {
  return {
    id,
    type,
    x: 0.04,
    y: 0.04,
    scale: 1,
    z: 1,
    visible: true,
    bg: { ...DEFAULT_BG },
    ...partial,
  };
}

/** Дефолтная раскладка: повторяет прежний вид (табло сверху-по центру + полоса
    усложнения под ним), но каждый блок уже независимый и перемещаемый.
    Используется, когда в состоянии нет своей раскладки. */
export const DEFAULT_LAYOUT: OverlayLayout = {
  version: 1,
  stageBg: { on: false, opacity: 0.4 },
  widgets: [
    makeWidget("scoreboard", "scoreboard", { x: 0.35, y: 0.03, w: 0.3, z: 2 }),
    makeWidget("complications", "complications", { x: 0.35, y: 0.145, w: 0.3, z: 1 }),
  ],
};
