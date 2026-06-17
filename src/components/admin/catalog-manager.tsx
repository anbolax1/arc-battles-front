"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { complicationPenalty, taskReward } from "@/lib/format";

type Kind = "task" | "complication";

export interface CatalogItem {
  id: string;
  text: string;
  valueType: "fixed" | "percent";
  source: string;
  author?: string;
  title?: string;
  points?: number;
  penalty?: number;
  kind?: string;
}

const KIND_LABEL: Record<string, string> = { pve: "PvE", pvp: "PvP", mixed: "Смешанное" };

function valueOf(it: CatalogItem, kind: Kind): number {
  return (kind === "task" ? it.points : it.penalty) ?? 0;
}

/** CRUD каталога заданий/усложнений. kind задаёт эндпоинт, поле значения и наличие «вида». */
export function CatalogManager({ kind, initial }: { kind: Kind; initial: CatalogItem[] }) {
  const isTask = kind === "task";
  const base = isTask ? "/catalog/tasks" : "/catalog/complications";
  const valueKey = isTask ? "points" : "penalty";

  const [items, setItems] = React.useState<CatalogItem[]>(initial);
  const [editing, setEditing] = React.useState<CatalogItem | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<CatalogItem | null>(null);

  const [text, setText] = React.useState("");
  const [value, setValue] = React.useState(1);
  const [valueType, setValueType] = React.useState<"fixed" | "percent">("fixed");
  const [taskKind, setTaskKind] = React.useState("mixed");
  const [source, setSource] = React.useState<"official" | "boosty">("official");
  const [author, setAuthor] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  function openCreate() {
    setEditing(null);
    setText("");
    setValue(1);
    setValueType("fixed");
    setTaskKind("mixed");
    setSource("official");
    setAuthor("");
    setTitle("");
    setError("");
    setFormOpen(true);
  }

  function openEdit(it: CatalogItem) {
    setEditing(it);
    setText(it.text);
    setValue(valueOf(it, kind));
    setValueType(it.valueType);
    setTaskKind(it.kind ?? "mixed");
    setSource(it.source === "boosty" ? "boosty" : "official");
    setAuthor(it.author ?? "");
    setTitle(it.title ?? "");
    setError("");
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("Укажите текст.");
      return;
    }
    setBusy(true);
    setError("");
    const body: Record<string, unknown> = {
      text: text.trim(),
      [valueKey]: Number(value) || 0,
      valueType,
      source,
      author: source === "boosty" ? author.trim() : "",
      title: source === "boosty" ? title.trim() : "",
    };
    if (isTask) body.kind = taskKind;
    try {
      if (editing) {
        const updated = await api.patch<CatalogItem>(`${base}/${editing.id}`, body);
        setItems((xs) => xs.map((x) => (x.id === editing.id ? updated : x)));
      } else {
        const created = await api.post<CatalogItem>(base, body);
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
      await api.del(`${base}/${id}`);
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch {
      /* оставим список как есть */
    }
    setDeleting(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl">{isTask ? "Бонусные задания" : "Усложнения"}</h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
          <span>+ Добавить</span>
        </button>
      </div>

      {items.length ? (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">{isTask ? "Задание" : "Усложнение"}</th>
                {isTask && <th className="px-4 py-3">Вид</th>}
                <th className="px-4 py-3">Источник</th>
                <th className="px-4 py-3 text-right">{isTask ? "Награда" : "Штраф"}</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-[var(--border)] align-top last:border-0">
                  <td className="px-4 py-3">
                    <div className="max-w-md">{it.text}</div>
                    {it.source === "boosty" && (it.title || it.author) && (
                      <div className="mt-1 text-xs text-muted">
                        {it.title}
                        {it.title && it.author ? " · " : ""}
                        {it.author}
                      </div>
                    )}
                  </td>
                  {isTask && (
                    <td className="px-4 py-3">
                      <span className="chip">
                        <span>{KIND_LABEL[it.kind ?? "mixed"] ?? it.kind}</span>
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {it.source === "boosty" ? <Badge kind="boosty">Boosty</Badge> : <Badge kind="official">official</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`pts ${isTask ? (it.valueType === "percent" ? "pts-orange" : "pts-cyan") : "pts-minus"}`}>
                      <span>
                        {isTask
                          ? taskReward({ points: valueOf(it, kind), valueType: it.valueType })
                          : complicationPenalty({ penalty: valueOf(it, kind), valueType: it.valueType })}
                      </span>
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
        <EmptyState
          title={isTask ? "Бонусных заданий нет" : "Усложнений нет"}
          hint="Добавьте первую запись кнопкой выше."
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Изменить" : "Добавить"}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFormOpen(false)}>
              <span>Отмена</span>
            </button>
            <button type="submit" form="catalog-form" className="btn btn-primary btn-sm" disabled={busy}>
              <span>{busy ? "Сохраняем…" : "Сохранить"}</span>
            </button>
          </>
        }
      >
        <form id="catalog-form" className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <label className="field-label" htmlFor="cf-text">
              {isTask ? "Задание" : "Усложнение"}
            </label>
            <textarea id="cf-text" className="textarea" value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <span className="field-label">Тип значения</span>
              <div className="seg">
                <button type="button" className="seg-btn" aria-pressed={valueType === "fixed"} onClick={() => setValueType("fixed")}>
                  <span>Баллы</span>
                </button>
                <button type="button" className="seg-btn" aria-pressed={valueType === "percent"} onClick={() => setValueType("percent")}>
                  <span>Процент</span>
                </button>
              </div>
            </div>
            <div className="w-28 space-y-1.5">
              <label className="field-label" htmlFor="cf-value">
                {isTask ? "Награда" : "Штраф"}
                {valueType === "percent" ? ", %" : ""}
              </label>
              <input
                id="cf-value"
                type="number"
                min={0}
                className="input"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
              />
            </div>
          </div>

          {isTask && (
            <div className="space-y-1.5">
              <label className="field-label" htmlFor="cf-kind">Вид</label>
              <select id="cf-kind" className="select" value={taskKind} onChange={(e) => setTaskKind(e.target.value)}>
                <option value="pve">PvE</option>
                <option value="pvp">PvP</option>
                <option value="mixed">Смешанное</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <span className="field-label">Источник</span>
            <div className="seg">
              <button type="button" className="seg-btn" aria-pressed={source === "official"} onClick={() => setSource("official")}>
                <span>Official</span>
              </button>
              <button type="button" className="seg-btn" aria-pressed={source === "boosty"} onClick={() => setSource("boosty")}>
                <span>Boosty</span>
              </button>
            </div>
          </div>

          {source === "boosty" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="field-label" htmlFor="cf-author">Автор (Boosty)</label>
                <input id="cf-author" className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="field-label" htmlFor="cf-title">Титул</label>
                <input
                  id="cf-title"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="напр. Архитектор Арены"
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Удалить запись?"
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
        <p className="text-sm text-muted">«{deleting?.text}» будет удалено безвозвратно.</p>
      </Modal>
    </div>
  );
}
