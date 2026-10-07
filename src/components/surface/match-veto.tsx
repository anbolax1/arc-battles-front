"use client";

import * as React from "react";
import { mapImage } from "@/lib/match";
import type { VetoAction } from "@/lib/types";
import { ReplayGlyph } from "@/components/surface/ui";

const ACT: Record<VetoAction["action"], string> = { ban: "бан", pick: "пик", rest: "остаток" };
const STEP_MS = 850;

function useReduced(): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      const m = matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** Пики и баны матча: все карты плитками и журнал ходов; кнопка проигрывает ходы заново. */
export function MatchVeto({
  maps,
  veto,
  nameA,
  nameB,
}: {
  maps: Array<{ code: string; name: string }>;
  veto: VetoAction[];
  nameA: string;
  nameB: string;
}) {
  const reduce = useReduced();
  const steps = React.useMemo(() => [...veto].sort((x, y) => x.seq - y.seq), [veto]);
  const [shown, setShown] = React.useState(steps.length);
  const [now, setNow] = React.useState(-1);
  const timers = React.useRef<number[]>([]);
  const busy = now >= 0 || shown < steps.length;

  // Карты из справочника плюс те, что встретились в ходах, но в справочнике их нет.
  const tiles = React.useMemo(() => {
    const out = [...maps];
    for (const s of steps) if (!out.some((m) => m.code === s.mapCode)) out.push({ code: s.mapCode, name: s.mapName });
    return out;
  }, [maps, steps]);

  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function replay() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (reduce) {
      setShown(steps.length);
      setNow(-1);
      return;
    }
    setShown(0);
    setNow(-1);
    steps.forEach((_, k) => {
      timers.current.push(
        window.setTimeout(() => {
          setShown(k + 1);
          setNow(k);
        }, 350 + k * STEP_MS),
      );
    });
    timers.current.push(window.setTimeout(() => setNow(-1), 350 + steps.length * STEP_MS + 500));
  }

  const who = (side: VetoAction["side"]) => (side === "A" ? nameA : side === "B" ? nameB : "");
  const label = (s: VetoAction) => `${ACT[s.action]}${s.side ? ` ${s.side}` : ""}${s.roundNumber ? ` · Р${s.roundNumber}` : ""}`;

  return (
    <div className="sf-m-block">
      <div className="sf-veto-head">
        <div>
          <p className="sf-eyebrow">Порядок выбора</p>
          <h2 className="sf-h-mid">
            пики и баны<span className="sf-dot">.</span>
          </h2>
        </div>
        <button type="button" className="sf-btn sf-btn-ink sf-btn-sm" onClick={replay} disabled={busy}>
          <ReplayGlyph />
          Повторить пики и баны
        </button>
      </div>
      <div className="sf-veto-wrap">
        <div className="sf-tiles">
          {tiles.map((m) => {
            const k = steps.findIndex((s) => s.mapCode === m.code);
            const s = k >= 0 && k < shown ? steps[k] : null;
            const state = s ? s.action : shown >= steps.length ? "left" : "";
            return (
              <div key={m.code} className={`sf-tile ${state} ${k >= 0 && k === now ? "now" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- превью карты */}
                <img src={mapImage(m.code)} alt="" loading="lazy" />
                <span className="lab">{s ? label(s) : ""}</span>
                <span className="nm">{m.name}</span>
              </div>
            );
          })}
        </div>
        <ol className="sf-vlog" aria-live="polite">
          {steps.map((s, k) => (
            <li key={s.seq} className={`${k >= shown ? "off" : ""} ${k === now ? "now" : ""}`}>
              <span className="i">{k + 1}</span>
              <span className={`sf-k ${s.action}`}>
                {ACT[s.action]}
                {s.side ? ` ${s.side}` : ""}
              </span>
              <span>
                <b>{s.mapName}</b>
                <small>
                  {s.action === "ban" ? "карта вычеркнута" : `уходит в раунд ${s.roundNumber ?? "—"}`}
                  {who(s.side) ? ` · ${who(s.side)}` : ""}
                </small>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
