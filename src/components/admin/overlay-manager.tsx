"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useOverlayFeed } from "@/lib/ws";
import { OverlayEditor } from "@/components/admin/overlay-editor";
import { OverlayLinks } from "@/components/admin/live-manager";
import { OverlayStage } from "@/components/overlay/overlay-stage";
import { DEFAULT_LAYOUT } from "@/components/overlay/default-layout";
import type { LiveState, OverlayLayout } from "@/lib/types";

const EMPTY_STATE: LiveState = {
  tournamentName: "Матч",
  mode: "1x1",
  currentRound: 1,
  totalRounds: 2,
  currentName: "",
  currentPoints: 0,
  tasks: [],
};

/** Редактор оверлея отдельно от пульта: правит общую раскладку, данные матча считает сервер. */
export function OverlayManager() {
  const feed = useOverlayFeed();
  const [layout, setLayout] = React.useState<OverlayLayout>(DEFAULT_LAYOUT);
  // Пока раскладка не пришла с сервера, не сохраняем: иначе раскладка по умолчанию затрёт настоящую.
  const [ready, setReady] = React.useState(false);
  const [editing, setEditing] = React.useState(true);
  const [presetsSig, setPresetsSig] = React.useState(0);
  const [bg, setBg] = React.useState<"day" | "night" | "off">("day");
  const bgImage = bg === "off" ? null : bg === "night" ? "/preview-bg-night.jpg" : "/preview-bg.jpg";
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      api
        .get<OverlayLayout>("/overlay/layout")
        .then((l) => {
          if (!active) return;
          if (l && Array.isArray(l.widgets)) setLayout(l);
          setReady(true);
        })
        .catch(() => {
          if (active) timer = setTimeout(load, 3000);
        });
    };
    load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const state: LiveState = { ...(feed.state ?? EMPTY_STATE), layout };
  const body = ready && dirty ? JSON.stringify(state) : "";
  React.useEffect(() => {
    if (!body) return;
    const t = setTimeout(() => {
      void api.put("/overlay/state", JSON.parse(body)).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [body]);

  const change = (next: OverlayLayout) => {
    setDirty(true);
    setLayout(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Оверлей</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Фон игры в превью:</span>
          <div className="seg">
            {([["day", "День"], ["night", "Ночь"], ["off", "Выкл"]] as const).map(([k, label]) => (
              <button key={k} type="button" className="seg-btn" aria-pressed={bg === k} onClick={() => setBg(k)}>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-sm text-muted">
        {feed.state ? "Показаны данные текущего матча." : "Сейчас матча нет — раскладка сохранится и применится к следующему."}{" "}
        Счёт и задания оверлей берёт с сервера сам — здесь меняется только расположение виджетов.
      </p>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {editing && ready ? (
            <OverlayEditor
              state={state}
              layout={layout}
              onChange={change}
              onClose={() => setEditing(false)}
              onPresetsChanged={() => setPresetsSig((x) => x + 1)}
              bgImage={bgImage}
            />
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-black/40">
                <OverlayStage state={state} mode="preview" bgImage={bgImage} />
              </div>
              <button type="button" className="btn btn-ghost btn-sm" disabled={!ready} onClick={() => setEditing(true)}>
                <span>Редактировать макет</span>
              </button>
            </div>
          )}
        </div>
        <OverlayLinks reloadSig={presetsSig} />
      </div>
    </div>
  );
}
