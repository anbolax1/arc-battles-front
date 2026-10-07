"use client";

import * as React from "react";
import type { MmrPoint } from "@/lib/types";
import { fullDate } from "@/components/surface/fmt";
import { signed } from "@/components/surface/ui";

/** Отрезок графика: один сезон со своим стартовым MMR. */
export interface ChartSegment {
  label: string;
  start: number;
  points: MmrPoint[];
}

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const monthFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", month: "numeric" });

function monthIndex(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : Number(monthFmt.format(d)) - 1;
}

/** График MMR по матчам: каждый сезон - свой отрезок, между сезонами сброс на старт. */
export function ProfileChart({ segments }: { segments: ChartSegment[] }) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [W, setW] = React.useState(900);
  const [hover, setHover] = React.useState<number | null>(null);

  React.useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pts = segments.flatMap((s, si) => s.points.map((p) => ({ ...p, si })));
  if (!pts.length) return null;

  const narrow = W < 560;
  const H = Math.round(Math.min(340, Math.max(220, W * 0.32)));
  const pad = { l: 46, r: 22, t: 32, b: 34 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const vals = pts.map((p) => p.mmr).concat(segments.map((s) => s.start));
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV;
  const step = range <= 240 ? 50 : range <= 700 ? 100 : 200;
  const lo = Math.floor((minV - step * 0.4) / step) * step;
  const hi = Math.ceil((maxV + step * 0.4) / step) * step;
  const n = pts.length;
  const X = (i: number) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const Y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * ih;

  const grid: number[] = [];
  for (let v = lo; v <= hi; v += step) grid.push(v);

  // Подписи месяцев: на первом матче месяца, если не налезают на предыдущую.
  const months: Array<{ x: number; label: string }> = [];
  for (let i = 0, lastMonth: number | null = null, lastX = -999; i < pts.length; i++) {
    const m = monthIndex(pts[i].date);
    if (m === null || m === lastMonth) continue;
    lastMonth = m;
    if (X(i) - lastX < 56) continue;
    months.push({ x: X(i), label: MONTHS[m] });
    lastX = X(i);
  }

  const starts = segments.map((_, si) => segments.slice(0, si).reduce((sum, s) => sum + s.points.length, 0));
  const segs = segments.map((s, si) => {
    const from = starts[si];
    const idx = s.points.map((_, j) => from + j);
    const line = idx.map((i, j) => `${j ? "L" : "M"}${X(i).toFixed(1)} ${Y(pts[i].mmr).toFixed(1)}`).join("");
    const x0 = X(idx[0]);
    const x1 = X(idx[idx.length - 1]);
    const sep = si > 0 ? (X(from) + X(from - 1)) / 2 : null;
    return { s, si, idx, line, x0, x1, sep };
  });

  const end = n - 1;
  const hp = hover !== null ? pts[hover] : null;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(end, Math.round(((x - pad.l) / iw) * (n - 1)))));
  }

  const summary = `График MMR по матчам: от ${pts[0].mmr} до ${pts[end].mmr}`;

  return (
    <div className="sf-chart-box drawn" ref={boxRef}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={summary}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <g className="grid">
          {grid.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} />
              <text className="ax" x={pad.l - 8} y={Y(v) + 3} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
        </g>
        {months.map((m) => (
          <text key={m.x} className="ax" x={m.x} y={H - 10} textAnchor="middle">
            {m.label}
          </text>
        ))}
        {segs.map(({ s, si, idx, line, x0, x1, sep }) => (
          <g key={si}>
            <line className="pf-start" x1={x0} x2={Math.max(x1, x0 + 1)} y1={Y(s.start)} y2={Y(s.start)} />
            {sep !== null ? (
              <>
                <line className="sep" x1={sep} x2={sep} y1={pad.t - 10} y2={pad.t + ih} />
                <text className="lab" x={sep + 6} y={pad.t - 14}>
                  {(narrow ? s.label : `${s.label} · сброс на ${s.start}`).toUpperCase()}
                </text>
              </>
            ) : (
              <text className="lab" x={pad.l + 4} y={pad.t - 14}>
                {(segments.length > 1 || narrow ? s.label : `${s.label} · старт ${s.start}`).toUpperCase()}
              </text>
            )}
            {idx.length > 1 && <path className="line" d={line} pathLength={1} />}
          </g>
        ))}
        {hp && hover !== null && <line className="guide" x1={X(hover)} x2={X(hover)} y1={pad.t} y2={pad.t + ih} />}
        {pts.map((p, i) =>
          i === end ? null : (
            <circle key={i} className={`pt ${p.correction ? "c" : p.win ? "w" : ""}`} cx={X(i)} cy={Y(p.mmr)} r={n > 60 ? 2.6 : 3.4} />
          ),
        )}
        <circle className="end" cx={X(end)} cy={Y(pts[end].mmr)} r={6.5} />
        <text className="pf-end" x={X(end) - 10} y={Y(pts[end].mmr) - 12} textAnchor="end">
          {pts[end].mmr} MMR
        </text>
      </svg>
      {hp && hover !== null && (
        <div className="sf-tip" style={{ left: Math.max(90, Math.min(W - 90, X(hover))), top: Y(hp.mmr) }}>
          {hp.correction ? (
            <>
              <small>{fullDate(hp.date)}</small>
              <b>{hp.mmr}</b> MMR
              <small>сверка рейтинга {signed(hp.delta)}</small>
            </>
          ) : (
            <>
              <small>
                {fullDate(hp.date)} · {hp.win ? "победа" : "поражение"}
                {hp.mult > 1 ? ` ×${hp.mult}` : ""}
              </small>
              <b>{hp.mmr}</b> MMR <span className={hp.delta >= 0 ? "u" : "d"}>{signed(hp.delta)}</span>
              <small>
                vs {hp.opponent || "?"}
                {hp.map ? ` · ${hp.map}` : ""}
              </small>
            </>
          )}
        </div>
      )}
    </div>
  );
}
