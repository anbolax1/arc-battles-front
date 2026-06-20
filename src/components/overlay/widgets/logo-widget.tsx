/* eslint-disable @next/next/no-img-element */
import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

/** Виджет «Логотип»: картинка по URL из instance.props.url (бренд/спонсор). Обычно
    используется с выключенным фоном. <img> (а не next/image) — произвольный внешний URL. */
export function LogoWidget({ instance }: WidgetProps) {
  const url = typeof instance.props?.url === "string" ? instance.props.url : "";
  if (!url) {
    return (
      <WidgetFrame instance={instance}>
        <div className="flex h-full items-center justify-center px-4 py-3 text-center text-xs text-muted">Логотип: задай URL</div>
      </WidgetFrame>
    );
  }
  return (
    <WidgetFrame instance={instance}>
      <img
        src={url}
        alt=""
        className="block object-contain"
        style={{
          width: instance.w ? "100%" : "auto",
          height: instance.h ? "100%" : "auto",
          maxWidth: instance.w ? "100%" : 360,
          maxHeight: instance.h ? "100%" : 180,
        }}
      />
    </WidgetFrame>
  );
}
