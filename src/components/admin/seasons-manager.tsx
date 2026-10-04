"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { DateTimePicker } from "@/components/admin/date-time-picker";
import { fmtDate } from "@/lib/format";
import type { Season } from "@/lib/types";

// Даты сезона на сайте показываются в МСК (fmtDate → Europe/Moscow), поэтому и инпут
// якорим к МСК — иначе у админа в другой зоне день в инпуте разойдётся со списком, а
// сохранение без правок сдвинуло бы дату. Конвенция как в schedule-manager (toMskInput).

/** ISO → значение <input type="date"> (YYYY-MM-DD) в календаре МСК. */
function toDateInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // sv-SE даёт ISO-формат YYYY-MM-DD
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** YYYY-MM-DD → ISO полуночи МСК (Москва — фиксированный UTC+3); пусто → null. */
function fromDateInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Пределы правил рейтинга - те же, что проверяет сервер.
const K_MIN = 1;
const K_MAX = 400;
const START_MIN = 1;
const START_MAX = 10000;

/** Целое из поля в заданных пределах; иначе null. */
function parseIntIn(v: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(v.trim())) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
}

/** Поле правила рейтинга. Значение хранится строкой, чтобы его можно было стереть и вписать заново. */
function RuleField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  onChange: (v: string) => void;
}) {
  const invalid = parseIntIn(value, min, max) === null;
  return (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        className="input mt-1 w-full"
        aria-invalid={invalid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className={`mt-1 block text-xs ${invalid ? "text-danger" : "text-muted"}`}>
        от {min} до {max}
      </span>
    </label>
  );
}

/** Управление сезонами рейтинга. «Начать новый» завершает текущий активный и открывает новый.
    Турниры авто-привязываются к активному сезону; рейтинг считается в его рамках. */
export function SeasonsManager({ initial }: { initial: Season[] }) {
  const [seasons, setSeasons] = React.useState<Season[]>(initial);
  const [name, setName] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Season | null>(null);
  const [editing, setEditing] = React.useState<Season | null>(null);
  const [eName, setEName] = React.useState("");
  const [eStart, setEStart] = React.useState("");
  const [eEnd, setEEnd] = React.useState("");
  const [eK, setEK] = React.useState("100");
  const [eStartMmr, setEStartMmr] = React.useState("1000");
  const [newK, setNewK] = React.useState("100");
  const [newStartMmr, setNewStartMmr] = React.useState("1000");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const active = seasons.find((s) => s.status === "active");
  const newRule = { k: parseIntIn(newK, K_MIN, K_MAX), start: parseIntIn(newStartMmr, START_MIN, START_MAX) };
  const editRule = { k: parseIntIn(eK, K_MIN, K_MAX), start: parseIntIn(eStartMmr, START_MIN, START_MAX) };

  async function startNew() {
    if (!name.trim() || newRule.k === null || newRule.start === null) return;
    setBusy(true);
    setError("");
    try {
      const created = await api.post<Season>("/seasons", { name: name.trim(), kFactor: newRule.k, startMmr: newRule.start });
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

  function openEdit(s: Season) {
    setEditing(s);
    setEName(s.name);
    setEStart(toDateInput(s.startedAt));
    setEEnd(toDateInput(s.endedAt));
    setEK(String(s.kFactor || 100));
    setEStartMmr(String(s.startMmr || 1000));
    setError("");
  }

  async function saveEdit() {
    if (!editing || !eName.trim() || !eStart || editRule.k === null || editRule.start === null) return;
    const startedAt = fromDateInput(eStart);
    // Дата окончания необязательна для любого сезона (пусто = не задана).
    const endedAt = fromDateInput(eEnd);
    if (endedAt && startedAt && endedAt < startedAt) {
      setError("Дата окончания раньше даты начала.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const upd = await api.patch<Season>(`/seasons/${editing.id}`, {
        name: eName.trim(),
        startedAt,
        endedAt,
        kFactor: editRule.k,
        startMmr: editRule.start,
      });
      setSeasons((prev) => prev.map((s) => (s.id === upd.id ? upd : s)));
      setEditing(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.body || e.message : "Не удалось сохранить сезон.");
    } finally {
      setBusy(false);
    }
  }

  function openConfirm() {
    setError("");
    setConfirm(true);
  }

  function openDelete(s: Season) {
    setError("");
    setToDelete(s);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl">Сезоны</h2>
        <div className="flex items-center gap-2">
          <input className="input max-w-[14rem]" placeholder="Название нового сезона" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="button" className="btn btn-primary btn-sm" disabled={!name.trim() || busy} onClick={openConfirm}>
            <span>Начать новый сезон</span>
          </button>
        </div>
      </div>

      <p className="max-w-2xl text-sm text-muted">
        Новые матчи автоматически попадают в активный сезон. MMR считается внутри сезона: в начале у всех стартовый,
        шаг Эло задаёт K (в 3 сезоне — 100). «Начать новый сезон» завершает текущий (его таблица замораживается) и открывает следующий.
      </p>

      <div className="panel overflow-hidden">
        <ul className="divide-y divide-[var(--border)]">
          {seasons.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`pill ${s.status === "active" ? "pill-live" : "pill-done"}`}>
                {s.status === "active" && <span className="live-dot" aria-hidden />}
                <span>{s.status === "active" ? "Активный" : "Завершён"}</span>
              </span>
              <span className="font-display text-lg uppercase">{s.name}</span>
              <span className="text-xs text-muted">
                K {s.kFactor} · старт {s.startMmr}
              </span>
              <span className="ml-auto text-xs text-muted">
                {fmtDate(s.startedAt)}
                {s.endedAt ? ` — ${fmtDate(s.endedAt)}` : " — …"}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() => openEdit(s)}
                aria-label={`Изменить сезон ${s.name}`}
              >
                <span>Изменить</span>
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm text-danger"
                disabled={busy}
                onClick={() => openDelete(s)}
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
        onClose={() => {
          setConfirm(false);
          setError("");
        }}
        title="Начать новый сезон?"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>
              <span>Отмена</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy || newRule.k === null || newRule.start === null}
              onClick={startNew}
            >
              <span>{busy ? "Создаём…" : "Начать"}</span>
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Текущий сезон{active ? ` «${active.name}»` : ""} будет завершён (рейтинг заморозится), и откроется новый сезон «{name.trim()}».
          Новые матчи пойдут в него. Прошлые сезоны и их таблицы остаются доступны на /rating.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <RuleField label="K-фактор Эло" value={newK} min={K_MIN} max={K_MAX} onChange={setNewK} />
          <RuleField label="Стартовый MMR" value={newStartMmr} min={START_MIN} max={START_MAX} onChange={setNewStartMmr} />
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Modal>

      <Modal
        open={toDelete !== null}
        onClose={() => {
          setToDelete(null);
          setError("");
        }}
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
          Сезон{toDelete ? ` «${toDelete.name}»` : ""} будет удалён. Его матчи <b>не удаляются</b> — они просто
          отвяжутся от сезона и останутся в истории; в другие сезоны автоматически не попадут.
          {toDelete?.status === "active" && " Это активный сезон — после удаления активного не останется, пока вы не начнёте новый."}
        </p>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => {
          setEditing(null);
          setError("");
        }}
        title="Изменить сезон"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>
              <span>Отмена</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy || !eName.trim() || !eStart || editRule.k === null || editRule.start === null}
              onClick={saveEdit}
            >
              <span>{busy ? "Сохраняем…" : "Сохранить"}</span>
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-muted">Название</span>
            <input className="input mt-1 w-full" value={eName} onChange={(e) => setEName(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-sm">
              <span className="text-muted">Дата начала</span>
              <div className="mt-1">
                <DateTimePicker dateOnly value={eStart} onChange={setEStart} />
              </div>
            </div>
            <div className="text-sm">
              <span className="text-muted">Дата окончания</span>
              <div className="mt-1">
                <DateTimePicker dateOnly clearable value={eEnd} onChange={setEEnd} />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted">Дату окончания можно оставить пустой.</p>
          <div className="grid grid-cols-2 gap-3">
            <RuleField label="K-фактор Эло" value={eK} min={K_MIN} max={K_MAX} onChange={setEK} />
            <RuleField label="Стартовый MMR" value={eStartMmr} min={START_MIN} max={START_MAX} onChange={setEStartMmr} />
          </div>
          <p className="text-xs text-muted">Если поменять K или стартовый MMR, рейтинг сезона пересчитается по всем его матчам.</p>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
