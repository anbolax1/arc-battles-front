"use client";

import * as React from "react";
import type { MmrPoint } from "@/lib/types";
import { fmtDate } from "@/lib/format";

const DAY = 86400000;

function linreg(xs: number[], ys: number[]): { slope: number; intercept: number } | null {
  const n = xs.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i];
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  return { slope, intercept: (sy - slope * sx) / n };
}

/** Плавная кривая через точки (Catmull-Rom → кубические кривые Безье, натяжение 1/6). */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (!pts.length) return "";
  if (pts.length < 3) return "M " + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ");
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** Интерактивный график динамики MMR. Ось X — индекс матча (точки не наслаиваются даже для
    матчей одного дня). Пунктирная линия тренда (регрессия) видна всегда; ползунок продлевает её
    в прогноз на N дней (частота матчей → сколько матчей за N дней). Тултип по наведению. */
export function MmrChart({ points, start = 1000 }: { points: MmrPoint[]; start?: number }) {
  const [horizon, setHorizon] = React.useState(0);
  const [hover, setHover] = React.useState<number | null>(null);
  const [nowMs] = React.useState(() => Date.now());
  const svgRef = React.useRef<SVGSVGElement>(null);

  if (!points.length) {
    return (
      <div className="panel flex h-40 items-center justify-center text-sm text-muted">
        Нет сыгранных матчей — график появится после первого.
      </div>
    );
  }

  const W = 720, H = 250;
  const pad = { l: 46, r: 54, t: 18, b: 30 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const n = points.length;

  const times = points.map((p) => (p.date ? new Date(p.date).getTime() : NaN));
  const haveDates = times.every((t) => !Number.isNaN(t));
  const spanDays = haveDates ? Math.max(0, (times[n - 1] - times[0]) / DAY) : 0;
  const perDay = haveDates && spanDays > 0 ? (n - 1) / spanDays : 0; // матчей в день (для прогноза)

  const reg = linreg(points.map((_, i) => i), points.map((p) => p.mmr));
  const canProject = reg != null && horizon > 0 && perDay > 0;
  const projIndex = canProject ? (n - 1) + perDay * horizon : n - 1;
  const projMmrRaw = canProject ? Math.round(reg!.intercept + reg!.slope * projIndex) : null;

  const xHi = projIndex || 1;
  const X = (i: number) => pad.l + (innerW * i) / xHi;

  const mmrs = points.map((p) => p.mmr);
  let minV = Math.min(start, ...mmrs);
  let maxV = Math.max(start, ...mmrs);
  const projMmr = projMmrRaw == null ? null : Math.max(minV - 200, Math.min(maxV + 200, projMmrRaw));
  if (projMmr != null) { minV = Math.min(minV, projMmr); maxV = Math.max(maxV, projMmr); }
  const span = Math.max(24, maxV - minV);
  const lo = minV - span * 0.14, hi = maxV + span * 0.14;
  const Y = (v: number) => pad.t + innerH * (1 - (v - lo) / (hi - lo));
  const Yc = (v: number) => Y(Math.max(lo, Math.min(hi, v)));

  const pts = points.map((p, i) => ({ x: X(i), y: Y(p.mmr) }));
  const linePath = smoothPath(pts);
  const areaPath = `${linePath} L ${pts[n - 1].x.toFixed(1)} ${(pad.t + innerH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(pad.t + innerH).toFixed(1)} Z`;
  const baseY = Y(start);

  const last = points[n - 1];
  const netFromStart = last.mmr - start;
  const hp = hover != null ? points[hover] : null;
  const todayIndex = canProject && haveDates ? (n - 1) + perDay * Math.max(0, (nowMs - times[n - 1]) / DAY) : null;

  function onMove(e: React.MouseEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    if (!r.width) return;
    const svgX = ((e.clientX - r.left) / r.width) * W;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(X(i) - svgX);
      if (d < bestD) { bestD = d; best = i; }
    }
    setHover(best);
  }

  return (
    <div className="panel p-4">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-display text-sm uppercase tracking-wide text-muted">Динамика MMR</span>
        <span className="text-xs text-muted">
          {n} матч(ей) ·{" "}
          <span className={netFromStart >= 0 ? "text-primary-2" : "text-danger"}>
            {netFromStart >= 0 ? "+" : ""}{netFromStart} с начала
          </span>
          {projMmrRaw != null && (<> · <span className="text-accent">через {horizon} дн ≈ {projMmrRaw}</span></>)}
        </span>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} /> победа</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--danger)" }} /> поражение</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-0.5 w-4" style={{ background: "var(--accent)" }} /> тренд/прогноз</span>
        <span>наведи на точку — детали матча</span>
      </div>

      <div className="relative">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="График изменения MMR по матчам с трендом и прогнозом">
          <defs>
            <linearGradient id="mmr-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary-2)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--primary-2)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <line x1={pad.l} y1={baseY} x2={W - pad.r} y2={baseY} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="4 4" />
          <text x={pad.l - 6} y={baseY + 3} textAnchor="end" fontSize="10" fill="var(--muted)">{start}</text>
          <text x={pad.l - 6} y={Y(hi) + 8} textAnchor="end" fontSize="10" fill="var(--muted)">{Math.round(hi)}</text>
          <text x={pad.l - 6} y={Y(lo)} textAnchor="end" fontSize="10" fill="var(--muted)">{Math.round(lo)}</text>

          {todayIndex != null && (
            <>
              <line x1={X(todayIndex)} y1={pad.t} x2={X(todayIndex)} y2={pad.t + innerH} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 3" />
              <text x={X(todayIndex)} y={pad.t - 6} textAnchor="middle" fontSize="9" fill="var(--muted)">сегодня</text>
            </>
          )}

          {n > 1 && <path d={areaPath} fill="url(#mmr-area)" />}
          {n > 1 && <path d={linePath} fill="none" stroke="var(--primary-2)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}

          {/* Линия тренда — видна всегда (регрессия по данным), тянется в прогноз при сдвиге ползунка */}
          {reg && (
            <line x1={X(0)} y1={Yc(reg.intercept)} x2={X(projIndex)} y2={Yc(reg.intercept + reg.slope * projIndex)}
              stroke="var(--accent)" strokeWidth="1.75" strokeDasharray="6 4" opacity="0.9" />
          )}
          {canProject && projMmr != null && (
            <>
              <circle cx={X(projIndex)} cy={Y(projMmr)} r="4" fill="var(--accent)" stroke="var(--bg)" strokeWidth="1.5" />
              <text x={X(projIndex)} y={Y(projMmr) - 8} textAnchor="end" fontSize="10" fill="var(--accent)">≈{projMmrRaw}</text>
            </>
          )}

          {hp && (
            <>
              <line x1={X(hover!)} y1={pad.t} x2={X(hover!)} y2={pad.t + innerH} stroke="var(--border-strong)" strokeWidth="1" />
              <circle cx={X(hover!)} cy={Y(hp.mmr)} r="6" fill="none" stroke="var(--fg)" strokeWidth="1.5" opacity="0.85" />
            </>
          )}

          {points.map((p, i) => (
            <circle key={p.tournamentId + i} cx={X(i)} cy={Y(p.mmr)} r={n > 40 ? 2.5 : 3.5}
              fill={p.win ? "var(--accent)" : "var(--danger)"} stroke="var(--bg)" strokeWidth="1" />
          ))}

          {points[0].date && (
            <text x={X(0)} y={H - 10} textAnchor="start" fontSize="10" fill="var(--muted)">{fmtDate(points[0].date)}</text>
          )}
          {last.date && (
            <text x={X(n - 1)} y={H - 10} textAnchor={canProject ? "middle" : "end"} fontSize="10" fill="var(--muted)">{fmtDate(last.date)}</text>
          )}
          {canProject && (
            <text x={W - pad.r + 4} y={H - 10} textAnchor="end" fontSize="9" fill="var(--accent)">+{horizon}д</text>
          )}

          <rect x={pad.l} y={pad.t} width={innerW} height={innerH} fill="transparent"
            onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ cursor: "crosshair" }} />
        </svg>

        {hp && (
          <div
            className="pointer-events-none absolute z-10 min-w-[150px] -translate-x-1/2 -translate-y-[115%] rounded-md border border-[var(--border-strong)] bg-surface-2 px-3 py-2 text-xs shadow-lg"
            style={{ left: `${(X(hover!) / W) * 100}%`, top: `${(Y(hp.mmr) / H) * 100}%` }}
          >
            <div className={`font-display uppercase ${hp.win ? "text-accent" : "text-danger"}`}>
              {hp.win ? "Победа" : "Поражение"}{hp.mult > 1 ? ` ×${hp.mult}` : ""}
            </div>
            <div className="mt-0.5 text-muted">vs {hp.opponent || "?"}</div>
            <div className="tnum">
              MMR <span className="text-primary-2">{hp.mmr}</span>{" "}
              <span className={hp.delta >= 0 ? "text-accent" : "text-danger"}>({hp.delta >= 0 ? "+" : ""}{hp.delta})</span>
            </div>
            <div className="text-muted">{hp.map || "—"}{hp.date ? ` · ${fmtDate(hp.date)}` : ""}</div>
          </div>
        )}
      </div>

      {reg && (
        <label className="mt-3 flex items-center gap-3 text-xs text-muted">
          <span className="whitespace-nowrap">Горизонт прогноза</span>
          <input type="range" min={0} max={180} step={5} value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-[var(--accent)]" />
          <span className="w-16 whitespace-nowrap text-right tnum text-fg">+{horizon} дн</span>
        </label>
      )}
    </div>
  );
}
