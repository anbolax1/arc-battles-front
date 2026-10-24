import type { ChanceDot } from "@/lib/types";
import { chancePercents, drawLabel, DRAW_SHOWN } from "@/lib/chance";
import { useJump, useTween } from "@/lib/use-chance";
import { JumpSwap } from "./chance-jump";
import { WidgetFrame } from "./frame";
import type { WidgetProps } from "./types";

const W = 300;
const H = 60;

/** Шанс стороны с её ником: при заметном росте ник на пару секунд сменяет стрелка. */
function Pct({ value, name, right }: { value: number; name: string; right: boolean }) {
  const shown = useTween(value);
  const jump = useJump(value);
  return (
    <div className={`flex min-w-0 flex-col ${right ? "items-end text-right" : "items-start"}`}>
      <span className={`font-display text-3xl leading-none tnum ${right ? "text-accent" : "text-primary-2"}`}>{shown}%</span>
      <JumpSwap
        jump={jump}
        end={right}
        className="mt-1 max-w-[7rem]"
        labelClassName="truncate text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted"
      >
        {name}
      </JumpSwap>
    </div>
  );
}

/** График шанса стороны A по ходу матча: выше середины - фаворит A, ниже - B. */
function Trail({ dots }: { dots: ChanceDot[] }) {
  const n = Math.max(dots.length - 1, 1);
  const x = (i: number) => (i / n) * W;
  const y = (p: number) => H - p * H;
  const line = dots.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.a).toFixed(1)}`).join("");
  const end = x(dots.length - 1).toFixed(1);
  const area = dots.length ? `${line}L${end},${H / 2}L0,${H / 2}Z` : "";
  const bounds = dots.flatMap((d, i) => (i > 0 && d.round !== dots[i - 1].round ? [x(i - 0.5)] : []));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-12 w-full" aria-hidden>
      <defs>
        <clipPath id="ov-chance-top">
          <rect x={0} y={0} width={W} height={H / 2} />
        </clipPath>
        <clipPath id="ov-chance-bottom">
          <rect x={0} y={H / 2} width={W} height={H / 2} />
        </clipPath>
      </defs>
      {bounds.map((bx) => (
        <line key={bx} x1={bx} x2={bx} y1={0} y2={H} stroke="rgba(255,255,255,0.12)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="rgba(255,255,255,0.22)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <path d={area} fill="var(--primary)" fillOpacity={0.35} clipPath="url(#ov-chance-top)" />
      <path d={area} fill="var(--accent)" fillOpacity={0.35} clipPath="url(#ov-chance-bottom)" />
      <path d={line} fill="none" stroke="#f5f5f7" strokeWidth={1.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Виджет «График шанса»: шансы сторон сейчас, ничья и как они менялись в этом матче. */
export function ChanceWidget({ state, instance }: WidgetProps) {
  const standings = state.standings ?? [];
  const c = state.chance;
  if (!c || standings.length < 2) return null;
  const [pa, pd, pb] = chancePercents(c);
  const finished = state.stage === "finished";
  const total = state.totalRounds ?? 1;
  const dots = state.chanceTrail?.length ? state.chanceTrail : [{ a: c.a, draw: c.draw, round: state.currentRound || 1 }];
  return (
    <WidgetFrame instance={instance}>
      <div className="flex h-full flex-col justify-center gap-1.5 px-4 py-2.5">
        <div className="flex items-baseline justify-between gap-3 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted">
          <span>{instance.hideTitle ? "" : "шанс на победу"}</span>
          <span>{finished ? "итог" : total > 1 ? `раунд ${state.currentRound || 1}/${total}` : ""}</span>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <Pct value={pa} name={standings[0].name} right={false} />
          <div className="flex min-w-0 flex-col items-center gap-1">
            <Trail dots={dots} />
            {!finished && pd >= DRAW_SHOWN && (
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted">{drawLabel(pd)}</span>
            )}
          </div>
          <Pct value={pb} name={standings[1].name} right />
        </div>
      </div>
    </WidgetFrame>
  );
}
