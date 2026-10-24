import type { LiveState, WidgetInstance } from "@/lib/types";

/** Пропсы любого виджета оверлея: живое состояние + его экземпляр в раскладке. */
export interface WidgetProps {
  state: LiveState;
  instance: WidgetInstance;
  /** Превью в редакторе сцены: показать и то, что в эфире видно только во время матча. */
  preview?: boolean;
}
