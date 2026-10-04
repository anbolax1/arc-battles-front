"use client";

import * as React from "react";
import { api, errorText } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Panel } from "@/components/ui/card";
import type { CatalogTask, MapInfo, TaskCategory, TaskKind } from "@/lib/types";

const KINDS: Array<[TaskKind, string]> = [
  ["pvp", "PvP"],
  ["pve", "PvE"],
  ["pvpve", "Для всех"],
];

type Draft = {
  id?: string;
  name: string;
  text: string;
  kind: TaskKind;
  mapCode: string;
  points: number;
  active: boolean;
  source: "official" | "boosty";
  author: string;
  title: string;
};

const emptyDraft = (category: TaskCategory, kind: TaskKind, mapCode: string): Draft => ({
  name: "",
  text: "",
  kind,
  mapCode,
  points: category === "protocol" ? 1 : 2,
  active: true,
  source: "official",
  author: "",
  title: "",
});

/** Разбор вставленного списка: «Название | Описание» или «Название<Tab>Описание», по строке на задание. */
function parseBulk(raw: string): Array<{ name: string; text: string }> {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t|\s\|\s/).map((p) => p.trim()).filter(Boolean);
      const name = (parts.length > 1 ? parts[0] : "").replace(/^«|»$/g, "");
      const text = parts.length > 1 ? parts.slice(1).join(" ") : parts[0];
      return { name, text };
    })
    .filter((x) => x.text);
}

/** Каталог 3 сезона: задания (общие и на карты, отдельно PvP и PvE) и протоколы за +1. */
export function TasksCatalog({ initial, maps }: { initial: CatalogTask[]; maps: MapInfo[] }) {
  const [items, setItems] = React.useState(initial);
  const [category, setCategory] = React.useState<TaskCategory>("task");
  const [kind, setKind] = React.useState<TaskKind | "all">("pvp");
  const [mapFilter, setMapFilter] = React.useState<string>("all");
  const [showOff, setShowOff] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [bulk, setBulk] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<CatalogTask | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  const mapName = (code?: string) => maps.find((m) => m.code === code)?.name ?? code ?? "";
  const q = query.trim().toLowerCase();
  const visible = items.filter(
    (t) =>
      (t.category || "task") === category &&
      (showOff || t.active) &&
      (kind === "all" || t.kind === kind || category === "protocol") &&
      (mapFilter === "all" || (mapFilter === "universal" ? !t.mapCode : t.mapCode === mapFilter)) &&
      (!q || `${t.name ?? ""} ${t.text}`.toLowerCase().includes(q)),
  );
  const groups = new Map<string, CatalogTask[]>();
  for (const t of visible) {
    const key = t.mapCode || "";
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const groupOrder = ["", ...maps.map((m) => m.code)].filter((k) => groups.has(k));

  const defaultKind: TaskKind = category === "protocol" ? "pvpve" : kind === "all" ? "pvp" : kind;
  const defaultMap = mapFilter !== "all" && mapFilter !== "universal" ? mapFilter : "";

  async function save() {
    if (!draft || !draft.text.trim()) {
      setErr("Укажите описание задания.");
      return;
    }
    setBusy(true);
    setErr("");
    const body = { ...draft, category, mapCode: category === "protocol" ? "" : draft.mapCode, valueType: "fixed" };
    try {
      const saved = draft.id
        ? await api.patch<CatalogTask>(`/catalog/tasks/${draft.id}`, body)
        : await api.post<CatalogTask>("/catalog/tasks", body);
      setItems((xs) => (draft.id ? xs.map((x) => (x.id === saved.id ? saved : x)) : [...xs, saved]));
      setDraft(null);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(t: CatalogTask) {
    setBusy(true);
    try {
      const saved = await api.patch<CatalogTask>(`/catalog/tasks/${t.id}`, { ...t, active: !t.active });
      setItems((xs) => xs.map((x) => (x.id === saved.id ? saved : x)));
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function importBulk() {
    const rows = parseBulk(bulk ?? "");
    if (!rows.length) {
      setErr("Вставьте хотя бы одну строку.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const created = await api.post<CatalogTask[]>("/catalog/tasks/bulk", {
        items: rows.map((r) => ({
          ...r,
          category,
          kind: defaultKind,
          mapCode: category === "protocol" ? "" : defaultMap,
          points: category === "protocol" ? 1 : 2,
          valueType: "fixed",
        })),
      });
      setItems((xs) => [...xs, ...created]);
      setBulk(null);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(t: CatalogTask) {
    setBusy(true);
    try {
      await api.del(`/catalog/tasks/${t.id}`);
      // Выданное в матчах задание не удаляется, а выключается - перечитаем, что стало.
      const fresh = await api.get<{ tasks: CatalogTask[] }>("/rules");
      setItems(fresh.tasks);
      setDeleting(null);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Задания и протоколы</h2>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBulk("")}>
            <span>Вставить списком</span>
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setDraft(emptyDraft(category, defaultKind, defaultMap))}>
            <span>+ Добавить</span>
          </button>
        </div>
      </div>
      <p className="text-sm text-muted">
        В матче каждой стороне на раунд выпадает общее задание, задание на карту раунда и протокол — из пула под тип игроков, без
        повторов в матче. Задание стоит 2 балла (соперник за чужое получает 1), протокол — 1 балл.
      </p>

      <Panel className="flex flex-wrap items-end gap-x-6 gap-y-3 p-4">
        <div className="space-y-1.5">
          <span className="field-label">Раздел</span>
          <div className="seg">
            <button type="button" className="seg-btn" aria-pressed={category === "task"} onClick={() => setCategory("task")}>
              <span>Задания</span>
            </button>
            <button type="button" className="seg-btn" aria-pressed={category === "protocol"} onClick={() => setCategory("protocol")}>
              <span>Протоколы</span>
            </button>
          </div>
        </div>
        {category === "task" && (
          <>
            <div className="space-y-1.5">
              <span className="field-label">Пул</span>
              <div className="seg">
                {(["pvp", "pve", "all"] as const).map((k) => (
                  <button key={k} type="button" className="seg-btn" aria-pressed={kind === k} onClick={() => setKind(k)}>
                    <span>{k === "all" ? "Все" : k === "pvp" ? "PvP" : "PvE"}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="field-label" htmlFor="cat-map">
                Карта
              </label>
              <select id="cat-map" className="select" value={mapFilter} onChange={(e) => setMapFilter(e.target.value)}>
                <option value="all">Все</option>
                <option value="universal">Общие (без карты)</option>
                {maps.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <label className="field-label" htmlFor="cat-q">
            Поиск
          </label>
          <input id="cat-q" className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Название или текст" />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={showOff} onChange={(e) => setShowOff(e.target.checked)} />
          показывать выключенные
        </label>
      </Panel>

      {err && <p className="text-sm text-danger">{err}</p>}

      {groupOrder.length ? (
        groupOrder.map((key) => (
          <section key={key || "universal"} className="space-y-2">
            <h3 className="font-display text-sm uppercase text-muted">
              {key ? mapName(key) : category === "protocol" ? "Протоколы" : "Общие задания"} · {groups.get(key)!.length}
            </h3>
            <Panel className="divide-y divide-[var(--border)]">
              {groups.get(key)!.map((t) => (
                <div key={t.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${t.active ? "" : "opacity-50"}`}>
                  <div className="min-w-[240px] flex-1">
                    <div className="text-sm font-semibold">{t.name ? `«${t.name}»` : t.text}</div>
                    {t.name && <div className="text-sm text-muted">{t.text}</div>}
                    {t.source === "boosty" && (
                      <div className="text-xs text-[var(--boosty)]">
                        Boosty · {t.title} {t.author}
                      </div>
                    )}
                  </div>
                  <span className="badge badge-official"><span>{KINDS.find(([k]) => k === t.kind)?.[1] ?? t.kind}</span></span>
                  <span className="pts pts-orange"><span>+{t.points}</span></span>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => toggle(t)}>
                    <span>{t.active ? "Выключить" : "Включить"}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setDraft({
                        id: t.id,
                        name: t.name ?? "",
                        text: t.text,
                        kind: t.kind,
                        mapCode: t.mapCode ?? "",
                        points: t.points,
                        active: t.active,
                        source: t.source === "boosty" ? "boosty" : "official",
                        author: t.author ?? "",
                        title: t.title ?? "",
                      })
                    }
                  >
                    <span>Изм.</span>
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleting(t)}>
                    <span>Удал.</span>
                  </button>
                </div>
              ))}
            </Panel>
          </section>
        ))
      ) : (
        <Panel className="p-8 text-center text-sm text-muted">Под эти фильтры ничего нет.</Panel>
      )}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Изменить" : category === "protocol" ? "Новый протокол" : "Новое задание"}>
        {draft && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="space-y-1.5">
              <label className="field-label" htmlFor="d-name">
                Название
              </label>
              <input id="d-name" className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Голыми руками" />
            </div>
            <div className="space-y-1.5">
              <label className="field-label" htmlFor="d-text">
                Описание
              </label>
              <textarea id="d-text" className="input min-h-[80px]" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
            </div>
            {category === "task" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="field-label" htmlFor="d-kind">
                    Пул
                  </label>
                  <select id="d-kind" className="select" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as TaskKind })}>
                    {KINDS.map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="field-label" htmlFor="d-map">
                    Карта
                  </label>
                  <select id="d-map" className="select" value={draft.mapCode} onChange={(e) => setDraft({ ...draft, mapCode: e.target.value })}>
                    <option value="">Общее (любая карта)</option>
                    {maps.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="field-label" htmlFor="d-pts">
                  Баллы
                </label>
                <input
                  id="d-pts"
                  type="number"
                  min={1}
                  max={10}
                  className="input"
                  value={draft.points}
                  onChange={(e) => setDraft({ ...draft, points: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="field-label" htmlFor="d-src">
                  Источник
                </label>
                <select
                  id="d-src"
                  className="select"
                  value={draft.source}
                  onChange={(e) => setDraft({ ...draft, source: e.target.value as Draft["source"] })}
                >
                  <option value="official">Организатор</option>
                  <option value="boosty">Подписчик Boosty</option>
                </select>
              </div>
            </div>
            {draft.source === "boosty" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Титул: «Советник Арены»" />
                <input className="input" value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} placeholder="Ник автора" />
              </div>
            )}
            {err && <p className="text-sm text-danger">{err}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>
                <span>Отмена</span>
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                <span>Сохранить</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={bulk !== null} onClose={() => setBulk(null)} title="Вставить списком">
        <div className="space-y-3">
          <p className="text-sm text-muted">
            По строке на {category === "protocol" ? "протокол" : "задание"}: «Название | Описание» или две колонки, скопированные из таблицы.
            Всё уйдёт в {category === "protocol" ? "протоколы" : `пул ${KINDS.find(([k]) => k === defaultKind)?.[1]}`}
            {category === "task" && (defaultMap ? `, карта «${mapName(defaultMap)}»` : ", общие задания")} — поменять можно фильтрами сверху.
          </p>
          <textarea className="input min-h-[200px] font-mono text-xs" value={bulk ?? ""} onChange={(e) => setBulk(e.target.value)} />
          <p className="text-xs text-muted">Распознано строк: {parseBulk(bulk ?? "").length}</p>
          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBulk(null)}>
              <span>Отмена</span>
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={importBulk}>
              <span>Добавить</span>
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Удалить?"
        message={`«${deleting?.name || deleting?.text}» — если оно уже выпадало в матчах, оно просто выключится, история останется.`}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
      />
    </div>
  );
}
