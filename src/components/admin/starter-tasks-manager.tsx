"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import type { StarterTask, TaskKind } from "@/lib/types";

const KIND_LABEL: Record<TaskKind, string> = { pve: "PvE", pvp: "PvP", mixed: "Смешанное" };

/** CRUD пула стартовых заданий. Скрыты от публики — раскидываются по раундам в «Расписании»
    и отмечаются выполненными в «Эфире». */
export function StarterTasksManager({ initial }: { initial: StarterTask[] }) {
  const [items, setItems] = React.useState<StarterTask[]>(initial);
  const [editing, setEditing] = React.useState<StarterTask | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<StarterTask | null>(null);

  const [text, setText] = React.useState("");
  const [points, setPoints] = React.useState(1);
  const [kind, setKind] = React.useState<TaskKind>("mixed");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  function openCreate() {
    setEditing(null);
    setText("");
    setPoints(1);
    setKind("mixed");
    setError("");
    setFormOpen(true);
  }

  function openEdit(it: StarterTask) {
    setEditing(it);
    setText(it.text);
    setPoints(it.points);
    setKind(it.kind ?? "mixed");
    setError("");
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("Укажите текст задания.");
      return;
    }
    setBusy(true);
    setError("");
    const body = { text: text.trim(), points: Number(points) || 0, kind };
    try {
      if (editing) {
        const updated = await api.patch<StarterTask>(`/starter-tasks/${editing.id}`, body);
        setItems((xs) => xs.map((x) => (x.id === editing.id ? updated : x)));
      } else {
        const created = await api.post<StarterTask>("/starter-tasks", body);
        setItems((xs) => [...xs, created]);
      }
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.body || err.message : "Не удалось сохранить.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    try {
      await api.del(`/starter-tasks/${id}`);
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch {
      /* оставим список как есть */
    }
    setDeleting(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl">Стартовые задания</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Скрытый пул заданий. Обычные игроки их не видят (нет в правилах). Раскидываются
            по раундам турнира в «Расписании» и засчитываются в «Эфире».
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
          <span>+ Добавить</span>
        </button>
      </div>

      {items.length ? (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Задание</th>
                <th className="px-4 py-3">Вид</th>
                <th className="px-4 py-3 text-right">Баллы</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-[var(--border)] align-top last:border-0">
                  <td className="px-4 py-3">
                    <div className="max-w-xl">{it.text}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="chip">
                      <span>{KIND_LABEL[it.kind] ?? it.kind}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="pts pts-cyan">
                      <span>+{it.points}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(it)}>
                        <span>Изм.</span>
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleting(it)}>
                        <span>Удал.</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Пул пуст" hint="Добавьте первое стартовое задание кнопкой выше." />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Изменить задание" : "Новое стартовое задание"}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFormOpen(false)}>
              <span>Отмена</span>
            </button>
            <button type="submit" form="starter-form" className="btn btn-primary btn-sm" disabled={busy}>
              <span>{busy ? "Сохраняем…" : "Сохранить"}</span>
            </button>
          </>
        }
      >
        <form id="starter-form" className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <label className="field-label" htmlFor="sf-text">Задание</label>
            <textarea id="sf-text" className="textarea" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-28 space-y-1.5">
              <label className="field-label" htmlFor="sf-points">Баллы</label>
              <input
                id="sf-points"
                type="number"
                min={0}
                className="input"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="field-label" htmlFor="sf-kind">Вид</label>
              <select id="sf-kind" className="select" value={kind} onChange={(e) => setKind(e.target.value as TaskKind)}>
                <option value="pve">PvE</option>
                <option value="pvp">PvP</option>
                <option value="mixed">Смешанное</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Удалить задание?"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleting(null)}>
              <span>Отмена</span>
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={confirmDelete}>
              <span>Удалить</span>
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          «{deleting?.text}» будет удалено из пула. Уже сделанные назначения по раундам тоже исчезнут.
        </p>
      </Modal>
    </div>
  );
}
