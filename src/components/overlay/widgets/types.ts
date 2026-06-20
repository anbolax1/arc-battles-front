import type { LiveState, WidgetInstance } from "@/lib/types";

/** Пропсы любого виджета оверлея: живое состояние + его экземпляр в раскладке. */
export interface WidgetProps {
  state: LiveState;
  instance: WidgetInstance;
}
