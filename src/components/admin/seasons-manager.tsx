"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { fmtDate } from "@/lib/format";
import type { Season } from "@/lib/types";

/** Управление сезонами рейтинга. «Начать новый» завершает текущий активный и открывает новый.
    Турниры авто-привязываются к активному сезону; рейтинг считается в его рамках. */
export function SeasonsManager({ initial }: { initial: Season[] }) {
  const [seasons, setSeasons] = React.useState<Season[]>(initial);
  const [name, setName] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Season | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const active = seasons.find((s) => s.status === "active");

  async function startNew() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const created = await api.post<Season>("/seasons", { name: name.trim() });
      // активный стал finished, новый — активный; перезагрузим список с сервера для актуальности
      const list = await api.get<Season[]>("/seasons");
      setSeasons(list);
      void created;
      setName("");
      setConfirm(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.body || e.message : "Не удалось создать сезон.");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!toDelete) return;
    setBusy(true);
    setError("");
    try {
      await api.del<void>(`/seasons/${toDelete.id}`);
      setSeasons((prev) => prev.filter((s) => s.id !== toDelete.id));
      setToDelete(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.body || e.message : "Не удалось удалить сезон.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl">Сезоны</h2>
        <div className="flex items-center gap-2">
          <input className="input max-w-[14rem]" placeholder="Название нового сезона" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="button" className="btn btn-primary btn-sm" disabled={!name.trim() || busy} onClick={() => setConfirm(true)}>
            <span>Начать новый сезон</span>
          </button>
        </div>
      </div>

      <p className="max-w-2xl text-sm text-muted">
        Новые турниры автоматически попадают в активный сезон, а рейтинг на сайте считается по его турнирам.
        «Начать новый сезон» завершает текущий (его таблица замораживается, топ-1 становится чемпионом) и открывает следующий.
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="panel overflow-hidden">
        <ul className="divide-y divide-[var(--border)]">
          {seasons.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`pill ${s.status === "active" ? "pill-live" : "pill-done"}`}>
                {s.status === "active" && <span className="live-dot" aria-hidden />}
                <span>{s.status === "active" ? "Активный" : "Завершён"}</span>
              </span>
              <span className="font-display text-lg uppercase">{s.name}</span>
              <span className="ml-auto text-xs text-muted">
                {fmtDate(s.startedAt)}
                {s.endedAt ? ` — ${fmtDate(s.endedAt)}` : " — …"}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm text-danger"
                disabled={busy}
                onClick={() => setToDelete(s)}
                aria-label={`Удалить сезон ${s.name}`}
              >
                <span>Удалить</span>
              </button>
            </li>
          ))}
          {!seasons.length && <li className="px-4 py-6 text-center text-sm text-muted">Сезонов пока нет.</li>}
        </ul>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Начать новый сезон?"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>
              <span>Отмена</span>
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={startNew}>
              <span>{busy ? "Создаём…" : "Начать"}</span>
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Текущий сезон{active ? ` «${active.name}»` : ""} будет завершён (рейтинг заморозится), и откроется новый сезон «{name.trim()}».
          Новые турниры пойдут в него. Прошлые сезоны и их таблицы остаются доступны на /rating.
        </p>
      </Modal>

      <Modal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Удалить сезон?"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setToDelete(null)}>
              <span>Отмена</span>
            </button>
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={doDelete}>
              <span>{busy ? "Удаляем…" : "Удалить"}</span>
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Сезон{toDelete ? ` «${toDelete.name}»` : ""} будет удалён. Его турниры <b>не удаляются</b> — они просто
          отвяжутся от сезона и останутся в истории; в другие сезоны автоматически не попадут.
          {toDelete?.status === "active" && " Это активный сезон — после удаления активного не останется, пока вы не начнёте новый."}
        </p>
      </Modal>
    </div>
  );
}
