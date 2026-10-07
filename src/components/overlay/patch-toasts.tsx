"use client";

import * as React from "react";
import type { PatchFlash } from "@/lib/types";
import { PatchArt } from "@/components/surface/patch-art";
import { PATCH_INFO, patchName } from "@/components/surface/patch-meta";
import { knocksLabel } from "@/lib/format";
import "./patch-toasts.css";

/** Сколько висит одна плашка, мс; совпадает с анимацией ухода в patch-toasts.css. */
const SHOW_MS = 6000;
/** Пауза между плашками, мс. */
const GAP_MS = 400;

function line(f: PatchFlash): string {
  const k = f.detail?.knocks ?? 0;
  if (f.code === "clear") return `${f.name} · ${knocksLabel(k)} за рейд`;
  if (f.code === "hunter") return `${f.name} · ${knocksLabel(k)} за сезон`;
  return `${f.name} · ${PATCH_INFO[f.code].rule}`;
}

/** Плашки нашивок, полученных в эфире: по одной, по очереди. Те, что уже были в состоянии при загрузке
    оверлея, не показываются - иначе перезапуск источника в OBS повторил бы старые. */
export function PatchToasts({ flashes }: { flashes?: PatchFlash[] }) {
  const seen = React.useRef<Set<string> | null>(null);
  const queue = React.useRef<PatchFlash[]>([]);
  const busy = React.useRef(false);
  const [cur, setCur] = React.useState<PatchFlash | null>(null);

  const pump = React.useCallback(function next() {
    if (busy.current) return;
    const f = queue.current.shift();
    if (!f) return;
    busy.current = true;
    setCur(f);
    setTimeout(() => {
      busy.current = false;
      setCur(null);
      setTimeout(next, GAP_MS);
    }, SHOW_MS);
  }, []);

  React.useEffect(() => {
    const list = flashes ?? [];
    if (!seen.current) {
      seen.current = new Set(list.map((f) => f.id));
      return;
    }
    for (const f of list) {
      if (seen.current.has(f.id)) continue;
      seen.current.add(f.id);
      queue.current.push(f);
    }
    const t = setTimeout(pump, 0);
    return () => clearTimeout(t);
  }, [flashes, pump]);

  if (!cur) return null;
  return (
    <div key={cur.id} className="pt-toast" role="status">
      <PatchArt code={cur.code} tier={cur.tier} night className="pt-toast-art" />
      <span className="pt-toast-k">Новая нашивка</span>
      <b className="pt-toast-name">{patchName(cur.code, cur.tier)}</b>
      <span className="pt-toast-line">{line(cur)}</span>
    </div>
  );
}
