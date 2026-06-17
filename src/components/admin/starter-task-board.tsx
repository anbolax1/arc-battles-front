"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import type { Round, RoundStarterTask, StarterTask } from "@/lib/types";

type DragPayload = { kind: "pool"; taskId: string } | { kind: "asg"; asgId: string; taskId: string; from: string };

/** Доска распределения стартовых заданий по раундам (drag-drop).
    Слева — пул нераспределённых заданий, справа — колонки раундов. Перетаскивай карточку
    в раунд, чтобы назначить; обратно в пул (или ×) — чтобы снять. В рамках турнира задание
    не повторяется (бэкенд вернёт 409). */
export function StarterTaskBoard({ tournamentId, rounds }: { tournamentId: string; rounds: Round[] }) {
  const [pool, setPool] = React.useState<StarterTask[]>([]);
  const [assigned, setAssigned] = React.useState<RoundStarterTask[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [over, setOver] = React.useState<string | null>(null); // id раунда или "pool" для подсветки
  const [msg, setMsg] = React.useState("");

  const sortedRounds = React.useMemo(() => [...rounds].sort((a, b) => a.number - b.number), [rounds]);

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

  async function assignTo(roundId: string, taskId: string) {
    setMsg("");
    try {
      await api.post(`/rounds/${roundId}/starter-tasks`, { starterTaskId: taskId });
      await reloadAssigned();
    } catch (e) {
      setMsg(
        e instanceof ApiError
          ? e.status === 409
            ? "Это задание уже стоит в другом раунде турнира."
            : e.body || e.message
          : "Не удалось назначить.",
      );
    }
  }

  async function unassign(asgId: string) {
    setMsg("");
    try {
      await api.del(`/round-starter-tasks/${asgId}`);
      await reloadAssigned();
    } catch {
      setMsg("Не удалось убрать задание.");
    }
  }

  async function move(asgId: string, taskId: string, toRound: string, fromRound: string) {
    if (toRound === fromRound) return;
    setMsg("");
    try {
      await api.del(`/round-starter-tasks/${asgId}`);
      await api.post(`/rounds/${toRound}/starter-tasks`, { starterTaskId: taskId });
      await reloadAssigned();
    } catch (e) {
      await reloadAssigned();
      setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось перенести.");
    }
  }

  function dragStart(e: React.DragEvent, payload: DragPayload) {
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }

  function dropOnRound(e: React.DragEvent, roundId: string) {
    e.preventDefault();
    setOver(null);
    let d: DragPayload;
    try {
      d = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {
      return;
    }
    if (d.kind === "pool") void assignTo(roundId, d.taskId);
    else void move(d.asgId, d.taskId, roundId, d.from);
  }

  function dropOnPool(e: React.DragEvent) {
    e.preventDefault();
    setOver(null);
    let d: DragPayload;
    try {
      d = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {
      return;
    }
    if (d.kind === "asg") void unassign(d.asgId);
  }

  if (loading) {
    return <p className="text-sm text-muted">Загрузка пула…</p>;
  }
  if (!sortedRounds.length) {
    return <p className="text-sm text-muted">Сначала создайте раунды турнира — тогда сюда можно будет раскидать стартовые задания.</p>;
  }
  if (!pool.length) {
    return (
      <p className="text-sm text-muted">
        Пул пуст. Добавьте задания в разделе «Стартовые», затем перетащите их по раундам.
      </p>
    );
  }

  const assignedIds = new Set(assigned.map((a) => a.starterTaskId));
  const available = pool.filter((t) => !assignedIds.has(t.id));

  const allCount = pool.length;
  const placed = assignedIds.size;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Распределено <span className="tnum text-fg">{placed}</span> из {allCount}. Перетаскивай карточки в раунды.
        </p>
        {msg && <p className="text-sm text-danger">{msg}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Пул нераспределённых */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver("pool");
          }}
          onDragLeave={() => setOver((o) => (o === "pool" ? null : o))}
          onDrop={dropOnPool}
          className={`panel space-y-2 p-3 transition ${over === "pool" ? "glow-edge" : ""}`}
        >
          <div className="text-xs uppercase tracking-wide text-muted">Пул · {available.length}</div>
          {available.length ? (
            available.map((t) => (
              <article
                key={t.id}
                draggable
                onDragStart={(e) => dragStart(e, { kind: "pool", taskId: t.id })}
                className="group flex cursor-grab items-start justify-between gap-2 bg-surface-2 p-2.5 shadow-[inset_0_0_0_1px_var(--border)] active:cursor-grabbing"
              >
                <span className="text-sm">{t.text}</span>
                <span className="pts pts-cyan flex-none">
                  <span>+{t.points}</span>
                </span>
              </article>
            ))
          ) : (
            <p className="px-1 py-3 text-xs text-muted">Все задания распределены.</p>
          )}
        </div>

        {/* Колонки раундов */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortedRounds.map((r) => {
            const items = assigned.filter((a) => a.roundId === r.id);
            const sum = items.reduce((s, x) => s + x.points, 0);
            return (
              <div
                key={r.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(r.id);
                }}
                onDragLeave={() => setOver((o) => (o === r.id ? null : o))}
                onDrop={(e) => dropOnRound(e, r.id)}
                className={`panel flex min-h-32 flex-col gap-2 p-3 transition ${over === r.id ? "glow-edge" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm uppercase">Раунд {r.number}</span>
                  <span className="text-xs text-muted tnum">{items.length ? `+${sum}` : "—"}</span>
                </div>
                {items.length ? (
                  items.map((a) => (
                    <article
                      key={a.id}
                      draggable
                      onDragStart={(e) => dragStart(e, { kind: "asg", asgId: a.id, taskId: a.starterTaskId, from: r.id })}
                      className="flex cursor-grab items-start justify-between gap-2 bg-surface-2 p-2.5 shadow-[inset_0_0_0_1px_var(--border)] active:cursor-grabbing"
                    >
                      <span className="text-sm">
                        {a.text}
                        {a.times > 0 && <span className="ml-1 text-xs text-ok">✓×{a.times}</span>}
                      </span>
                      <span className="flex flex-none items-center gap-1.5">
                        <span className="pts pts-cyan">
                          <span>+{a.points}</span>
                        </span>
                        <button
                          type="button"
                          className="text-muted transition hover:text-danger"
                          title="Убрать из раунда"
                          onClick={() => unassign(a.id)}
                        >
                          ✕
                        </button>
                      </span>
                    </article>
                  ))
                ) : (
                  <p className="flex-1 select-none place-self-center self-center text-xs text-muted">
                    Перетащи задание сюда
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
