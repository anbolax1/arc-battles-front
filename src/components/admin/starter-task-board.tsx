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

  // Подсказка прокрутки пула: затемнение снизу — пока есть что листать вниз,
  // сверху — когда список прокручен от начала.
  const poolScrollRef = React.useRef<HTMLDivElement>(null);
  const [poolMore, setPoolMore] = React.useState(false);
  const [poolUp, setPoolUp] = React.useState(false);
  const updatePoolMore = React.useCallback(() => {
    const el = poolScrollRef.current;
    setPoolMore(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    setPoolUp(!!el && el.scrollTop > 4);
  }, []);

  const sortedRounds = React.useMemo(() => [...rounds].sort((a, b) => a.number - b.number), [rounds]);

  // Пересчитываем подсказку при изменении состава пула и при ресайзе окна.
  React.useEffect(() => {
    updatePoolMore();
    window.addEventListener("resize", updatePoolMore);
    return () => window.removeEventListener("resize", updatePoolMore);
  }, [pool, assigned, loading, updatePoolMore]);

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

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Пул нераспределённых */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver("pool");
          }}
          onDragLeave={() => setOver((o) => (o === "pool" ? null : o))}
          onDrop={dropOnPool}
          className={`panel flex flex-col gap-2 p-3 transition lg:sticky lg:top-4 lg:self-start ${over === "pool" ? "glow-edge" : ""}`}
        >
          <div className="text-xs uppercase tracking-wide text-muted">Пул · {available.length}</div>
          {available.length ? (
            <div className="relative">
              {poolUp && (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-[var(--surface)] to-transparent" />
              )}
              <div
                ref={poolScrollRef}
                onScroll={updatePoolMore}
                className="flex max-h-[440px] flex-col gap-2 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {available.map((t) => (
                <article
                  key={t.id}
                  draggable
                  onDragStart={(e) => dragStart(e, { kind: "pool", taskId: t.id })}
                  className="group flex cursor-grab items-center gap-2.5 rounded-md bg-surface-2 p-2.5 shadow-[inset_0_0_0_1px_var(--border)] transition hover:shadow-[inset_0_0_0_1px_var(--border-strong)] active:cursor-grabbing"
                >
                  <span className="min-w-0 flex-1 text-sm leading-snug break-words">{t.text}</span>
                  <span className="pts pts-cyan flex-none">
                    <span>+{t.points}</span>
                  </span>
                </article>
                ))}
              </div>
              {poolMore && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[var(--surface)] to-transparent" />
              )}
            </div>
          ) : (
            <p className="px-1 py-3 text-xs text-muted">Все задания распределены.</p>
          )}
        </div>

        {/* Раунды — строго друг под другом */}
        <div className="space-y-3">
          {sortedRounds.map((r) => {
            const items = assigned.filter((a) => a.roundId === r.id);
            return (
              <div
                key={r.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(r.id);
                }}
                onDragLeave={() => setOver((o) => (o === r.id ? null : o))}
                onDrop={(e) => dropOnRound(e, r.id)}
                className={`panel flex min-h-24 flex-col gap-2.5 p-3 transition ${over === r.id ? "glow-edge" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm uppercase">Раунд {r.number}</span>
                  <span className="text-xs text-muted tnum">{items.length || ""}</span>
                </div>
                {items.length ? (
                  <div className="flex flex-col gap-2">
                    {items.map((a) => (
                      <article
                        key={a.id}
                        draggable
                        onDragStart={(e) => dragStart(e, { kind: "asg", asgId: a.id, taskId: a.starterTaskId, from: r.id })}
                        className="group flex cursor-grab items-center gap-2.5 rounded-md bg-surface-2 p-2.5 shadow-[inset_0_0_0_1px_var(--border)] transition hover:shadow-[inset_0_0_0_1px_var(--border-strong)] active:cursor-grabbing"
                      >
                        <span className="min-w-0 flex-1 text-sm leading-snug break-words">{a.text}</span>
                        <span className="pts pts-cyan flex-none">
                          <span>+{a.points}</span>
                        </span>
                        <button
                          type="button"
                          className="flex-none text-muted transition hover:text-danger"
                          title="Убрать из раунда"
                          onClick={() => unassign(a.id)}
                        >
                          ✕
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="flex flex-1 select-none items-center justify-center py-4 text-xs text-muted">
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
