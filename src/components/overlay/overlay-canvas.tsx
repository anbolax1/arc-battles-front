"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { useOverlayFeed } from "@/lib/ws";
import type { OverlayLayout, OverlayPreset } from "@/lib/types";
import { OverlayStage } from "./overlay-stage";

/** Раскладка ссылки, привязанной к пресету (/overlay/<slug>).
    none — обычный /overlay: раскладка приезжает в состоянии эфира. */
type PresetState =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "ready"; layout: OverlayLayout }
  | { kind: "missing" };

/** Плашка вместо сцены (нет эфира / нет такого пресета). */
function Plate({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-start justify-center p-3">
      <div className="panel px-4 py-2 font-display text-sm uppercase tracking-wide text-muted">{children}</div>
    </main>
  );
}

/** Читает раскладку пресета по адресу из ссылки. Перечитывает, когда сервер
    сообщает о правке пресетов (presetsRev в конверте состояния), — чтобы
    сохранённый в кабинете макет доехал до OBS без перезагрузки источника. */
function usePresetLayout(key: string | null, presetsRev: number): PresetState {
  const [st, setSt] = React.useState<PresetState>(key ? { kind: "loading" } : { kind: "none" });

  React.useEffect(() => {
    if (!key) return; // ссылка без пресета — раскладку берём из состояния эфира
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      api
        .get<OverlayPreset>(`/overlay/preset/${encodeURIComponent(key)}`)
        .then((p) => {
          if (!active) return;
          setSt(p?.layout && Array.isArray(p.layout.widgets) ? { kind: "ready", layout: p.layout } : { kind: "missing" });
        })
        .catch((e) => {
          if (!active) return;
          // 404 — такого пресета нет (опечатка в ссылке или удалён): так и говорим.
          // Прочие ошибки — бэкенд недоступен: ждём и пробуем снова, текущую
          // раскладку не трогаем, чтобы оверлей на стриме не мигал.
          if (e instanceof ApiError && e.status === 404) setSt({ kind: "missing" });
          else timer = setTimeout(load, 3000);
        });
    };
    load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [key, presetsRev]);

  return key ? st : { kind: "none" };
}

/** Страница оверлея для OBS: реактивно отражает live-стейт с бэкенда и рендерит
    модульную раскладку виджетов. presetKey (из ссылки /overlay/<slug>) жёстко
    задаёт раскладку — такой источник не зависит от выбранного в кабинете пресета,
    поэтому оверлеи переключаются сценами OBS. Без него — раскладка из состояния
    (или дефолтная, если своя не задана). */
export function OverlayCanvas({ presetKey = null }: { presetKey?: string | null }) {
  const { state, presetsRev } = useOverlayFeed();
  const preset = usePresetLayout(presetKey, presetsRev);

  // Пресет ещё не прочитали — не рисуем ничего: на стриме пустой кадр лучше,
  // чем вспышка чужой раскладки, которая через миг сменится.
  if (preset.kind === "loading") return null;

  if (preset.kind === "missing") return <Plate>Пресет «{presetKey}» не найден</Plate>;

  // Сцена — только когда турнир реально в эфире (status=live). Иначе плашка.
  if (!state || state.status !== "live") return <Plate>Сейчас никто не в эфире</Plate>;

  return <OverlayStage state={state} layout={preset.kind === "ready" ? preset.layout : null} mode="overlay" />;
}
