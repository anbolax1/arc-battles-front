import type { MmrPoint } from "@/lib/types";
import { fmtDate } from "@/lib/format";

const DAY = 86400000;

/** Линейная регрессия y по x (метод наименьших квадратов). null — если наклон не определить. */
function linreg(xs: number[], ys: number[]): { slope: number; intercept: number } | null {
  const n = xs.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
    sxx += xs[i] * xs[i];
    sxy += xs[i] * ys[i];
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  return { slope, intercept: (sy - slope * sx) / n };
}

/** График динамики MMR по матчам (статичный SVG, RSC). Ось X — время; пунктирная линия тренда
    (регрессия по времени) с прогнозом MMR на месяц вперёд от сегодняшнего дня. */
export function MmrChart({ points, start = 1000 }: { points: MmrPoint[]; start?: number }) {
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

  // Ось X по времени (дни от первого матча); при отсутствии дат — по индексу, без прогноза.
  const times = points.map((p) => (p.date ? new Date(p.date).getTime() : NaN));
  const haveDates = times.every((t) => !Number.isNaN(t));
  const t0 = haveDates ? times[0] : 0;
  const dayOf = (t: number) => (t - t0) / DAY;
  const xsDays = haveDates ? times.map(dayOf) : points.map((_, i) => i);

  const reg = haveDates ? linreg(xsDays, points.map((p) => p.mmr)) : null;
  // eslint-disable-next-line react-hooks/purity -- текущее время нужно для проекции тренда на месяц вперёд
  const nowMs = Date.now();
  const projDays = haveDates && reg ? dayOf(nowMs + 30 * DAY) : null;
  const canProject = reg != null && projDays != null && projDays > xsDays[n - 1];
  const projMmrRaw = canProject ? Math.round(reg!.intercept + reg!.slope * projDays!) : null;

  const xLo = xsDays[0];
  const xHi = canProject ? projDays! : xsDays[n - 1];
  const xSpan = xHi - xLo || 1;
  const X = (dx: number) => pad.l + (innerW * (dx - xLo)) / xSpan;

  // Y-домен: значения матчей + старт (+ прогноз, ограниченный, чтобы экстремум не «сплющил» график).
  const mmrs = points.map((p) => p.mmr);
  let minV = Math.min(start, ...mmrs);
  let maxV = Math.max(start, ...mmrs);
  const projMmr = projMmrRaw == null ? null : Math.max(minV - 150, Math.min(maxV + 150, projMmrRaw));
  if (projMmr != null) {
    minV = Math.min(minV, projMmr);
    maxV = Math.max(maxV, projMmr);
  }
  const span = Math.max(24, maxV - minV);
  const lo = minV - span * 0.14;
  const hi = maxV + span * 0.14;
  const Y = (v: number) => pad.t + innerH * (1 - (v - lo) / (hi - lo));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${X(xsDays[i]).toFixed(1)} ${Y(p.mmr).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${X(xsDays[n - 1]).toFixed(1)} ${(pad.t + innerH).toFixed(1)} L ${X(xsDays[0]).toFixed(1)} ${(pad.t + innerH).toFixed(1)} Z`;
  const baseY = Y(start);

  const last = points[n - 1];
  const netFromStart = last.mmr - start;
  const nowDays = haveDates ? dayOf(nowMs) : null;

  return (
    <div className="panel p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-display text-sm uppercase tracking-wide text-muted">Динамика MMR</span>
        <span className="text-xs text-muted">
          {n} матч(ей) ·{" "}
          <span className={netFromStart >= 0 ? "text-primary-2" : "text-danger"}>
            {netFromStart >= 0 ? "+" : ""}
            {netFromStart} с начала
          </span>
          {projMmrRaw != null && (
            <>
              {" · "}
              <span className="text-accent">прогноз через месяц ≈ {projMmrRaw}</span>
            </>
          )}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="График изменения MMR по матчам с прогнозом">
        <defs>
          <linearGradient id="mmr-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary-2)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary-2)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Базовая линия старта */}
        <line x1={pad.l} y1={baseY} x2={W - pad.r} y2={baseY} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="4 4" />
        <text x={pad.l - 6} y={baseY + 3} textAnchor="end" fontSize="10" fill="var(--muted)">{start}</text>
        <text x={pad.l - 6} y={Y(hi) + 8} textAnchor="end" fontSize="10" fill="var(--muted)">{Math.round(hi)}</text>
        <text x={pad.l - 6} y={Y(lo)} textAnchor="end" fontSize="10" fill="var(--muted)">{Math.round(lo)}</text>

        {/* Отметка «сегодня» */}
        {canProject && nowDays != null && nowDays > xsDays[n - 1] && (
          <>
            <line x1={X(nowDays)} y1={pad.t} x2={X(nowDays)} y2={pad.t + innerH} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 3" />
            <text x={X(nowDays)} y={pad.t - 6} textAnchor="middle" fontSize="9" fill="var(--muted)">сегодня</text>
          </>
        )}

        {/* Площадь + фактическая линия */}
        {n > 1 && <path d={areaPath} fill="url(#mmr-area)" />}
        {n > 1 && <path d={linePath} fill="none" stroke="var(--primary-2)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}

        {/* Линия тренда + прогноз */}
        {reg && (
          <line
            x1={X(xLo)} y1={Y(reg.intercept + reg.slope * xLo)}
            x2={X(xHi)} y2={Y(Math.max(lo, Math.min(hi, reg.intercept + reg.slope * xHi)))}
            stroke="var(--accent)" strokeWidth="1.75" strokeDasharray="6 4" opacity="0.9"
          />
        )}
        {canProject && projMmr != null && (
          <>
            <circle cx={X(projDays!)} cy={Y(projMmr)} r="4" fill="var(--accent)" stroke="var(--bg)" strokeWidth="1.5" />
            <text x={X(projDays!)} y={Y(projMmr) - 8} textAnchor="end" fontSize="10" fill="var(--accent)">≈{projMmrRaw}</text>
          </>
        )}

        {/* Точки матчей */}
        {points.map((p, i) => (
          <circle key={p.tournamentId + i} cx={X(xsDays[i])} cy={Y(p.mmr)} r={n > 40 ? 2.5 : 3.5}
            fill={p.win ? "var(--accent)" : "var(--danger)"} stroke="var(--bg)" strokeWidth="1">
            <title>{`${p.win ? "Победа" : "Поражение"} vs ${p.opponent || "?"}${p.map ? ` · ${p.map}` : ""}\nMMR ${p.mmr} (${p.delta >= 0 ? "+" : ""}${p.delta})${p.mult > 1 ? ` · ×${p.mult}` : ""}${p.date ? `\n${fmtDate(p.date)}` : ""}`}</title>
          </circle>
        ))}

        {/* Даты по краям */}
        {points[0].date && (
          <text x={X(xsDays[0])} y={H - 10} textAnchor="start" fontSize="10" fill="var(--muted)">{fmtDate(points[0].date)}</text>
        )}
        {canProject && (
          <text x={W - pad.r + 4} y={H - 10} textAnchor="end" fontSize="9" fill="var(--accent)">+30д</text>
        )}
      </svg>
    </div>
  );
}
