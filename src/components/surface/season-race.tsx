"use client";

import * as React from "react";
import { useSeason } from "@/components/surface/season-client";
import { dLong, dShort, dayTime } from "@/components/surface/season-lib";
import { PlayGlyph } from "@/components/surface/ui";

const MIN = 900, MAX = 1500, TOP = 10;
// Темп в секундах: обычный день, день смены лидера, последний день, пауза перед стартом.
const PACE = { base: 0.95, slow: 1.8, last: 3, head: 1.2 };
// Жёсткость пружины, на которой строки переезжают с места на место.
const SPRING = 7;
// Строка, ушедшая из десятки, уезжает чуть ниже края и гаснет.
const OUT = TOP + 0.6;

interface Row {
  i: number;
  v: (number | null)[];
  m: number[];
  start: number;
}

/** Модель гонки: MMR на конец каждого дня, между днями - гладкая кривая без перелётов (монотонный сплайн). */
function raceModel(curves: Array<Array<[number, number, number]>>, dayEnds: number[], startMmr: number) {
  const N = dayEnds.length + 1;
  const R: Row[] = [];
  curves.forEach((c, i) => {
    const v: (number | null)[] = [null];
    for (const end of dayEnds) {
      let x: number | null = null;
      for (const [t, mmr] of c) {
        if (t >= end) break;
        x = mmr;
      }
      v.push(x);
    }
    const first = v.findIndex((x) => x != null);
    if (first < 1) return;
    const start = first - 1;
    v[start] = startMmr;
    const m: number[] = [];
    for (let k = start; k < N; k++) {
      if (k === start || k === N - 1) {
        m[k] = 0;
        continue;
      }
      const a = (v[k] as number) - (v[k - 1] as number), b = (v[k + 1] as number) - (v[k] as number);
      m[k] = a * b <= 0 ? 0 : (2 * a * b) / (a + b);
    }
    R.push({ i, v, m, start });
  });
  return { N, R };
}

function valAt(r: Row, f: number, N: number): number | null {
  if (f < r.start) return null;
  if (f >= N - 1) return r.v[N - 1];
  const i = Math.floor(f), u = f - i, u2 = u * u, u3 = u2 * u;
  const a = r.v[i] as number, b = r.v[i + 1] as number;
  return (2 * u3 - 3 * u2 + 1) * a + (u3 - 2 * u2 + u) * r.m[i] + (-2 * u3 + 3 * u2) * b + (u3 - u2) * r.m[i + 1];
}

/** Таблица на момент f: при равенстве - порядок дня из итогов, как в таблице лидеров. */
function orderAt(R: Row[], f: number, N: number, dayRank: Array<Map<number, number>>): Array<[number, number]> {
  const rank = dayRank[Math.max(0, Math.min(dayRank.length - 1, Math.ceil(f) - 1))];
  const out: Array<[number, number]> = [];
  for (const r of R) {
    const x = valAt(r, f, N);
    if (x != null) out.push([r.i, x]);
  }
  out.sort((a, b) => b[1] - a[1] || (rank.get(a[0]) ?? 1e9) - (rank.get(b[0]) ?? 1e9));
  return out;
}

const pctOf = (v: number) => Math.max(0, Math.min(1, (v - MIN) / (MAX - MIN))) * 100;

/** Гонка сезона: десятка по MMR день за днём, весь сезон примерно за минуту. Сама запускается, когда
    показалась на экране; без движения - итог последнего дня. */
export function SeasonRace() {
  const { recap, colors } = useSeason();
  const P = recap.players;
  const model = React.useMemo(() => {
    const ends = recap.days.map((d) => Date.parse(`${d.date}T00:00:00+03:00`) + 864e5);
    const m = raceModel(
      P.map((p) => p.curve),
      ends,
      recap.summary.startMmr,
    );
    const dayRank = recap.days.map((d) => new Map(d.order.map((p, k) => [p, k])));
    const leaders = [null, ...recap.days.map((d) => d.order[0] ?? null)];
    const dur: number[] = [];
    for (let k = 0; k < m.N - 1; k++) dur.push(k === m.N - 2 ? PACE.last : leaders[k + 1] !== leaders[k] ? PACE.slow : PACE.base);
    const total = PACE.head + dur.reduce((s, x) => s + x, 0);
    return { ...m, dayRank, dur, total };
  }, [recap, P]);
  const { N, R, dayRank } = model;
  const final = React.useMemo(() => orderAt(R, N - 1, N, dayRank), [R, N, dayRank]);
  const finalRank = new Map(final.map(([p], k) => [p, k]));
  const lead0 = final[0];

  const listRef = React.useRef<HTMLOListElement>(null);
  const dateRef = React.useRef<HTMLElement>(null);
  const dayRef = React.useRef<HTMLElement>(null);
  const leaderRef = React.useRef<HTMLElement>(null);
  const seekRef = React.useRef<HTMLInputElement>(null);
  const chipsRef = React.useRef<HTMLDivElement>(null);
  const ctl = React.useRef<{ play: () => void; stop: () => void; jump: (f: number) => void } | null>(null);
  const [state, setState] = React.useState<"end" | "playing" | "paused">("end");

  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const rows = new Map<number, { li: HTMLElement; rank: HTMLElement; bar: HTMLElement; val: HTMLElement; crown: HTMLElement }>();
    list.querySelectorAll<HTMLElement>("li[data-p]").forEach((li) => {
      rows.set(Number(li.dataset.p), {
        li,
        rank: li.querySelector(".rk") as HTMLElement,
        bar: li.querySelector(".bar") as HTMLElement,
        val: li.querySelector(".val") as HTMLElement,
        crown: li.querySelector(".crown") as HTMLElement,
      });
    });
    let rowH = 34;
    const measure = () => {
      rowH = parseFloat(getComputedStyle(list).getPropertyValue("--row")) || 34;
    };
    measure();
    addEventListener("resize", measure);
    const Y = new Map<number, number>(), V = new Map<number, number>();
    const spring = (i: number, target: number, dt: number | null) => {
      const y = Y.get(i);
      if (dt == null || y == null) {
        Y.set(i, target);
        V.set(i, 0);
        return target;
      }
      const x = y - target, k = (V.get(i) ?? 0) + SPRING * x, e = Math.exp(-SPRING * dt);
      Y.set(i, target + (x + k * dt) * e);
      V.set(i, ((V.get(i) ?? 0) - SPRING * k * dt) * e);
      return Y.get(i) as number;
    };
    const chips = chipsRef.current ? Array.from(chipsRef.current.querySelectorAll<HTMLElement>("[data-from]")) : [];
    const draw = (f: number, dt: number | null) => {
      const ord = orderAt(R, f, N, dayRank);
      const rank = new Map(ord.map(([p], k) => [p, k]));
      const lead = ord.length ? ord[0][0] : null;
      for (const r of R) {
        const w = rows.get(r.i);
        if (!w) continue;
        const val = valAt(r, f, N);
        if (val == null) {
          w.li.style.opacity = "0";
          Y.set(r.i, OUT);
          V.set(r.i, 0);
          continue;
        }
        const k = rank.get(r.i) ?? 1e9;
        const y = spring(r.i, k < TOP ? k : OUT, dt);
        const vis = Math.max(0, Math.min(1, TOP - y));
        const bw = pctOf(val);
        w.li.style.transform = `translateY(${(y * rowH).toFixed(1)}px)`;
        w.li.style.opacity = vis.toFixed(2);
        w.li.style.zIndex = String(1000 - (k < TOP ? k : TOP) * 10 - Math.round(y));
        w.li.setAttribute("aria-hidden", vis < 0.5 ? "true" : "false");
        w.bar.style.width = `${bw.toFixed(2)}%`;
        w.val.style.left = `${bw.toFixed(2)}%`;
        w.val.textContent = String(Math.round(val));
        w.rank.textContent = k < TOP ? String(k + 1) : "";
        w.crown.hidden = !(r.i === lead && f >= 0.5);
      }
      const di = Math.round(f);
      if (dateRef.current) dateRef.current.textContent = di === 0 ? "старт сезона" : dLong(dayTime(recap.days[di - 1].date));
      if (dayRef.current) dayRef.current.textContent = di === 0 ? `у всех ${recap.summary.startMmr}` : `день ${di} из ${N - 1}`;
      if (leaderRef.current)
        leaderRef.current.textContent = f < 0.5 ? `у всех ${recap.summary.startMmr}` : lead != null ? `${P[lead].login} · ${Math.round(ord[0][1])}` : "–";
      if (seekRef.current) {
        seekRef.current.value = String(Math.round(f * 10));
        seekRef.current.style.setProperty("--p", `${((f / (N - 1)) * 100).toFixed(2)}%`);
      }
      for (const c of chips) c.classList.toggle("on", di >= Number(c.dataset.from) && di <= Number(c.dataset.to));
    };
    const fAt = (t: number) => {
      t -= PACE.head;
      if (t <= 0) return 0;
      for (let i = 0; i < model.dur.length; i++) {
        if (t < model.dur[i]) return i + t / model.dur[i];
        t -= model.dur[i];
      }
      return N - 1;
    };
    const tAt = (f: number) => {
      let t = PACE.head, i = 0;
      for (; i < Math.floor(f) && i < model.dur.length; i++) t += model.dur[i];
      if (i < model.dur.length) t += (f - i) * model.dur[i];
      return t;
    };
    let t = model.total, playing = false, raf = 0, last = 0;
    const tick = (ts: number) => {
      if (!playing) return;
      const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
      last = ts;
      t = Math.min(model.total, t + dt);
      draw(fAt(t), dt);
      if (t >= model.total) {
        playing = false;
        setState("end");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const play = () => {
      if (t >= model.total) {
        t = 0;
        draw(0, null);
      }
      playing = true;
      last = 0;
      setState("playing");
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      playing = false;
      cancelAnimationFrame(raf);
      setState(t >= model.total ? "end" : "paused");
    };
    const jump = (f: number) => {
      playing = false;
      cancelAnimationFrame(raf);
      t = tAt(f);
      draw(f, null);
      setState(f >= N - 1 ? "end" : "paused");
    };
    ctl.current = { play, stop, jump };
    draw(N - 1, null);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting && !seen && !reduce) {
            seen = true;
            t = 0;
            draw(0, null);
            play();
          } else if (!e.isIntersecting && playing) stop();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(list);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      removeEventListener("resize", measure);
      ctl.current = null;
    };
  }, [R, N, dayRank, model, recap, P]);

  const label = state === "playing" ? "Пауза" : state === "end" ? "Проиграть сезон" : "Дальше";
  return (
    <div className="sn-race-box">
      <div className="sn-race-top">
        <div className="sn-race-date">
          <b ref={dateRef}>{recap.days.length ? dLong(dayTime(recap.days[recap.days.length - 1].date)) : ""}</b>
          <small ref={dayRef}>
            день {N - 1} из {N - 1}
          </small>
        </div>
        <div className="sn-race-leader">
          <small>лидер на этот день</small>
          <b ref={leaderRef}>{lead0 ? `${P[lead0[0]].login} · ${Math.round(lead0[1])}` : "–"}</b>
        </div>
      </div>
      <div className="sn-race-area">
        <div className="sn-race-grid" aria-hidden>
          {[900, 1000, 1100, 1200, 1300, 1400, 1500].map((v) => (
            <i key={v} style={{ left: `${pctOf(v)}%` }} />
          ))}
        </div>
        <ol className="sn-race" ref={listRef} aria-label="Десятка таблицы на выбранный день">
          {R.map((r) => {
            const k = finalRank.get(r.i) ?? 1e9;
            const v = valAt(r, N - 1, N) as number;
            const shown = k < TOP;
            return (
              <li
                key={r.i}
                data-p={r.i}
                aria-hidden={!shown}
                style={{ transform: `translateY(calc(var(--row) * ${shown ? k : OUT}))`, opacity: shown ? 1 : 0, zIndex: 1000 - Math.min(k, TOP) * 10 }}
              >
                <span className="rk">{shown ? k + 1 : ""}</span>
                <span className="nm">
                  {P[r.i].login}
                  <span className="crown" hidden={k !== 0}>
                    №1
                  </span>
                </span>
                <span className="tr">
                  <i className="bar" style={{ width: `${pctOf(v)}%`, background: colors.get(r.i) ?? "var(--sn-other)" }} />
                  <span className="val" style={{ left: `${pctOf(v)}%` }}>
                    {Math.round(v)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="sn-race-axis" aria-hidden>
          {[900, 1000, 1100, 1200, 1300, 1400, 1500].map((v) => (
            <span key={v} style={{ left: `${pctOf(v)}%` }}>
              {v}
            </span>
          ))}
        </div>
      </div>
      <div className="sn-race-ctrl">
        <button className="sf-btn sf-btn-amber" type="button" onClick={() => (state === "playing" ? ctl.current?.stop() : ctl.current?.play())}>
          {state === "playing" ? (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          ) : (
            <PlayGlyph />
          )}
          {label}
        </button>
        <input
          ref={seekRef}
          className="sn-seek"
          type="range"
          min={0}
          max={(N - 1) * 10}
          defaultValue={(N - 1) * 10}
          aria-label="День сезона"
          onInput={(e) => ctl.current?.jump(Number(e.currentTarget.value) / 10)}
        />
      </div>
      <div className="sn-leaders" ref={chipsRef} role="group" aria-label="Смены лидера">
        {recap.leaders.map((l) => (
          <button
            key={`${l.player}-${l.from}`}
            type="button"
            className={`sn-lchip ${l.to === recap.days.length - 1 ? "on" : ""}`}
            data-from={l.from + 1}
            data-to={l.to + 1}
            onClick={() => ctl.current?.jump(l.from + 1)}
          >
            <small>{dShort(dayTime(recap.days[l.from].date))}</small>
            {P[l.player].login}
          </button>
        ))}
      </div>
      <p className="sn-race-legend">
        {[...colors.entries()].map(([i, c]) => (
          <span key={i}>
            <i className="sn-sw" style={{ background: c }} />
            {P[i].login}
          </span>
        ))}
        <span>
          <i className="sn-sw" style={{ background: "var(--sn-other)" }} />
          остальные
        </span>
        <span>шкала от {MIN} MMR, старт сезона {recap.summary.startMmr}</span>
      </p>
    </div>
  );
}
