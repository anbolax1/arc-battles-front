import type { MmrPoint } from "@/lib/types";
import { fmtDate } from "@/lib/format";

/** График динамики MMR по матчам. Статичный SVG (работает в RSC), в стиле проекта:
    линия — акцент MMR (оранжевый), заливка-градиент, базовая линия 1000, точки — победа/поражение.
    Тултип по наведению на точку — нативный <title>. */
export function MmrChart({ points, start = 1000 }: { points: MmrPoint[]; start?: number }) {
  if (!points.length) {
    return (
      <div className="panel flex h-40 items-center justify-center text-sm text-muted">
        Нет сыгранных матчей — график появится после первого.
      </div>
    );
  }

  const W = 720;
  const H = 240;
  const pad = { l: 46, r: 16, t: 18, b: 30 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const n = points.length;

  const vals = points.map((p) => p.mmr).concat([start]);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const span = Math.max(24, maxV - minV);
  const lo = minV - span * 0.14;
  const hi = maxV + span * 0.14;

  const x = (i: number) => (n <= 1 ? pad.l + innerW / 2 : pad.l + (innerW * i) / (n - 1));
  const y = (v: number) => pad.t + innerH * (1 - (v - lo) / (hi - lo));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.mmr).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${x(n - 1).toFixed(1)} ${(pad.t + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(pad.t + innerH).toFixed(1)} Z`;
  const baseY = y(start);

  const last = points[n - 1];
  const netFromStart = last.mmr - start;

  return (
    <div className="panel p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-display text-sm uppercase tracking-wide text-muted">Динамика MMR</span>
        <span className="text-xs text-muted">
          {n} матч(ей) ·{" "}
          <span className={netFromStart >= 0 ? "text-primary-2" : "text-danger"}>
            {netFromStart >= 0 ? "+" : ""}
            {netFromStart} с начала
          </span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="График изменения MMR по матчам">
        <defs>
          <linearGradient id="mmr-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary-2)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary-2)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Базовая линия старта (1000) */}
        <line x1={pad.l} y1={baseY} x2={W - pad.r} y2={baseY} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="4 4" />
        <text x={pad.l - 6} y={baseY + 3} textAnchor="end" fontSize="10" fill="var(--muted)">
          {start}
        </text>

        {/* Мин/макс подписи оси Y */}
        <text x={pad.l - 6} y={y(hi) + 8} textAnchor="end" fontSize="10" fill="var(--muted)">
          {Math.round(hi)}
        </text>
        <text x={pad.l - 6} y={y(lo)} textAnchor="end" fontSize="10" fill="var(--muted)">
          {Math.round(lo)}
        </text>

        {/* Площадь + линия */}
        {n > 1 && <path d={areaPath} fill="url(#mmr-area)" />}
        {n > 1 && <path d={linePath} fill="none" stroke="var(--primary-2)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}

        {/* Точки: победа — акцент, поражение — danger */}
        {points.map((p, i) => (
          <circle
            key={p.tournamentId + i}
            cx={x(i)}
            cy={y(p.mmr)}
            r={n > 40 ? 2.5 : 3.5}
            fill={p.win ? "var(--accent)" : "var(--danger)"}
            stroke="var(--bg)"
            strokeWidth="1"
          >
            <title>
              {`${p.win ? "Победа" : "Поражение"} vs ${p.opponent || "?"}${p.map ? ` · ${p.map}` : ""}\nMMR ${p.mmr} (${p.delta >= 0 ? "+" : ""}${p.delta})${p.mult > 1 ? ` · ×${p.mult}` : ""}${p.date ? `\n${fmtDate(p.date)}` : ""}`}
            </title>
          </circle>
        ))}

        {/* Даты по краям */}
        {points[0].date && (
          <text x={pad.l} y={H - 10} textAnchor="start" fontSize="10" fill="var(--muted)">
            {fmtDate(points[0].date)}
          </text>
        )}
        {n > 1 && last.date && (
          <text x={W - pad.r} y={H - 10} textAnchor="end" fontSize="10" fill="var(--muted)">
            {fmtDate(last.date)}
          </text>
        )}
      </svg>
    </div>
  );
}
