import { mapImage } from "@/lib/match";
import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

/** Виджет «Пики-баны»: карты матча с банами и пиками сторон. Скрыт, пока ходов нет. */
export function VetoWidget({ state, instance }: WidgetProps) {
  const veto = state.veto ?? [];
  if (!veto.length) return null;
  return (
    <WidgetFrame instance={instance}>
      <div className="flex h-full flex-col">
        {!instance.hideTitle && (
          <div className="ov-fill-2 px-4 py-1.5 font-display text-xs uppercase tracking-[0.2em] text-muted">Пики-баны</div>
        )}
        <div className="grid flex-1 grid-cols-3 gap-1.5 p-2">
          {veto.map((v) => {
            const banned = v.action === "ban";
            return (
              <div key={v.mapCode} className="relative min-h-[64px] overflow-hidden rounded">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mapImage(v.mapCode)}
                  alt=""
                  className={`absolute inset-0 h-full w-full object-cover ${banned ? "opacity-40 grayscale" : ""}`}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                <span className="absolute bottom-1 left-1.5 right-1.5 text-[0.65rem] font-semibold uppercase leading-tight">
                  <span className={banned ? "line-through" : ""}>{v.mapName}</span>
                  <span className={`block ${banned ? "text-danger" : "text-accent"}`}>
                    {banned ? `бан ${v.sideName ?? ""}` : `раунд ${v.round ?? ""}`}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </WidgetFrame>
  );
}
