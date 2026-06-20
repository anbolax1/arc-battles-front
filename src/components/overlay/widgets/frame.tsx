import type { CSSProperties, ReactNode } from "react";
import type { WidgetInstance } from "@/lib/types";

/** Обёртка-панель виджета: фон с управляемой прозрачностью (alpha CSS-переменная)
    и скошенная glow-кромка. Когда фон выключен — заливка прозрачная, виден только
    контент (с тенью .ov-legible, чтобы текст читался поверх захвата игры). */
export function WidgetFrame({
  instance,
  className = "",
  children,
}: {
  instance: WidgetInstance;
  className?: string;
  children: ReactNode;
}) {
  const alpha = instance.bg.on ? instance.bg.opacity : 0;
  // width/height 100% — панель точно заполняет свой бокс (зона выделения = блок),
  // чтобы при ресайзе ширины/высоты контент совпадал с рамкой и переносился.
  const style = { "--ov-bg-alpha": alpha, width: "100%", height: "100%" } as CSSProperties;
  return (
    <div className={`ov-panel ${instance.bg.on ? "" : "ov-legible"} ${className}`} style={style}>
      {children}
    </div>
  );
}
