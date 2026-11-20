"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { api, ApiError, errorText } from "@/lib/api";
import { inSnowSeason } from "@/lib/snow-season";
import "./profile-snowballs.css";

/* Снежки в профиле игрока: любой вошедший бросает, не чаще раза в 15 секунд (пауза на бэке).
   Счёт идёт с последнего матча игрока: сыграл - снежки обнулились. */

type Summary = {
  count: number;
  recent: { login: string; displayName: string }[];
  me?: { self: boolean; waitSec: number };
};

const FLIGHT_MS = 650;
const SPLAT_BITS = 12;
const SPLAT_MS = 700;
const SPLAT_LINGER_MS = 2200; // сколько на фото остаётся след от попадания
const SHAKE_MS = 320;

const noSubscribe = () => () => {};
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function animate(el: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions) {
  return el.animate(frames, opts).finished.catch(() => undefined);
}

/** Снежок летит дугой от кнопки к фото игрока, там рассыпается брызгами и оставляет след. */
async function fly(from: Element, to: Element, card: Element | null) {
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const sx = a.left + a.width / 2;
  const sy = a.top + a.height / 2;
  const tx = b.left + b.width / 2;
  const ty = b.top + b.height / 2;
  const top = Math.min(sy, ty) - 120; // вершина дуги

  const ball = document.createElement("i");
  ball.className = "sb-ball";
  document.body.appendChild(ball);
  await animate(
    ball,
    [
      { transform: `translate(${sx}px, ${sy}px) scale(0.6)` },
      { transform: `translate(${(sx + tx) / 2}px, ${top}px) scale(1.2)`, offset: 0.5 },
      { transform: `translate(${tx}px, ${ty}px) scale(0.9)` },
    ],
    { duration: FLIGHT_MS, easing: "cubic-bezier(0.3, 0.1, 0.6, 1)" },
  );
  ball.remove();

  for (let i = 0; i < SPLAT_BITS; i++) {
    const bit = document.createElement("i");
    bit.className = "sb-bit";
    document.body.appendChild(bit);
    const ang = (Math.PI * 2 * i) / SPLAT_BITS + Math.random() * 0.4;
    const dist = 30 + Math.random() * 50;
    void animate(
      bit,
      [
        { transform: `translate(${tx}px, ${ty}px) scale(1)`, opacity: 1 },
        { transform: `translate(${tx + Math.cos(ang) * dist}px, ${ty + Math.sin(ang) * dist + 18}px) scale(0.2)`, opacity: 0 },
      ],
      { duration: SPLAT_MS, easing: "ease-out" },
    ).then(() => bit.remove());
  }
  const mark = document.createElement("i");
  mark.className = "sb-mark";
  document.body.appendChild(mark);
  void animate(
    mark,
    [
      { transform: `translate(${tx}px, ${ty}px) scale(0.3)`, opacity: 0.95 },
      { transform: `translate(${tx}px, ${ty}px) scale(1)`, opacity: 0.9, offset: 0.2 },
      { transform: `translate(${tx}px, ${ty}px) scale(1.05)`, opacity: 0 },
    ],
    { duration: SPLAT_LINGER_MS, easing: "ease-out" },
  ).then(() => mark.remove());

  if (card instanceof HTMLElement) {
    void animate(
      card,
      [
        { transform: "translate(0, 0)" },
        { transform: "translate(-5px, 2px)" },
        { transform: "translate(4px, -1px)" },
        { transform: "translate(0, 0)" },
      ],
      { duration: SHAKE_MS, composite: "add" },
    );
  }
}

export function ProfileSnowballs({ login }: { login: string }) {
  const show = useSyncExternalStore(noSubscribe, inSnowSeason, () => false);
  const [sum, setSum] = useState<Summary | null>(null);
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const path = `/players/${encodeURIComponent(login)}/snowballs`;

  const apply = useCallback((s: Summary) => {
    setSum(s);
    setWait(s.me?.waitSec ?? 0);
  }, []);

  useEffect(() => {
    if (!show) return;
    let alive = true;
    api
      .get<Summary>(path)
      .then((s) => alive && apply(s))
      .catch(() => {
        /* без счётчика блок просто не показываем */
      });
    return () => {
      alive = false;
    };
  }, [show, path, apply]);

  // Пауза между бросками тикает на странице, чтобы кнопка сама оживала.
  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((w) => Math.max(w - 1, 0)), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  const throwBall = async () => {
    if (busy || wait > 0) return;
    setBusy(true);
    setError("");
    try {
      const s = await api.post<Summary>(`/players/${encodeURIComponent(login)}/snowball`);
      const photo = document.querySelector(".sf-idcard .sf-id-photo");
      if (btnRef.current && photo && !reducedMotion()) {
        void fly(btnRef.current, photo, photo.closest(".sf-idcard"));
        await new Promise((r) => setTimeout(r, FLIGHT_MS)); // счёт растёт, когда снежок долетел
      }
      apply(s);
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        const sec = Number(e.body.match(/(\d+)\s*с/)?.[1]);
        setWait(Number.isFinite(sec) && sec > 0 ? sec : 15);
      }
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  if (!show || !sum) return null;
  const self = sum.me?.self ?? false;
  if (self && sum.count === 0) return null;

  const who = sum.recent.map((t, i) => (
    <span key={t.login}>
      {i > 0 && ", "}
      <Link href={`/profile/${encodeURIComponent(t.login)}`}>{t.displayName || t.login}</Link>
    </span>
  ));
  const line = self
    ? `В вас бросили ${sum.count} ${plural(sum.count)} - пора играть!`
    : sum.count > 0
      ? `В игрока бросили ${sum.count} ${plural(sum.count)}`
      : "Снежков пока нет - бросьте первым";

  return (
    <div className="sb-strip" aria-live="polite">
      {!self &&
        (sum.me ? (
          <button ref={btnRef} type="button" className="sb-btn" onClick={throwBall} disabled={busy || wait > 0}>
            <span aria-hidden>❄</span> {wait > 0 ? `Снежок лепится... ${wait} с` : "Бросить снежок"}
          </button>
        ) : (
          <Link href="/login" className="sb-btn">
            <span aria-hidden>❄</span> Войти, чтобы бросить снежок
          </Link>
        ))}
      <p className="sb-text">
        {line}
        {sum.count > 0 && sum.recent.length > 0 && <small> Последние: {who}</small>}
        {error && <small className="sb-err"> {error}</small>}
      </p>
    </div>
  );
}

/** «1 снежок», «3 снежка», «11 снежков». */
function plural(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "снежок";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "снежка";
  return "снежков";
}
