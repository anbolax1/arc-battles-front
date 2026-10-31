"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FORMAT_LABEL, mmss, useQueueChannel, useSecondsLeft } from "@/lib/queue";
import type { QueueCall } from "@/lib/types";
import "./queue-call.css";

const TITLE_MARK = "🔔 Тебя вызвали — ";

function Timer({ until, serverNow }: { until: string; serverNow: () => number }) {
  const left = useSecondsLeft(until, serverNow);
  if (left === null) return null;
  return left > 0 ? <span className="qc-timer">{mmss(left)}</span> : <span className="qc-timer late">время вышло</span>;
}

function CallCard({ call, serverNow, onConfirm }: { call: QueueCall; serverNow: () => number; onConfirm: (c: QueueCall) => Promise<string> }) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const kind = call.needsConfirm ? "need" : call.status === "performing" ? "live" : "ready";

  async function confirm() {
    setBusy(true);
    setErr(await onConfirm(call));
    setBusy(false);
  }

  return (
    <div className={`qc ${kind}`} role={call.needsConfirm ? "alert" : "status"}>
      <div className="qc-text">
        {call.needsConfirm && (
          <>
            <p className="qc-title">Тебя вызвали на матч!</p>
            <p className="qc-sub">
              очередь {FORMAT_LABEL[call.format]} · {call.name}
              {call.inviteExpiresAt && (
                <>
                  {" · подтверди за "}
                  <Timer until={call.inviteExpiresAt} serverNow={serverNow} />
                </>
              )}
            </p>
          </>
        )}
        {call.confirmed && (
          <>
            <p className="qc-title">Ты подтвердил готовность</p>
            <p className="qc-sub">ждём напарника · очередь {FORMAT_LABEL[call.format]}</p>
          </>
        )}
        {call.status === "ready" && (
          <>
            <p className="qc-title">Ты готов к матчу</p>
            <p className="qc-sub">ждём начала · очередь {FORMAT_LABEL[call.format]}</p>
          </>
        )}
        {call.status === "performing" && (
          <>
            <p className="qc-title">Ты в эфире</p>
            <p className="qc-sub">
              очередь {FORMAT_LABEL[call.format]} · {call.name}
            </p>
          </>
        )}
      </div>
      <div className="qc-actions">
        {call.needsConfirm && (
          <button type="button" className="sf-btn sf-btn-amber sf-btn-sm" disabled={busy} onClick={confirm}>
            Я готов
          </button>
        )}
        <Link href={`/queue?format=${call.format}`} className="sf-btn sf-btn-line sf-btn-sm">
          К очереди
        </Link>
      </div>
      {err && <p className="qc-err">{err}</p>}
    </div>
  );
}

/** Плашка вызова: игрока позвали на матч, а он ходит по сайту. Читает «мои вызовы» и обновляется по тому же
    сигналу очереди, что и страница /queue. На самой странице очереди не показывается - там свой блок. */
export function QueueCallBanner() {
  const { user } = useAuth();
  const pathname = usePathname() || "/";
  const userId = user?.id;
  const [calls, setCalls] = React.useState<QueueCall[]>([]);
  const offset = React.useRef(0);

  const reload = React.useCallback(async () => {
    if (!userId) return;
    try {
      const r = await api.get<{ serverTime: string; calls: QueueCall[] }>("/queue/me");
      offset.current = Date.parse(r.serverTime) - Date.now();
      setCalls(r.calls);
    } catch {
      /* сеть моргнула: следующий сигнал или опрос обновит */
    }
  }, [userId]);

  useQueueChannel(reload, !!userId);
  React.useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => void reload(), 0);
    return () => clearTimeout(t);
  }, [userId, reload]);

  const serverNow = React.useCallback(() => Date.now() + offset.current, []);
  const onQueuePage = pathname === "/queue" || pathname.startsWith("/queue/");
  const shown = userId && !onQueuePage ? calls : [];
  const needs = shown.some((c) => c.needsConfirm);

  // Пока вызов не подтверждён, это видно и по вкладке.
  React.useEffect(() => {
    if (!needs) return;
    const original = document.title;
    document.title = TITLE_MARK + original;
    return () => {
      document.title = original;
    };
  }, [needs]);

  const confirm = React.useCallback(
    async (c: QueueCall): Promise<string> => {
      try {
        await api.post(`/queue/sessions/${c.sessionId}/confirm`);
        await reload();
        return "";
      } catch (e) {
        void reload();
        return errorText(e);
      }
    },
    [reload],
  );

  if (shown.length === 0) return null;
  return (
    <div className="qc-stack">
      {shown.map((c) => (
        <CallCard key={c.entryId} call={c} serverNow={serverNow} onConfirm={confirm} />
      ))}
    </div>
  );
}
