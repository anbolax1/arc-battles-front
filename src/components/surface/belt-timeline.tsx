"use client";

import { useRef, useState } from "react";
import type { Belt } from "@/lib/types";
import { dayMonth } from "@/components/surface/fmt";
import { plural, W_DAY } from "@/components/surface/season-lib";
import { W_GAMEDAY, holderName, howEnded, howTaken, reignDays } from "@/components/surface/belt-lib";

export interface TimelineSeason {
  label: string;
  from: string;
  to?: string;
}

const W = 1000;
const BAR_Y = 46;
const BAR_H = 32;
const DOT_Y = 96;
const AXIS_Y = 140;
const MONTHS = ["янв", "фев", "март", "апр", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const PAST = "#6e5e77";
const NOW = "#f1aa1c";

type Tip = { x: number; y: number; lines: string[] };

/** Кто и когда держал пояс: отрезки владений, точки защит, выпадения и ничей пояс на одной шкале времени. */
export function BeltTimeline({ belt, seasons, now }: { belt: Belt; seasons: TimelineSeason[]; now: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  if (!belt.reigns.length) return null;

  const t0 = Date.parse(belt.reigns[0].from) - 864e5;
  const t1 = now + 864e5;
  const x = (iso: string | number) => (((typeof iso === "number" ? iso : Date.parse(iso)) - t0) / (t1 - t0)) * W;

  const show = (lines: string[]) => (e: { currentTarget: Element }) => {
    const host = box.current?.getBoundingClientRect();
    const r = e.currentTarget.getBoundingClientRect();
    if (!host) return;
    setTip({ x: r.left + r.width / 2 - host.left, y: r.top - host.top, lines });
  };
  const hide = () => setTip(null);
  const hover = (lines: string[]) => ({ onPointerEnter: show(lines), onPointerLeave: hide, onFocus: show(lines), onBlur: hide, tabIndex: 0 });

  const months: { at: number; label: string }[] = [];
  const start = new Date(t0);
  for (let m = start.getUTCMonth() + 1; ; m++) {
    const at = Date.UTC(start.getUTCFullYear(), m, 1);
    if (at >= t1) break;
    months.push({ at, label: MONTHS[new Date(at).getUTCMonth()] });
  }

  return (
    <div className="bl-chart" ref={box}>
      <div className="bl-chart-scroll">
        <svg viewBox={`0 0 ${W} 164`} role="img" aria-label="История пояса лиги: кто и когда его держал">
          <defs>
            <pattern id="bl-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="1.6" height="6" fill="rgba(236,226,208,.5)" />
            </pattern>
          </defs>
          {seasons.map((s) => {
            const a = Math.max(0, x(s.from));
            if (a >= W) return null;
            return (
              <g key={s.from}>
                <line x1={a} x2={a} y1="0" y2={AXIS_Y} stroke="rgba(236,226,208,.18)" />
                <text x={a + 6} y="14" className="bl-chart-season">
                  {s.label}
                </text>
              </g>
            );
          })}
          {belt.reigns.map((r, i) => {
            const a = x(r.from);
            const b = x(r.to ?? now);
            const w = Math.max(2, b - a - 2);
            const current = !r.end;
            const name = holderName(r.holder);
            const days = reignDays(r, now);
            const lines = [
              `${name}${r.time > 1 ? ` · ${r.time}-й раз` : ""}`,
              `${dayMonth(r.from)} — ${r.to ? dayMonth(r.to) : "сейчас"} · ${days} ${plural(days, W_DAY)}`,
              `взял: ${howTaken(r)}`,
              `защит: ${r.defenses.length}`,
              howEnded(r, belt.rustLimit),
            ];
            const hit = Math.max(14, w);
            return (
              <g key={r.matchId + i} className="bl-chart-bar" {...hover(lines)} aria-label={lines.join(", ")}>
                <rect x={a + w / 2 - hit / 2} y={BAR_Y - 8} width={hit} height={BAR_H + 16} fill="transparent" />
                <rect className="vis" x={a} y={BAR_Y} width={w} height={BAR_H} rx="2" fill={current ? NOW : PAST} />
                {w > name.length * 7.2 + 14 && (
                  <text x={a + 7} y={BAR_Y + 21} className={`bl-chart-name ${current ? "now" : ""}`}>
                    {name}
                  </text>
                )}
              </g>
            );
          })}
          {belt.reigns.map((r, i) =>
            r.end === "drop" && r.to && belt.reigns[i + 1] ? (
              <rect key={`v${i}`} x={x(r.to)} y={BAR_Y} width={Math.max(3, x(belt.reigns[i + 1].from) - x(r.to) - 2)} height={BAR_H} fill="url(#bl-hatch)" />
            ) : null,
          )}
          {belt.reigns.map((r) =>
            r.defenses.map((d, j) => {
              const cx = x(d.at);
              const lines = [
                `${j + 1}-я защита · ${holderName(r.holder)}`,
                `${dayMonth(d.at)} · против ${holderName(d.opponent)}`,
                d.score ? `счёт ${d.score[0]}:${d.score[1]}${d.double ? " · жетон ×2" : ""}` : "матч из таблицы, без счёта",
              ];
              return (
                <g key={d.matchId} className="bl-chart-dot" {...hover(lines)} aria-label={lines.join(", ")}>
                  <circle cx={cx} cy={DOT_Y} r="12" fill="transparent" />
                  <line x1={cx} x2={cx} y1={BAR_Y + BAR_H + 1} y2={DOT_Y - 5} stroke="rgba(236,226,208,.35)" />
                  <circle cx={cx} cy={DOT_Y} r="4.5" fill="#ece2d0" stroke="#1c0f22" strokeWidth="2" />
                </g>
              );
            }),
          )}
          {belt.reigns.map((r) =>
            r.end === "drop" && r.to
              ? (() => {
                  const cx = x(r.to);
                  const lines = [`Пояс выпал · ${dayMonth(r.to)}`, `${holderName(r.holder)} не играл ${belt.rustLimit} ${plural(belt.rustLimit, W_GAMEDAY)} подряд`, "ничей пояс ушёл в ближайший матч лидера таблицы"];
                  return (
                    <g key={`d${r.matchId}`} className="bl-chart-drop" {...hover(lines)} aria-label={lines.join(", ")}>
                      <rect x={cx - 10} y={DOT_Y + 8} width="58" height="22" fill="transparent" />
                      <path d={`M${cx - 6} ${DOT_Y + 12} L${cx + 6} ${DOT_Y + 12} L${cx} ${DOT_Y + 22} Z`} fill="#ff5a47" />
                      <text x={cx + 9} y={DOT_Y + 21} className="bl-chart-droptext">
                        выпал
                      </text>
                    </g>
                  );
                })()
              : null,
          )}
          <line x1="0" x2={W} y1={AXIS_Y} y2={AXIS_Y} stroke="rgba(236,226,208,.25)" />
          {months.map((m) => (
            <g key={m.at}>
              <line x1={x(m.at)} x2={x(m.at)} y1={AXIS_Y} y2={AXIS_Y + 5} stroke="rgba(236,226,208,.35)" />
              <text x={x(m.at) + 4} y={AXIS_Y + 18} className="bl-chart-axis">
                {m.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {tip && (
        <div className="bl-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.lines.map((l, i) => (i ? <span key={i}>{l}</span> : <b key={i}>{l}</b>))}
        </div>
      )}
    </div>
  );
}
