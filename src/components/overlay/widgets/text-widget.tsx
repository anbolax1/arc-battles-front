import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

/** Виджет «Текст»: произвольная подпись из instance.props.text (касты, спонсор,
    название эфира и т.п.). */
export function TextWidget({ instance }: WidgetProps) {
  const text = typeof instance.props?.text === "string" && instance.props.text ? instance.props.text : "Текст";
  return (
    <WidgetFrame instance={instance}>
      <div className="flex h-full items-center px-4 py-2 font-display text-lg uppercase tracking-wide [overflow-wrap:anywhere]">{text}</div>
    </WidgetFrame>
  );
}
