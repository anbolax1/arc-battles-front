"use client";

import * as React from "react";
import { useOverlayFeed } from "@/lib/ws";
import { OverlayLinks } from "@/components/admin/live-manager";
import { OverlaySceneEditor } from "@/components/admin/overlay-scenes";

/** Редактор оверлея отдельно от пульта: сцены и их ссылки для OBS, данные матча считает сервер. */
export function OverlayManager() {
  const feed = useOverlayFeed();
  const [linksSig, setLinksSig] = React.useState(0);

  return (
    <div className="space-y-5">
      <h2 className="text-2xl">Оверлей</h2>
      <p className="text-sm text-muted">
        Сцена здесь - это сцена в OBS: у каждой своя ссылка, и правки сразу видны на стриме. Счёт и задания оверлей берёт с
        сервера сам, здесь меняется только вид.
      </p>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <OverlaySceneEditor state={feed.state} onScenesChanged={() => setLinksSig((x) => x + 1)} />
        </div>
        <OverlayLinks reloadSig={linksSig} />
      </div>
    </div>
  );
}
