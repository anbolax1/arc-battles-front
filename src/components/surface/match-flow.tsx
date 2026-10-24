"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { chancePercents, drawLabel, DRAW_SHOWN } from "@/lib/chance";
import { useOverlayFeed } from "@/lib/ws";
import type { ChancePoint, ChanceTrail, LiveState, WidgetInstance } from "@/lib/types";
import { ScoreboardWidget } from "@/components/overlay/widgets/scoreboard-widget";
import "./match-flow.css";

const STEP_MS = 1000; // шаг повтора
const BOARD_W = 680; // ширина табло, как в эфире; на узком экране оно уменьшается целиком
const REFETCH_MS = 400; // после правки в пульте: пусть сервер успеет записать
const SIDES = ["a", "b"] as const;

const BOARD: WidgetInstance = {
  id: "flow",
  type: "scoreboard",
  x: 0,
  y: 0,
  scale: 1,
  z: 1,
  visible: true,
  bg: { on: true, opacity: 0.92 },
  showChanceBar: true,
};

/** Кто в рейде после каждой точки: в раунде первой рейдит A, её закрытый рейд передаёт ход B. */
function raiders(points: ChancePoint[], rounds: number): { side: number; round: number }[] {
  let side = 0;
  let round = 1;
  return points.map((p) => {
    if (p.kind === "start") {
      side = 0;
      round = 1;
    } else if (p.kind === "raid") {
      if (p.side === 0) {
        side = 1;
        round = p.round;
      } else {
        round = p.round + 1;
        side = round > rounds ? -1 : 0;
      }
    } else if (p.kind === "end" || p.kind === "duel") {
      side = -1;
    } else if (p.side >= 0) {
      side = p.side;
      round = p.round;
    }
    return { side, round: Math.min(Math.max(round, 1), rounds) };
  });
}

function boardState(
  p: ChancePoint,
  raider: { side: number; round: number },
  names: [string, string],
  rounds: number,
  last: boolean,
  finished: boolean,
  duel: boolean,
): LiveState {
  return {
    tournamentName: "ход матча",
    status: "live",
    stage: last && finished ? "finished" : "round",
    mode: "1x1",
    currentRound: raider.round,
    totalRounds: rounds,
    currentParticipantId: raider.side >= 0 ? SIDES[raider.side] : undefined,
    currentName: raider.side >= 0 ? names[raider.side] : "",
    currentPoints: raider.side >= 0 ? p.score[raider.side] : 0,
    tasks: [],
    standings: [
      { participantId: "a", name: names[0], points: p.score[0], roundPoints: 0 },
      { participantId: "b", name: names[1], points: p.score[1], roundPoints: 0 },
    ],
    showStandings: false,
    chance: p.chance,
    duel,
  };
}

function stepText(p: ChancePoint): string {
  if (!p.delta) return p.text;
  return `${p.text} ${p.delta > 0 ? "+" : "−"}${Math.abs(p.delta)}`;
}

/** Линия - шанс A: дуэль при равном счёте в нём уже учтена. */
const balance = (p: ChancePoint) => p.chance.a;

function Chart({
  points,
  step,
  names,
  onPick,
}: {
  points: ChancePoint[];
  step: number;
  names: [string, string];
  onPick: (i: number) => void;
}) {
  const box = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(720);
  const [hover, setHover] = React.useState<number | null>(null);
  React.useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setW(Math.max(280, Math.round(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = w < 520 ? 190 : 220;
  const L = 40;
  const R = 12;
  const T = 10;
  const B = 26;
  const n = Math.max(points.length - 1, 1);
  const x = (i: number) => L + (i / n) * (w - L - R);
  const y = (v: number) => T + (1 - v) * (H - T - B);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(balance(p)).toFixed(1)}`).join("");
  const area = points.length ? `${line}L${x(points.length - 1).toFixed(1)},${y(0.5)}L${x(0)},${y(0.5)}Z` : "";
  const bounds: { at: number; round: number }[] = [];
  points.forEach((p, i) => {
    if (i > 0 && p.round !== points[i - 1].round && p.kind !== "raid" && p.kind !== "end") bounds.push({ at: i - 0.5, round: p.round });
  });
  const cur = points[step];
  const pick = (clientX: number) => {
    const el = box.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * w;
    return Math.max(0, Math.min(points.length - 1, Math.round(((px - L) / (w - L - R)) * n)));
  };
  const hp = hover != null ? points[hover] : null;
  const hpct = hp ? chancePercents(hp.chance) : null;
  return (
    <div className="sf-flow-chart" ref={box}>
      <svg viewBox={`0 0 ${w} ${H}`} width={w} height={H} role="img" aria-label={`Шанс ${names[0]} и ${names[1]} по ходу матча`}>
        <defs>
          <clipPath id="sf-flow-top">
            <rect x={0} y={0} width={w} height={y(0.5)} />
          </clipPath>
          <clipPath id="sf-flow-bottom">
            <rect x={0} y={y(0.5)} width={w} height={H} />
          </clipPath>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={L} x2={w - R} y1={y(v)} y2={y(v)} className={v === 0.5 ? "mid" : "grid"} />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" className="tick">
              {Math.round(v * 100)}%
            </text>
          </g>
        ))}
        <text x={L + 4} y={H - 8} className="tick">
          раунд 1
        </text>
        {bounds.map((b) => (
          <g key={b.at}>
            <line x1={x(b.at)} x2={x(b.at)} y1={T} y2={H - B} className="mid" />
            <text x={x(b.at) + 5} y={H - 8} className="tick">
              раунд {b.round}
            </text>
          </g>
        ))}
        <path d={area} className="area-a" clipPath="url(#sf-flow-top)" />
        <path d={area} className="area-b" clipPath="url(#sf-flow-bottom)" />
        <path d={line} className="line" />
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="cross" />}
        {cur && <circle cx={x(step)} cy={y(balance(cur))} r={5.5} className={balance(cur) >= 0.5 ? "dot a" : "dot b"} />}
        <rect
          x={L}
          y={0}
          width={w - L - R}
          height={H}
          fill="transparent"
          style={{ cursor: "pointer" }}
          onPointerMove={(e) => setHover(pick(e.clientX))}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => onPick(pick(e.clientX))}
        />
      </svg>
      {hp && hpct && hover != null && (
        <div className="sf-flow-tip" style={{ left: `${Math.min(Math.max((x(hover) / w) * 100, 18), 82)}%`, top: y(balance(hp)) }}>
          <b>
            {names[0]} {hpct[0]}% · {names[1]} {hpct[2]}%
          </b>
          {hpct[1] >= DRAW_SHOWN && <span>{drawLabel(hpct[1])}</span>}
          <span>
            {hp.score[0]}:{hp.score[1]} · {stepText(hp)}
          </span>
        </div>
      )}
    </div>
  );
}

/** Идущий матч: после каждой правки в пульте (она приходит в состоянии оверлея) график перечитывается. */
function LiveRefetch({ id, onTrail }: { id: string; onTrail: (t: ChanceTrail) => void }) {
  const feed = useOverlayFeed();
  const st = feed.state;
  const key = st?.tournamentId === id ? JSON.stringify([st.chance, st.chanceTrail?.length, st.standings?.map((x) => x.points)]) : "";
  React.useEffect(() => {
    if (!key) return;
    const t = setTimeout(async () => {
      try {
        onTrail(await api.get<ChanceTrail>(`/tournaments/${encodeURIComponent(id)}/chance`));
      } catch {
        /* следующая правка попробует снова */
      }
    }, REFETCH_MS);
    return () => clearTimeout(t);
  }, [key, id, onTrail]);
  return null;
}

/** Ход матча: табло, как в эфире, и график шанса; матч можно проиграть по шагам. У идущего матча
    график растёт вместе с эфиром. */
export function MatchFlow({ id, initial, names, rounds }: { id: string; initial: ChanceTrail; names: [string, string]; rounds: number }) {
  const [trail, setTrail] = React.useState(initial);
  const points = trail.points;
  const [step, setStep] = React.useState(Math.max(points.length - 1, 0));
  const [playing, setPlaying] = React.useState(false);
  // Пока зритель листает историю, новые точки не перебрасывают его к концу.
  const following = React.useRef(true);
  const live = trail.live;
  const onTrail = React.useCallback((next: ChanceTrail) => {
    setTrail(next);
    if (following.current) setStep(Math.max(next.points.length - 1, 0));
  }, []);

  React.useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setStep((s) => {
        if (s >= points.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, STEP_MS);
    return () => clearInterval(t);
  }, [playing, points.length]);

  const screen = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = React.useState(1);
  React.useEffect(() => {
    const el = screen.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setZoom(Math.min(1, (el.clientWidth - 24) / BOARD_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (points.length < 3) return null;
  const go = (i: number) => {
    const v = Math.max(0, Math.min(points.length - 1, i));
    following.current = v === points.length - 1;
    setStep(v);
  };
  const ride = raiders(points, rounds);
  const cur = points[step];
  const prev = step > 0 ? points[step - 1] : null;
  const pct = chancePercents(cur.chance);
  const dA = prev ? pct[0] - chancePercents(prev.chance)[0] : 0;
  const finished = !live;
  const last = step === points.length - 1;
  const duelFrom = points.findIndex((p) => p.kind === "duel");

  return (
    <div className="sf-m-block sf-flow" id="flow">
      {live && <LiveRefetch id={id} onTrail={onTrail} />}
      <p className="sf-eyebrow">{live ? "Матч идёт" : "Повтор матча"}</p>
      <h2 className="sf-h-mid">
        шанс на победу<span className="sf-dot">.</span>
      </h2>
      <p className="sf-flow-lead">
        Шанс считается после каждого действия ведущего: нока, задания, ручных очков и закрытого рейда. Он знает темп ноков и заданий каждого
        рейдера, карту раунда и сколько рейдов осталось. Ничья - шанс равного счёта после всех рейдов: тогда матч решает
        дуэль до первого нока.
      </p>
      <div className="sf-flow-screen" ref={screen}>
        <div className="sf-flow-board" style={{ width: BOARD_W, zoom }}>
          <ScoreboardWidget state={boardState(cur, ride[step], names, rounds, last, finished, duelFrom >= 0 && step >= duelFrom)} instance={BOARD} />
        </div>
      </div>
      <div className="sf-flow-ctl">
        <button type="button" className="sf-flow-btn" onClick={() => {
            setPlaying(false);
            go(0);
          }} aria-label="В начало">
          ⏮
        </button>
        <button type="button" className="sf-flow-btn" onClick={() => {
            setPlaying(false);
            go(step - 1);
          }} aria-label="Шаг назад">
          ◀
        </button>
        <button type="button" className="sf-flow-btn" onClick={() => {
            setPlaying(false);
            go(step + 1);
          }} aria-label="Шаг вперёд">
          ▶
        </button>
        <button
          type="button"
          className="sf-flow-btn play"
          onClick={() => {
            if (playing) {
              setPlaying(false);
              return;
            }
            if (step >= points.length - 1) go(0);
            following.current = false;
            setPlaying(true);
          }}
        >
          {playing ? "❚❚ Пауза" : "▶ Проиграть"}
        </button>
        {live && step < points.length - 1 && (
          <button type="button" className="sf-flow-btn" onClick={() => {
              setPlaying(false);
              go(points.length - 1);
            }}>
            К эфиру
          </button>
        )}
        <input
          type="range"
          className="sf-flow-range"
          min={0}
          max={points.length - 1}
          value={step}
          aria-label="Шаг матча"
          onChange={(e) => {
            setPlaying(false);
            go(+e.target.value);
          }}
        />
      </div>
      <p className="sf-flow-ev" aria-live="polite">
        <span className="n">
          шаг {step + 1} из {points.length}
          {cur.kind !== "start" ? ` · раунд ${cur.round}` : ""}
        </span>
        <b>{stepText(cur)}</b>
        <span>
          шанс {names[0]} {pct[0]}%
          {dA !== 0 && (
            <i className={dA > 0 ? "sf-up" : "sf-down"}>
              {" "}
              ({dA > 0 ? "+" : "−"}
              {Math.abs(dA)})
            </i>
          )}
        </span>
        {pct[1] >= DRAW_SHOWN && <span className="n">{drawLabel(pct[1])}</span>}
      </p>
      <div className="sf-flow-legend">
        <span>
          <i className="sw a" />
          выше середины - фаворит {names[0]}
        </span>
        <span>
          <i className="sw b" />
          ниже - {names[1]}
        </span>
      </div>
      <Chart points={points} step={step} names={names} onPick={(i) => (setPlaying(false), go(i))} />
    </div>
  );
}
