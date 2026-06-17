"use client";

/* Хук живого состояния оверлея для OBS. Источник правды — бэкенд:
   - начальный снапшот берём GET /api/overlay/state (голый LiveState или {});
   - дальше слушаем WS /api/ws/overlay (конверт {type:'state', state:{…}});
   - авто-reconnect с backoff; если WS не держится — переходим на опрос GET (фолбэк),
     чтобы оверлей работал и там, где WS-проксирование недоступно (dev). */

import * as React from "react";
import { api } from "@/lib/api";
import type { LiveState } from "@/lib/types";

function overlayWsUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "/api";
  if (base.startsWith("http")) {
    // prod split: https://api.brouhub.ru/api → wss://api.brouhub.ru/api/ws/overlay
    const u = new URL(base);
    const proto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${u.host}${u.pathname.replace(/\/$/, "")}/ws/overlay`;
  }
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${base}/ws/overlay`;
}

/** null — активного эфира нет (стейт пуст). */
export function useOverlayState(): LiveState | null {
  const [state, setState] = React.useState<LiveState | null>(null);

  React.useEffect(() => {
    let active = true;
    let ws: WebSocket | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let reconnect: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    function apply(raw: unknown) {
      if (!raw || typeof raw !== "object") {
        setState(null);
        return;
      }
      const o = raw as Record<string, unknown>;
      const s = (o.type === "state" && o.state ? o.state : o) as Partial<LiveState>;
      setState(s && s.tournamentName ? (s as LiveState) : null);
    }

    async function seed() {
      try {
        apply(await api.get<unknown>("/overlay/state"));
      } catch {
        /* ignore */
      }
    }

    function startPolling() {
      if (poll) return;
      poll = setInterval(() => void seed(), 5000);
    }

    function connect() {
      const url = overlayWsUrl();
      if (!url) {
        startPolling();
        return;
      }
      try {
        ws = new WebSocket(url);
      } catch {
        startPolling();
        return;
      }
      ws.onmessage = (ev) => {
        try {
          apply(JSON.parse(ev.data as string));
        } catch {
          /* ignore */
        }
      };
      ws.onopen = () => {
        attempts = 0;
        if (poll) {
          clearInterval(poll);
          poll = null;
        }
      };
      ws.onclose = () => {
        if (!active) return;
        attempts += 1;
        if (attempts >= 3) startPolling();
        reconnect = setTimeout(connect, Math.min(1000 * attempts, 8000));
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          /* ignore */
        }
      };
    }

    void seed();
    connect();

    return () => {
      active = false;
      if (ws) {
        ws.onclose = null;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
      if (poll) clearInterval(poll);
      if (reconnect) clearTimeout(reconnect);
    };
  }, []);

  return state;
}
