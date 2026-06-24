"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type Kind = "task" | "complication";

export interface CatalogItem {
  id: string;
  text: string;
  source: string;
  author?: string;
  title?: string;
  kind?: string;
}

// Вид задания у контракта: pve | pvp | pvpve ('mixed' из старых данных → pvpve).
const KIND_LABEL: Record<string, string> = { pve: "PvE", pvp: "PvP", pvpve: "PvPvE" };
const normalizeKind = (k?: string): "pve" | "pvp" | "pvpve" => (k === "pve" || k === "pvp" ? k : "pvpve");

/** CRUD каталога контрактов/протоколов.
    Контракты (kind="task"): text + вид (pve|pvp|pvpve), награда фиксирована (2 балла своему / 1 противнику)
      — поле значения/процента не показываем, бэк проставляет дефолт.
    Протоколы (kind="complication"): только text + источник/автор/титул — штраф = минуты в рейде,
      на очки не влияет; бэк проставляет дефолт. */
export function CatalogManager({ kind, initial }: { kind: Kind; initial: CatalogItem[] }) {
  const isTask = kind === "task";
  const base = isTask ? "/catalog/tasks" : "/catalog/complications";

  const [items, setItems] = React.useState<CatalogItem[]>(initial);
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<CatalogItem | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<CatalogItem | null>(null);

  const [text, setText] = React.useState("");
  const [taskKind, setTaskKind] = React.useState<"pve" | "pvp" | "pvpve">("pvpve");
  const [source, setSource] = React.useState<"official" | "boosty">("official");
  const [author, setAuthor] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  function openCreate() {
    setEditing(null);
    setText("");
    setTaskKind("pvpve");
    setSource("official");
    setAuthor("");
    setTitle("");
    setError("");
    setFormOpen(true);
  }

  function openEdit(it: CatalogItem) {
    setEditing(it);
    setText(it.text);
    setTaskKind(normalizeKind(it.kind));
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

  // Номер = позиция в общем списке (тот же порядок, что в правилах и эфире).
  const numbered = items.map((it, i) => ({ it, num: i + 1 }));
  const q = query.trim().toLowerCase();
  const shown = q
    ? numbered.filter(({ it, num }) => String(num) === q || String(num).startsWith(q) || it.text.toLowerCase().includes(q))
    : numbered;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl">{isTask ? "Контракты" : "Протоколы"}</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по № или тексту…"
              className="input pl-9"
              aria-label="Поиск"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <span>+ Добавить</span>
          </button>
        </div>
      </div>

      {isTask ? (
        <p className="text-sm text-muted">
          Награда за контракт фиксирована: <span className="text-fg">+2 балла</span> за свой выполненный и
          <span className="text-fg"> +1 балл</span> за выполненный контракт противника.
        </p>
      ) : (
        <p className="text-sm text-muted">
          Штраф за нарушение протокола — <span className="text-fg">минуты в рейде</span> (число нарушений = минут).
          На очки не влияет. 1 протокол на игрока за турнир.
        </p>
      )}

      {items.length ? (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 text-right">№</th>
                <th className="px-4 py-3">{isTask ? "Контракт" : "Протокол"}</th>
                {isTask && <th className="px-4 py-3">Вид</th>}
                <th className="px-4 py-3">Источник</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ it, num }) => (
                <tr key={it.id} className="border-b border-[var(--border)] align-top last:border-0">
                  <td className="px-4 py-3 text-right font-display text-muted tnum">{num}</td>
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
                        <span>{KIND_LABEL[normalizeKind(it.kind)]}</span>
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {it.source === "boosty" ? <Badge kind="boosty">Boosty</Badge> : <Badge kind="official">official</Badge>}
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
              {!shown.length && (
                <tr>
                  <td colSpan={isTask ? 5 : 4} className="px-4 py-6 text-center text-sm text-muted">
                    Ничего не найдено по запросу «{query}»
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title={isTask ? "Контрактов нет" : "Протоколов нет"}
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
              {isTask ? "Контракт" : "Протокол"}
            </label>
            <textarea id="cf-text" className="textarea" value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          {isTask && (
            <div className="space-y-1.5">
              <label className="field-label" htmlFor="cf-kind">Вид</label>
              <select id="cf-kind" className="select" value={taskKind} onChange={(e) => setTaskKind(e.target.value as "pve" | "pvp" | "pvpve")}>
                <option value="pve">PvE</option>
                <option value="pvp">PvP</option>
                <option value="pvpve">PvPvE</option>
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
        <p className="text-sm text-muted">{deleting?.text} будет удалено безвозвратно.</p>
      </Modal>
    </div>
  );
}
