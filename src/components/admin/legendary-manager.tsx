"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtDate } from "@/lib/format";
import { tournamentName } from "@/lib/display";
import type { CatalogLegendary, Participant, TaskKind, Tournament } from "@/lib/types";

const KIND_LABEL: Record<string, string> = { pve: "PvE", pvp: "PvP", pvpve: "PvPvE" };
const normalizeKind = (k?: string): TaskKind => (k === "pve" || k === "pvp" ? k : "pvpve");

/** Раздел «Легендарные контракты» — глобальный пул (10 баллов), выполнимы один раз навсегда.
    CRUD каталога + отметка выполнения (ник/карта/опц. турнир/участник) и возврат в пул. */
export function LegendaryManager({
  initial,
  tournaments,
}: {
  initial: CatalogLegendary[];
  tournaments: Tournament[];
}) {
  const [items, setItems] = React.useState<CatalogLegendary[]>(initial);
  const [editing, setEditing] = React.useState<CatalogLegendary | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<CatalogLegendary | null>(null);
  const [completing, setCompleting] = React.useState<CatalogLegendary | null>(null);

  // Форма каталога.
  const [text, setText] = React.useState("");
  const [points, setPoints] = React.useState(10);
  const [kind, setKind] = React.useState<TaskKind>("pvpve");
  const [source, setSource] = React.useState<"official" | "boosty">("official");
  const [author, setAuthor] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  // Форма выполнения.
  const [cNickname, setCNickname] = React.useState("");
  const [cMap, setCMap] = React.useState("");
  const [cTournamentId, setCTournamentId] = React.useState("");
  const [cParticipantId, setCParticipantId] = React.useState("");
  const [cParticipants, setCParticipants] = React.useState<Participant[]>([]);

  function openCreate() {
    setEditing(null);
    setText("");
    setPoints(10);
    setKind("pvpve");
    setSource("official");
    setAuthor("");
    setTitle("");
    setError("");
    setFormOpen(true);
  }

  function openEdit(it: CatalogLegendary) {
    setEditing(it);
    setText(it.text);
    setPoints(it.points || 10);
    setKind(normalizeKind(it.kind));
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
      points: Number(points) || 10,
      kind,
      source,
      author: source === "boosty" ? author.trim() : "",
      title: source === "boosty" ? title.trim() : "",
    };
    try {
      if (editing) {
        const updated = await api.patch<CatalogLegendary>(`/catalog/legendary/${editing.id}`, body);
        setItems((xs) => xs.map((x) => (x.id === editing.id ? updated : x)));
      } else {
        const created = await api.post<CatalogLegendary>("/catalog/legendary", body);
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
      await api.del(`/catalog/legendary/${id}`);
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch {
      /* оставим список как есть */
    }
    setDeleting(null);
  }

  function openComplete(it: CatalogLegendary) {
    setCompleting(it);
    setCNickname("");
    setCMap("");
    setCTournamentId("");
    setCParticipantId("");
    setCParticipants([]);
    setError("");
  }

  // При выборе турнира подтягиваем участников для опционального выбора.
  // setState только после await (без синхронного set-state-in-effect).
  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!cTournamentId) {
        if (active) setCParticipants([]);
        return;
      }
      try {
        const t = await api.get<Tournament>(`/tournaments/${cTournamentId}`);
        if (active) setCParticipants(t.participants ?? []);
      } catch {
        if (active) setCParticipants([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [cTournamentId]);

  async function submitComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!completing) return;
    if (!cNickname.trim()) {
      setError("Укажите ник.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body: Record<string, unknown> = { nickname: cNickname.trim(), map: cMap.trim() };
      if (cTournamentId) body.tournamentId = cTournamentId;
      if (cParticipantId) body.participantId = cParticipantId;
      const updated = await api.post<CatalogLegendary>(`/legendary/${completing.id}/complete`, body);
      setItems((xs) => xs.map((x) => (x.id === completing.id ? updated : x)));
      setCompleting(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.body || err.message : "Не удалось отметить.");
    } finally {
      setBusy(false);
    }
  }

  async function reopen(it: CatalogLegendary) {
    setBusy(true);
    try {
      const updated = await api.post<CatalogLegendary>(`/legendary/${it.id}/reopen`);
      setItems((xs) => xs.map((x) => (x.id === it.id ? updated : x)));
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl">Легендарные контракты</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Глобальный пул на 10 баллов. Каждый выполним <span className="text-fg">один раз навсегда</span> — после
            выполнения уходит в журнал (ник / дата / карта) и недоступен остальным.
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
          <span>+ Добавить</span>
        </button>
      </div>

      {items.length ? (
        <div className="space-y-3">
          {items.map((it) => {
            const done = it.status === "done";
            return (
              <div
                key={it.id}
                className={`panel flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between ${done ? "opacity-90" : ""}`}
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="pts pts-orange flex-none">
                      <span>+{it.points || 10}</span>
                    </span>
                    <span className="chip">
                      <span>{KIND_LABEL[normalizeKind(it.kind)]}</span>
                    </span>
                    {it.source === "boosty" ? <Badge kind="boosty">Boosty</Badge> : <Badge kind="official">official</Badge>}
                    {done ? (
                      <span className="chip chip-cyan text-[0.62rem]">
                        <span className="dot" />
                        <span>Выполнен</span>
                      </span>
                    ) : (
                      <span className="chip text-[0.62rem]">
                        <span>Доступен</span>
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{it.text}</p>
                  {it.source === "boosty" && (it.title || it.author) && (
                    <p className="text-xs text-muted">
                      {it.title}
                      {it.title && it.author ? " · " : ""}
                      {it.author}
                    </p>
                  )}
                  {done && it.completion && (
                    <p className="text-xs text-muted">
                      Выполнил <span className="text-fg">{it.completion.nickname}</span>
                      {it.completion.map ? ` · ${it.completion.map}` : ""}
                      {it.completion.completedAt ? ` · ${fmtDate(it.completion.completedAt)}` : ""}
                      {it.completion.tournamentTitle ? ` · ${it.completion.tournamentTitle}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-none flex-wrap items-center gap-2">
                  {done ? (
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => reopen(it)}>
                      <span>Вернуть в пул</span>
                    </button>
                  ) : (
                    <button type="button" className="btn btn-cyan btn-sm" disabled={busy} onClick={() => openComplete(it)}>
                      <span>Отметить выполненным</span>
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(it)}>
                    <span>Изм.</span>
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleting(it)}>
                    <span>Удал.</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Легендарных контрактов нет" hint="Добавьте первый кнопкой выше." />
      )}

      {/* Создание / редактирование */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Изменить легендарный контракт" : "Новый легендарный контракт"}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFormOpen(false)}>
              <span>Отмена</span>
            </button>
            <button type="submit" form="legendary-form" className="btn btn-primary btn-sm" disabled={busy}>
              <span>{busy ? "Сохраняем…" : "Сохранить"}</span>
            </button>
          </>
        }
      >
        <form id="legendary-form" className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <label className="field-label" htmlFor="lf-text">Контракт</label>
            <textarea id="lf-text" className="textarea" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-28 space-y-1.5">
              <label className="field-label" htmlFor="lf-points">Баллы</label>
              <input id="lf-points" type="number" min={1} className="input" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <label className="field-label" htmlFor="lf-kind">Вид</label>
              <select id="lf-kind" className="select" value={kind} onChange={(e) => setKind(e.target.value as TaskKind)}>
                <option value="pve">PvE</option>
                <option value="pvp">PvP</option>
                <option value="pvpve">PvPvE</option>
              </select>
            </div>
          </div>
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
                <label className="field-label" htmlFor="lf-author">Автор (Boosty)</label>
                <input id="lf-author" className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="field-label" htmlFor="lf-title">Титул</label>
                <input id="lf-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="напр. Архитектор Арены" />
              </div>
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Modal>

      {/* Отметить выполненным */}
      <Modal
        open={!!completing}
        onClose={() => setCompleting(null)}
        title="Отметить выполненным"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCompleting(null)}>
              <span>Отмена</span>
            </button>
            <button type="submit" form="legendary-complete" className="btn btn-primary btn-sm" disabled={busy}>
              <span>{busy ? "…" : "Отметить"}</span>
            </button>
          </>
        }
      >
        <form id="legendary-complete" className="space-y-4" onSubmit={submitComplete}>
          {completing && <p className="text-sm text-muted">«{completing.text}»</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="field-label" htmlFor="lc-nick">Ник</label>
              <input id="lc-nick" className="input" value={cNickname} onChange={(e) => setCNickname(e.target.value)} placeholder="кто выполнил" />
            </div>
            <div className="space-y-1.5">
              <label className="field-label" htmlFor="lc-map">Карта</label>
              <input id="lc-map" className="input" value={cMap} onChange={(e) => setCMap(e.target.value)} placeholder="напр. Космопорт" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="field-label" htmlFor="lc-tour">Турнир (необязательно)</label>
            <select
              id="lc-tour"
              className="select"
              value={cTournamentId}
              onChange={(e) => {
                setCTournamentId(e.target.value);
                setCParticipantId(""); // сбрасываем выбор участника при смене турнира
              }}
            >
              <option value="">— без привязки —</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {tournamentName(t)}
                </option>
              ))}
            </select>
          </div>
          {cTournamentId && cParticipants.length > 0 && (
            <div className="space-y-1.5">
              <label className="field-label" htmlFor="lc-part">Участник (необязательно)</label>
              <select id="lc-part" className="select" value={cParticipantId} onChange={(e) => setCParticipantId(e.target.value)}>
                <option value="">— не указывать —</option>
                {cParticipants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Modal>

      {/* Удаление */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Удалить легендарный контракт?"
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
