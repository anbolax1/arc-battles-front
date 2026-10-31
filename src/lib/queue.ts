"use client";

/* Живое состояние очереди выступлений. Источник правды - PostgreSQL через GET /api/queue.
   Сервер шлёт по WebSocket (тот же /ws/overlay) короткое сообщение {type:"queue"}: по нему страница
   перечитывает состояние. Кадр можно потерять, поэтому есть и опрос, и перечитывание при возврате на вкладку. */

import * as React from "react";
import { api, errorText } from "@/lib/api";
import { overlayWsUrl } from "@/lib/ws";
import type { QueueEntry, QueueFormat, QueueSnapshot, QueueState } from "@/lib/types";

const POLL_OPEN_MS = 12_000; // WebSocket держится - опрос только страховка
const POLL_CLOSED_MS = 4_000; // WebSocket не держится - опрашиваем чаще
const RELOAD_DEBOUNCE_MS = 60; // несколько сообщений подряд - одно перечитывание

export const FORMAT_LABEL: Record<QueueFormat, string> = { "1x1": "1×1", "2x2": "2×2" };

export const STATE_LABEL: Record<QueueState, string> = {
  open: "Запись открыта",
  closed: "Запись закрыта",
  paused: "Очередь на паузе",
  finished: "Сессия завершена",
};

/** Подпись статуса записи для людей. */
export function entryStatusLabel(e: Pick<QueueEntry, "status" | "isNext">): string {
  switch (e.status) {
    case "invited":
      return "Приглашён";
    case "ready":
      return "Подтвердил готовность";
    case "performing":
      return "Выступает";
    case "skipped":
      return e.isNext ? "Следующий" : "Пропущен";
    default:
      return e.isNext ? "Следующий" : "Ожидает";
  }
}

/** Класс цвета статуса. */
export function entryTone(e: Pick<QueueEntry, "status" | "isNext">): string {
  if (e.status === "waiting" || e.status === "skipped") return e.isNext ? "next" : e.status;
  return e.status;
}

export interface UseQueue {
  snap: QueueSnapshot | null;
  error: string;
  /** WebSocket подключён. */
  live: boolean;
  reload: () => Promise<void>;
  /** Принять состояние из ответа на действие, не дожидаясь перечитывания. */
  apply: (s: QueueSnapshot) => void;
  /** Текущее серверное время в мс: часы пользователя могут уходить. */
  serverNow: () => number;
}

/** Подписка на изменения очереди: по сообщению {type:"queue"} вызывает reload. Сообщение можно потерять,
    поэтому есть опрос и перечитывание при возврате на вкладку и при переподключении. Возвращает, держится ли WebSocket. */
export function useQueueChannel(reload: () => Promise<void>, enabled = true): boolean {
  const [live, setLive] = React.useState(false);
  React.useEffect(() => {
    if (!enabled) return;
    let active = true;
    let ws: WebSocket | null = null;
    let reconnect: ReturnType<typeof setTimeout> | null = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;
    let open = false;

    const schedule = () => {
      if (debounce) return;
      debounce = setTimeout(() => {
        debounce = null;
        void reload();
      }, RELOAD_DEBOUNCE_MS);
    };
    const setPoll = () => {
      if (poll) clearInterval(poll);
      poll = setInterval(() => void reload(), open ? POLL_OPEN_MS : POLL_CLOSED_MS);
    };

    function connect() {
      const url = overlayWsUrl();
      if (!url || !active) return;
      try {
        ws = new WebSocket(url);
      } catch {
        return;
      }
      ws.onopen = () => {
        attempts = 0;
        open = true;
        setLive(true);
        setPoll();
        void reload(); // за время разрыва очередь могла измениться
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as { type?: string };
          if (msg.type === "queue") schedule();
        } catch {
          /* чужой кадр оверлея */
        }
      };
      ws.onclose = () => {
        open = false;
        setLive(false);
        setPoll();
        if (!active) return;
        attempts += 1;
        reconnect = setTimeout(connect, Math.min(1000 * attempts, 8000));
      };
      ws.onerror = () => ws?.close();
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    const first = setTimeout(() => void reload(), 0); // не в теле эффекта: состояние обновится после ответа
    setPoll();
    connect();

    return () => {
      active = false;
      clearTimeout(first);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      if (poll) clearInterval(poll);
      if (reconnect) clearTimeout(reconnect);
      if (debounce) clearTimeout(debounce);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [reload, enabled]);
  return enabled && live;
}

/** sessionId задан - конкретная сессия (в том числе завершённая), иначе живая очередь формата. */
export function useQueue(opts: { format?: QueueFormat; sessionId?: string; initial?: QueueSnapshot | null }): UseQueue {
  const { format, sessionId } = opts;
  const [snap, setSnap] = React.useState<QueueSnapshot | null>(opts.initial ?? null);
  const [error, setError] = React.useState("");
  const offset = React.useRef(0);
  const seq = React.useRef(0);
  const path = sessionId ? `/queue/sessions/${encodeURIComponent(sessionId)}` : `/queue${format ? `?format=${format}` : ""}`;

  const apply = React.useCallback((s: QueueSnapshot) => {
    offset.current = Date.parse(s.serverTime) - Date.now();
    setSnap((cur) => {
      // Более старую ревизию той же сессии не принимаем: ответ мог обогнать другой.
      if (cur?.session && s.session && cur.session.id === s.session.id && s.session.rev < cur.session.rev) return cur;
      return s;
    });
    setError("");
  }, []);

  const reload = React.useCallback(async () => {
    const mine = ++seq.current;
    try {
      const s = await api.get<QueueSnapshot>(path);
      if (mine === seq.current) apply(s);
    } catch (e) {
      if (mine === seq.current) setError(errorText(e, "Не удалось обновить очередь"));
    }
  }, [path, apply]);

  const live = useQueueChannel(reload);
  const initialTime = opts.initial?.serverTime;
  React.useEffect(() => {
    if (initialTime) offset.current = Date.parse(initialTime) - Date.now();
  }, [initialTime]);

  const serverNow = React.useCallback(() => Date.now() + offset.current, []);
  return { snap, error, live, reload, apply, serverNow };
}

/** Секунды до момента по серверным часам; компонент перерисовывается раз в секунду. */
export function useSecondsLeft(until: string | null | undefined, serverNow: () => number): number | null {
  const [, tick] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    if (!until) return;
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [until]);
  if (!until) return null;
  return Math.ceil((Date.parse(until) - serverNow()) / 1000);
}

export function mmss(sec: number): string {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const MSK = "Europe/Moscow";

/** Время записи в очереди: «19:42» по Москве. */
export function clock(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: MSK }).format(new Date(iso));
}

export function dayClock(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: MSK }).format(new Date(iso));
}

/** Склонение: 1 игрок, 2 игрока, 5 игроков. */
export function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
}

const W_MATCHES: [string, string, string] = ["матч", "матча", "матчей"];

/** «Сегодня: 2 матча» - сколько матчей человек уже сыграл за сегодня. */
export function todayLabel(n: number): string {
  return n > 0 ? `${n} ${plural(n, W_MATCHES)}` : "не играл";
}

export function num(n: number): string {
  return n.toLocaleString("ru-RU");
}
