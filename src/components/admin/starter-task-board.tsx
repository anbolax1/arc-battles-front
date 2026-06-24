"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import type { Round, RoundStarterTask, StarterTask } from "@/lib/types";

/** Назначение основных заданий на единственный раунд (один рейд).
    Слева — пул нераспределённых заданий, справа — назначенные на раунд. Задание
    одинаково у обеих сторон; зачёт раздельный по сторонам — в «Эфире». */
export function StarterTaskBoard({ tournamentId, round }: { tournamentId: string; round: Round }) {
  const [pool, setPool] = React.useState<StarterTask[]>([]);
  const [assigned, setAssigned] = React.useState<RoundStarterTask[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, a] = await Promise.all([
          api.get<StarterTask[]>("/starter-tasks"),
          api.get<RoundStarterTask[]>(`/tournaments/${tournamentId}/starter-tasks`),
        ]);
        if (!active) return;
        setPool(p);
        setAssigned(a);
      } catch {
        if (active) setMsg("Не удалось загрузить пул заданий.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tournamentId]);

  async function reloadAssigned() {
    setAssigned(await api.get<RoundStarterTask[]>(`/tournaments/${tournamentId}/starter-tasks`));
  }

  async function assign(taskId: string) {
    setBusy(true);
    setMsg("");
    try {
      await api.post(`/rounds/${round.id}/starter-tasks`, { starterTaskId: taskId });
      await reloadAssigned();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось назначить.");
    } finally {
      setBusy(false);
    }
  }

  async function unassign(asgId: string) {
    setBusy(true);
    setMsg("");
    try {
      await api.del(`/round-starter-tasks/${asgId}`);
      await reloadAssigned();
    } catch {
      setMsg("Не удалось убрать задание.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Загрузка пула…</p>;
  }
  if (!pool.length) {
    return (
      <p className="text-sm text-muted">
        Пул пуст. Добавьте задания в разделе «Основные задания», затем назначьте их на раунд.
      </p>
    );
  }

  const assignedIds = new Set(assigned.map((a) => a.starterTaskId));
  const available = pool.filter((t) => !assignedIds.has(t.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Назначено <span className="tnum text-fg">{assigned.length}</span> из {pool.length}.
        </p>
        {msg && <p className="text-sm text-danger">{msg}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Назначенные на раунд */}
        <div className="panel flex flex-col gap-2 p-3">
          <div className="text-xs uppercase tracking-wide text-muted">На раунде · {assigned.length}</div>
          {assigned.length ? (
            <div className="flex flex-col gap-2">
              {assigned.map((a) => (
                <article
                  key={a.id}
                  className="group flex items-center gap-2.5 rounded-md bg-surface-2 p-2.5 shadow-[inset_0_0_0_1px_var(--border)]"
                >
                  <span className="min-w-0 flex-1 text-sm leading-snug break-words">{a.text}</span>
                  <span className="pts pts-cyan flex-none">
                    <span>+{a.points}</span>
                  </span>
                  <button
                    type="button"
                    className="flex-none text-muted transition hover:text-danger"
                    title="Убрать с раунда"
                    disabled={busy}
                    onClick={() => unassign(a.id)}
                  >
                    ✕
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="px-1 py-3 text-xs text-muted">Заданий на раунде нет — добавьте из пула справа.</p>
          )}
        </div>

        {/* Пул нераспределённых */}
        <div className="panel flex flex-col gap-2 p-3">
          <div className="text-xs uppercase tracking-wide text-muted">Пул · {available.length}</div>
          {available.length ? (
            <div className="flex max-h-[440px] flex-col gap-2 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {available.map((t) => (
                <article
                  key={t.id}
                  className="group flex items-center gap-2.5 rounded-md bg-surface-2 p-2.5 shadow-[inset_0_0_0_1px_var(--border)]"
                >
                  <span className="min-w-0 flex-1 text-sm leading-snug break-words">{t.text}</span>
                  <span className="pts pts-cyan flex-none">
                    <span>+{t.points}</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-cyan btn-sm flex-none"
                    disabled={busy}
                    title="Назначить на раунд"
                    onClick={() => assign(t.id)}
                  >
                    <span>+ На раунд</span>
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="px-1 py-3 text-xs text-muted">Все задания назначены.</p>
          )}
        </div>
      </div>
    </div>
  );
}
