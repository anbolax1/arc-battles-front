"use client";

/* «Как устроен матч»: четыре этапа. На широком экране блок прилипает и этапы листает прокрутка
   страницы, на узком - таймер, пока блок в кадре. Клик по этапу берёт управление на себя. */

import * as React from "react";
import Link from "next/link";
import { mapImage } from "@/lib/match";
import type { MapInfo } from "@/lib/types";
import { signed } from "@/components/surface/ui";

export interface HowExample {
  id: string;
  a: string;
  b: string;
  sa: number;
  sb: number;
  /** 0 - победила A, 1 - B, -1 - ничья. */
  win: number;
  maps: Array<{ name: string; code?: string }>;
  date: string;
  mult: number;
}

export interface HowCalc {
  a: number;
  b: number;
  nameA?: string;
  nameB?: string;
  date?: string;
  mult?: number;
  delta?: number;
}

const N = 4;
const AUTO_MS = 8000;
const SCENE_MS = [4800, 4200, 1700, 0];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

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

/** Число плавно переходит к новому значению. */
function Tween({ value, format = String, ms = 380, replay = 0 }: { value: number; format?: (n: number) => string; ms?: number; replay?: number }) {
  const [shown, setShown] = React.useState(value);
  const from = React.useRef(value);
  const reduce = useReduced();
  React.useEffect(() => {
    const start = replay ? 0 : from.current;
    from.current = value;
    if (reduce || start === value) {
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setShown(Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms, reduce, replay]);
  return <>{format(shown)}</>;
}

interface PbStep {
  act: "ban" | "pick" | "rest";
  side: "A" | "B" | "";
  code: string;
  round?: number;
}

const pbLabel = (s: PbStep) => (s.act === "ban" ? `бан ${s.side}` : s.act === "pick" ? `пик ${s.side} · Р${s.round}` : `остаток · Р${s.round}`);

const ICON_REPLAY = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
    <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />
  </svg>
);

const TASKS = [
  { b: "Своё задание", s: "общее или на карту раунда", v: 2, r: "-2deg" },
  { b: "Задание соперника", s: "выполнил чужое", v: 1, r: "1.5deg" },
  { b: "Протокол", s: "до 15-й минуты рейда", v: 1, r: "-1deg" },
  { b: "Нок рейдера", s: "ручные очки ведущего", v: 3, r: "2deg" },
  { b: "Легендарное задание", s: "один раз навсегда", v: 10, r: "-1.5deg", leg: true },
];

export function HowItWorks({ maps, example, k, start, calc }: { maps: MapInfo[]; example: HowExample | null; k: number; start: number; calc: HowCalc }) {
  const reduce = useReduced();
  const trackRef = React.useRef<HTMLDivElement>(null);
  const stickyRef = React.useRef<HTMLDivElement>(null);
  const howRef = React.useRef<HTMLDivElement>(null);
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const lineRefs = React.useRef<Array<HTMLElement | null>>([]);

  const [step, setStep] = React.useState(0);
  const [scrolly, setScrolly] = React.useState(false);
  const [auto, setAuto] = React.useState(true);
  const [paused, setPaused] = React.useState(false);
  const [cycle, setCycle] = React.useState(0);
  const stepRef = React.useRef(0);

  // состояние сцен: сколько ходов показано, какой рейд идёт, видно ли счёт, сколько карточек
  const [pbN, setPbN] = React.useState(6);
  const [rdAct, setRdAct] = React.useState(-1);
  const [rdScore, setRdScore] = React.useState(true);
  const [rdReplay, setRdReplay] = React.useState(0);
  const rdScoreRef = React.useRef(true);
  const [t3N, setT3N] = React.useState(TASKS.length);
  const [calcReplay, setCalcReplay] = React.useState(0);

  const pb = React.useMemo<PbStep[]>(() => {
    const m = maps.slice(0, 6).map((x) => x.code);
    if (m.length < 6) return [];
    return [
      { act: "ban", side: "A", code: m[1] },
      { act: "ban", side: "B", code: m[2] },
      { act: "pick", side: "A", code: m[3], round: 1 },
      { act: "ban", side: "B", code: m[5] },
      { act: "ban", side: "A", code: m[4] },
      { act: "rest", side: "", code: m[0], round: 2 },
    ];
  }, [maps]);
  const mapName = (code: string) => maps.find((x) => x.code === code)?.name ?? code;

  /** Сцена этапа i в положении p (0..1): дискретное - через состояние, плавное - прямо в стили. */
  const render = React.useCallback(
    (i: number, p: number) => {
      if (i === 0) setPbN(Math.min(pb.length, Math.floor(p * (pb.length + 1))));
      if (i === 1) {
        const w = [clamp01(p / 0.4), clamp01((p - 0.42) / 0.4)];
        lineRefs.current.forEach((el, j) => el && (el.style.width = `${(w[j] * 100).toFixed(1)}%`));
        setRdAct(p < 0.42 ? 0 : p < 0.84 ? 1 : -1);
        const show = p >= 0.86;
        if (show !== rdScoreRef.current) {
          rdScoreRef.current = show;
          setRdScore(show);
          if (show) setRdReplay((r) => r + 1);
        }
      }
      if (i === 2) setT3N(Math.min(TASKS.length, Math.floor(p * (TASKS.length + 1))));
    },
    [pb.length],
  );

  const activate = React.useCallback(
    (i: number) => {
      if (i === stepRef.current) return;
      stepRef.current = i;
      setStep(i);
      if (i === 3) setCalcReplay((r) => r + 1);
    },
    [],
  );

  /* ----- прокрутка ведёт этапы ----- */
  const topRef = React.useRef(88);
  const scrollyRef = React.useRef(false);
  const layout = React.useCallback(() => {
    const how = howRef.current, sticky = stickyRef.current, track = trackRef.current;
    if (!how || !sticky || !track) return;
    const nav = document.querySelector<HTMLElement>(".sf-nav")?.offsetHeight ?? 64;
    const room = innerHeight - nav;
    const fits = sticky.offsetHeight <= room - 24;
    const want = matchMedia("(min-width: 901px)").matches && fits && !reduce;
    topRef.current = nav + Math.max(12, Math.round((room - sticky.offsetHeight) / 2));
    track.style.setProperty("--how-top", `${topRef.current}px`);
    if (want) {
      const seg = Math.max(320, Math.min(480, innerHeight * 0.5));
      track.style.height = `${Math.round(sticky.offsetHeight + N * seg)}px`;
    } else {
      track.style.height = "";
      if (scrollyRef.current) {
        // вне режима прокрутки сцены видны целиком
        setPbN(pb.length);
        setT3N(TASKS.length);
        lineRefs.current.forEach((el) => el && (el.style.width = "100%"));
        setRdAct(-1);
        rdScoreRef.current = true;
        setRdScore(true);
      }
    }
    scrollyRef.current = want;
    setScrolly(want);
  }, [reduce, pb.length]);

  React.useEffect(() => {
    layout();
    let t = 0;
    const onResize = () => {
      clearTimeout(t);
      t = window.setTimeout(layout, 120);
    };
    addEventListener("resize", onResize);
    document.fonts?.ready.then(layout).catch(() => {});
    return () => {
      removeEventListener("resize", onResize);
      clearTimeout(t);
    };
  }, [layout]);

  React.useEffect(() => {
    if (!scrolly) return;
    let tick = false;
    const onScroll = () => {
      if (tick) return;
      tick = true;
      requestAnimationFrame(() => {
        tick = false;
        const track = trackRef.current, sticky = stickyRef.current;
        if (!track || !sticky) return;
        const span = track.offsetHeight - sticky.offsetHeight;
        const x = clamp01((topRef.current - track.getBoundingClientRect().top) / Math.max(1, span)) * N;
        const i = Math.min(N - 1, Math.floor(x));
        const p = clamp01(x - i);
        if (i !== stepRef.current) {
          for (let j = 0; j < N; j++) if (j !== i) render(j, j < i ? 1 : 0);
        }
        activate(i);
        howRef.current?.style.setProperty("--s", p.toFixed(3));
        render(i, p);
      });
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, [scrolly, render, activate, pb.length]);

  const scrollToStep = (i: number) => {
    const track = trackRef.current, sticky = stickyRef.current;
    if (!track || !sticky) return;
    const span = track.offsetHeight - sticky.offsetHeight;
    const top = scrollY + track.getBoundingClientRect().top - topRef.current + ((i + 0.9) / N) * span;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  };

  /* ----- запасной режим: сцена по времени, этапы листаются сами ----- */
  const [inView, setInView] = React.useState(false);
  const playRaf = React.useRef(0);
  const play = React.useCallback(
    (i: number) => {
      cancelAnimationFrame(playRaf.current);
      const dur = SCENE_MS[i];
      if (!dur || reduce) {
        render(i, 1);
        if (i === 3) setCalcReplay((r) => r + 1);
        return;
      }
      const t0 = performance.now();
      render(i, 0);
      const f = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        render(i, p);
        if (p < 1) playRaf.current = requestAnimationFrame(f);
      };
      playRaf.current = requestAnimationFrame(f);
    },
    [reduce, render],
  );
  React.useEffect(() => () => cancelAnimationFrame(playRaf.current), []);

  React.useEffect(() => {
    const el = howRef.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => setInView(es.some((e) => e.isIntersecting)), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const seen = React.useRef(false);
  React.useEffect(() => {
    if (scrolly || !inView || seen.current) return;
    seen.current = true;
    play(0);
  }, [scrolly, inView, play]);

  const running = !scrolly && auto && !reduce && inView && !paused;
  React.useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => {
      const next = (stepRef.current + 1) % N;
      activate(next);
      play(next);
      setCycle((c) => c + 1);
    }, AUTO_MS);
    return () => clearTimeout(t);
  }, [running, cycle, step, activate, play]);

  const choose = (i: number) => {
    if (scrolly) return scrollToStep(i);
    setAuto(false);
    activate(i);
    play(i);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const d = ({ ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 } as Record<string, number>)[e.key];
    let to: number | null = null;
    if (d) to = Math.max(0, Math.min(N - 1, step + d));
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = N - 1;
    if (to === null) return;
    e.preventDefault();
    choose(to);
    tabRefs.current[to]?.focus({ preventScroll: true });
  };

  /* ----- калькулятор: как на сайте - победитель получает round(K × шанс проигравшего) × множитель ----- */
  const [ca, setCa] = React.useState(calc.a);
  const [cb, setCb] = React.useState(calc.b);
  const [x2, setX2] = React.useState(false);
  const eA = 1 / (1 + Math.pow(10, (cb - ca) / 400));
  const mult = x2 ? 2 : 1;
  const winA = Math.round(k * (1 - eA)) * mult;
  const winB = Math.round(k * eA) * mult;
  const chanceA = Math.round(eA * 100);
  const fill = (v: number) => ({ "--fill": `${(((v - 800) / 800) * 100).toFixed(1)}%` }) as React.CSSProperties;
  const userCalc = () => setAuto(false);

  // На паузе полоска этапа гаснет и при продолжении заполняется заново вместе с таймером.
  const cls = ["sf-how", scrolly ? "scrolly" : "", running ? "playing" : ""].join(" ");
  const howStyle = { "--how-dur": `${AUTO_MS}ms` } as React.CSSProperties;

  const titles = ["пики и баны", "два рейда", "задания и очки", "рейтинг эло"];

  return (
    <div className={`sf-how-track ${scrolly ? "on" : ""}`} ref={trackRef}>
      <div className="sf-how-sticky" ref={stickyRef}>
        <div
          className={cls}
          ref={howRef}
          style={howStyle}
          onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
          onPointerLeave={(e) => e.pointerType === "mouse" && setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setPaused(false)}
        >
          <div className="sf-how-left">
            <div className="sf-how-nav" role="tablist" aria-orientation="vertical" aria-label="Этапы матча" onKeyDown={onKey}>
              {titles.map((t, i) => (
                <button
                  key={t}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`how-t${i}`}
                  aria-controls={`how-p${i}`}
                  aria-selected={step === i}
                  tabIndex={step === i ? 0 : -1}
                  className="sf-how-tab"
                  onClick={() => choose(i)}
                >
                  <span className="sf-how-bar">
                    <i key={step === i ? cycle : -1} />
                  </span>
                  <span className="sf-how-n">0{i + 1}</span>
                  <span>{t}</span>
                </button>
              ))}
              <p className="sf-how-hint" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="7" y="3" width="10" height="18" rx="5" />
                  <path d="M12 7v3" />
                </svg>
                Прокручивай страницу — этапы листаются сами
              </p>
            </div>
            <div className="sf-how-texts">
              <Panel i={0} step={step} title="пики и баны">
                <p>
                  Карты выбирают по очереди: <b>бан A → бан B → пик A → бан B → бан A</b>, оставшаяся карта уходит во второй раунд. Сторона A — игрок с
                  меньшим MMR или новичок сезона. В шоу-матче три раунда и порядок «пик, пик, бан, бан, пик».
                </p>
                <Link className="sf-more" href={example ? `/tournament/${example.id}` : "/archive"}>
                  Пики и баны сыгранного матча <Arr />
                </Link>
              </Panel>
              <Panel i={1} step={step} title="два рейда">
                <p>
                  Матч — это <b>два раунда, один раунд — один рейд</b>. В первом все заходят с бесплатным набором, во втором — со своим снаряжением.
                  Около часа эфира на матч.
                </p>
                <Link className="sf-more" href="/archive">
                  Архив сыгранных матчей <Arr />
                </Link>
              </Panel>
              <Panel i={2} step={step} title="задания и очки">
                <p>
                  Перед каждым раундом у игрока <b>два задания и протокол</b>. Ведущий добавляет ручные очки за нок рейдера. Легендарное задание даёт{" "}
                  <b>+10</b>, но выполнить его можно один раз навсегда. Побеждает тот, кто набрал больше за матч.
                </p>
                <Link className="sf-more" href="/rules">
                  Все задания и протоколы <Arr />
                </Link>
              </Panel>
              <Panel i={3} step={step} title="рейтинг эло">
                <p>
                  В начале сезона у всех <b>{start} MMR</b>, коэффициент <b>K = {k}</b>. Сколько получает победитель, столько теряет проигравший. Победа над
                  сильным даёт больше, поражение от слабого стоит дороже. Ничья MMR не меняет. Подвигай ползунки справа.
                </p>
                <Link className="sf-more" href="/rating">
                  Таблица лидеров <Arr />
                </Link>
              </Panel>
            </div>
          </div>

          <div className="sf-how-arts">
            {/* 1. пики и баны */}
            <div className={`sf-how-art ${step === 0 ? "is-on" : ""} ${pbN >= pb.length ? "is-done" : ""}`} inert={step !== 0} role="group" aria-label="Пример пиков и банов">
              <div className="sf-pb-grid">
                {maps.slice(0, 6).map((m) => {
                  const k2 = pb.findIndex((s) => s.code === m.code);
                  const s = k2 >= 0 && k2 < pbN ? pb[k2] : null;
                  const now = s && k2 === pbN - 1 && pbN < pb.length;
                  return (
                    <div key={m.code} className={`sf-pb-t ${s ? s.act : ""} ${now ? "now" : ""}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- превью карты */}
                      <img src={mapImage(m.code)} alt="" loading="lazy" />
                      <span className="sf-pb-tag" style={s?.side ? ({ "--sd": `var(--sf-${s.side.toLowerCase()})` } as React.CSSProperties) : undefined}>
                        {s ? pbLabel(s) : ""}
                      </span>
                      <span className="sf-pb-nm">{m.name}</span>
                    </div>
                  );
                })}
              </div>
              <div className="sf-pb-cap">
                <span>
                  {pbN >= pb.length && pb.length ? (
                    <>
                      Итог: раунд 1 — <b>{mapName(pb[2].code)}</b>, раунд 2 — <b>{mapName(pb[5].code)}</b>
                    </>
                  ) : pbN === 0 ? (
                    "Пример: обычный матч, два раунда"
                  ) : (
                    <>
                      Ход {pbN} из {pb.length}: <b>{pbLabel(pb[pbN - 1])}</b>
                    </>
                  )}
                </span>
                <span className="sf-pb-sides">
                  <span>
                    <i style={{ background: "var(--sf-a)" }} />A
                  </span>
                  <span>
                    <i style={{ background: "var(--sf-b)" }} />B
                  </span>
                </span>
                <button type="button" className="sf-again in-cap" onClick={() => (setAuto(false), play(0))}>
                  {ICON_REPLAY}Ещё раз
                </button>
              </div>
            </div>

            {/* 2. два рейда */}
            <div className={`sf-how-art ${step === 1 ? "is-on" : ""} ${rdScore ? "is-done" : ""}`} inert={step !== 1} role="group" aria-label="Пример матча из двух рейдов">
              <button type="button" className="sf-again" onClick={() => (setAuto(false), play(1))}>
                {ICON_REPLAY}Ещё раз
              </button>
              {example ? (
                <>
                  <div className={`sf-rd2 ${rdAct >= 0 ? "run" : ""}`}>
                    {example.maps.slice(0, 2).map((m, j) => (
                      <figure key={j} className={`sf-rd2-r ${rdAct === j ? "on" : ""}`}>
                        <div className="sf-duo">
                          {/* eslint-disable-next-line @next/next/no-img-element -- превью карты */}
                          {m.code && <img src={mapImage(m.code)} alt="" loading="lazy" />}
                        </div>
                        <figcaption>
                          <small>
                            Раунд {j + 1} · {j ? "своё снаряжение" : "бесплатный набор"}
                          </small>
                          <b>{m.name}</b>
                        </figcaption>
                        <span className="sf-rd2-line">
                          <i
                            ref={(el) => {
                              lineRefs.current[j] = el;
                            }}
                          />
                        </span>
                      </figure>
                    ))}
                  </div>
                  <div className="sf-rd2-score">
                    <span className={`nm ${example.win === 0 ? "w" : ""}`}>{example.a}</span>
                    <b className={example.win === 0 ? "w" : ""}>{rdScore ? <Tween value={example.sa} ms={900} replay={rdReplay} /> : 0}</b>
                    <i>:</i>
                    <b className={example.win === 1 ? "w" : ""}>{rdScore ? <Tween value={example.sb} ms={900} replay={rdReplay} /> : 0}</b>
                    <span className={`nm ${example.win === 1 ? "w" : ""}`}>{example.b}</span>
                  </div>
                  <p className="sf-rd2-cap">
                    пример: матч {example.date}
                    {example.mult > 1 ? ` · рейтинг ×${example.mult}` : ""}
                  </p>
                </>
              ) : (
                <p className="sf-rd2-cap">Сыгранные матчи появятся здесь после первого эфира.</p>
              )}
            </div>

            {/* 3. задания и очки */}
            <div className={`sf-how-art ${step === 2 ? "is-on" : ""} ${t3N >= TASKS.length ? "is-done" : ""}`} inert={step !== 2} role="group" aria-label="Сколько стоят задания">
              <button type="button" className="sf-again" onClick={() => (setAuto(false), play(2))}>
                {ICON_REPLAY}Ещё раз
              </button>
              <div className="sf-tasks3 scrub">
                {TASKS.map((t, j) => (
                  <div key={t.b} className={`sf-tcard ${t.leg ? "leg" : ""} ${j < t3N ? "in" : ""}`} style={{ "--r": t.r } as React.CSSProperties}>
                    <b>{t.b}</b>
                    <small>{t.s}</small>
                    <em>{j < t3N ? <Tween value={t.v} ms={520} replay={j < t3N ? 1 : 0} format={(v) => `+${v}`} /> : "+0"}</em>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. калькулятор MMR */}
            <div className={`sf-how-art ${step === 3 ? "is-on" : ""}`} inert={step !== 3} role="group" aria-label="Калькулятор MMR">
              <div className="sf-calc">
                <p className="sf-eyebrow">Посчитай сам · K = {k}</p>
                <div className="sf-calc-rows">
                  <div className="sf-calc-row" style={{ "--trk": "var(--sf-a)" } as React.CSSProperties}>
                    <label htmlFor="calc-a">
                      <span>
                        <i style={{ background: "var(--sf-a)" }} />
                        MMR игрока A
                      </span>
                      <b>{ca}</b>
                    </label>
                    <input id="calc-a" type="range" min={800} max={1600} step={1} value={ca} style={fill(ca)} onChange={(e) => (userCalc(), setCa(+e.target.value))} />
                  </div>
                  <div className="sf-calc-row" style={{ "--trk": "var(--sf-b)" } as React.CSSProperties}>
                    <label htmlFor="calc-b">
                      <span>
                        <i style={{ background: "var(--sf-b)" }} />
                        MMR игрока B
                      </span>
                      <b>{cb}</b>
                    </label>
                    <input id="calc-b" type="range" min={800} max={1600} step={1} value={cb} style={fill(cb)} onChange={(e) => (userCalc(), setCb(+e.target.value))} />
                  </div>
                </div>
                <label className="sf-calc-x2" htmlFor="calc-x2">
                  <input id="calc-x2" type="checkbox" checked={x2} onChange={(e) => (userCalc(), setX2(e.target.checked))} />
                  <span />
                  Матч ×2
                </label>
                <div className="sf-odds">
                  <div className="sf-odds-bar" aria-hidden>
                    <i style={{ flexGrow: chanceA, background: "var(--sf-a)" }} />
                    <i style={{ flexGrow: 100 - chanceA, background: "var(--sf-b)" }} />
                  </div>
                  <div className="sf-odds-head">
                    <span>
                      шанс A <b>{chanceA}%</b>
                    </span>
                    <span>
                      <b>{100 - chanceA}%</b> шанс B
                    </span>
                  </div>
                </div>
                <div className="sf-calc-out">
                  <div className="sf-calc-case">
                    <small>
                      <i style={{ background: "var(--sf-a)" }} />
                      Победит A
                    </small>
                    <span className="sf-calc-ln">
                      <em>A</em>
                      <b className="sf-up">
                        <Tween value={winA} format={signed} replay={calcReplay} />
                      </b>
                    </span>
                    <span className="sf-calc-ln">
                      <em>B</em>
                      <b className="sf-down">
                        <Tween value={-winA} format={signed} replay={calcReplay} />
                      </b>
                    </span>
                  </div>
                  <div className="sf-calc-case">
                    <small>
                      <i style={{ background: "var(--sf-b)" }} />
                      Победит B
                    </small>
                    <span className="sf-calc-ln">
                      <em>B</em>
                      <b className="sf-up">
                        <Tween value={winB} format={signed} replay={calcReplay} />
                      </b>
                    </span>
                    <span className="sf-calc-ln">
                      <em>A</em>
                      <b className="sf-down">
                        <Tween value={-winB} format={signed} replay={calcReplay} />
                      </b>
                    </span>
                  </div>
                </div>
                <p className="sf-calc-f">
                  Победитель получает столько, сколько теряет проигравший: <b>{k} × шанс проигравшего</b>
                  {x2 ? ", в матче ×2 — вдвое" : ""}. Ничья MMR не меняет.
                  {calc.nameA && calc.nameB && (
                    <>
                      <br />
                      Сейчас стоят {calc.nameA} и {calc.nameB} перед матчем {calc.date}.
                      {calc.mult && calc.mult > 1 && calc.delta ? ` Тот матч был ×${calc.mult} — включи и увидишь его ${signed(calc.delta)}.` : ""}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ i, step, title, children }: { i: number; step: number; title: string; children: React.ReactNode }) {
  return (
    <div className={`sf-how-txt ${step === i ? "is-on" : ""}`} role="tabpanel" id={`how-p${i}`} aria-labelledby={`how-t${i}`} inert={step !== i}>
      <h3>
        <span className="ln">
          <span key={step === i ? "on" : "off"}>
            {title}
            <span className="sf-dot">.</span>
          </span>
        </span>
      </h3>
      {children}
    </div>
  );
}

function Arr() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
