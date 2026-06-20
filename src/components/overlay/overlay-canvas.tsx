"use client";

import { useOverlayState } from "@/lib/ws";
import { OverlayStage } from "./overlay-stage";

/** Страница оверлея для OBS: реактивно отражает live-стейт с бэкенда и рендерит
    модульную раскладку виджетов (или дефолтную, если своя не задана). */
export function OverlayCanvas() {
  const s = useOverlayState();

  // Сцена — только когда турнир реально в эфире (status=live). Иначе плашка.
  if (!s || s.status !== "live") {
    return (
      <main className="flex min-h-screen items-start justify-center p-3">
        <div className="panel px-4 py-2 font-display text-sm uppercase tracking-wide text-muted">Сейчас никто не в эфире</div>
      </main>
    );
  }

  return <OverlayStage state={s} mode="overlay" />;
}
