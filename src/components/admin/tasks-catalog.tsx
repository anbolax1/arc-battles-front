"use client";

import * as React from "react";
import { api, errorText } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Panel } from "@/components/ui/card";
import { TaskSettingsFields, TaskTags } from "@/components/admin/task-parts";
import type { CatalogTask, MapInfo } from "@/lib/types";
import {
  FORMATS,
  KINDS,
  MAX_POINTS,
  MIN_POINTS,
  RARITIES,
  ROUND_TYPES,
  defaultSettings,
  describeSettings,
  matchesFilter,
  parsePoints,
  rarityMeta,
  settingsBody,
  taskFormat,
  taskRarity,
  taskRoundType,
  type TaskFilter,
  type TaskSettings,
} from "@/lib/task-meta";
import { PROBLEM_TEXT, parseBulk, removeRecord, replaceRecord, taskKey, type BulkRow } from "@/lib/task-bulk";

type Draft = { id?: string; name: string; text: string; active: boolean; settings: TaskSettings };

/** Ответ вставки списком: добавленные задания и строки, которые сервер пропустил (с номером в присланном списке). */
type BulkResult = { created: CatalogTask[]; skipped: Array<{ index: number; reason: string }> };

const DEFAULT_FILTER: TaskFilter = {
  format: "all",
  kind: "pvp",
  rarity: "all",
  timed: "all",
  roundType: "all",
  map: "all",
  source: "all",
  showOff: false,
  query: "",
};

const sameFilter = (a: TaskFilter, b: TaskFilter) => (Object.keys(a) as Array<keyof TaskFilter>).every((k) => a[k] === b[k]);

/** Каталог заданий 3 сезона: обычные и на время, отдельно PvP и PvE. */
export function TasksCatalog({ initial, maps }: { initial: CatalogTask[]; maps: MapInfo[] }) {
  const [items, setItems] = React.useState(initial);
  const [filter, setFilter] = React.useState<TaskFilter>(DEFAULT_FILTER);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [bulk, setBulk] = React.useState<{ raw: string; settings: TaskSettings } | null>(null);
  const [deleting, setDeleting] = React.useState<CatalogTask | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [notice, setNotice] = React.useState<{ text: string; hidden: number } | null>(null);

  const setF = (patch: Partial<TaskFilter>) => setFilter((f) => ({ ...f, ...patch }));
  const mapName = (code?: string) => maps.find((m) => m.code === code)?.name ?? code ?? "";
  const visible = items.filter((t) => matchesFilter(t, filter));

  /** Настройки нового задания: выбранные фильтры становятся значениями по умолчанию, чтобы задание не пропало из списка. */
  function settingsFromFilter(): TaskSettings {
    const f = filter;
    return defaultSettings({
      format: f.format === "all" ? "1x1" : f.format,
      kind: f.kind === "all" ? "pvp" : f.kind,
      rarity: f.rarity === "all" ? "common" : f.rarity,
      timed: f.timed === "timed",
      roundType: f.roundType === "all" ? "any" : f.roundType,
      mapCodes: f.map !== "all" && f.map !== "universal" ? [f.map] : [],
      source: f.source === "boosty" ? "boosty" : "official",
    });
  }

  // Задание на нескольких картах стоит в группе каждой своей карты.
  const defaultMap = filter.map !== "all" && filter.map !== "universal" ? filter.map : "";
  const groups = new Map<string, CatalogTask[]>();
  for (const t of visible) {
    const keys = defaultMap ? [defaultMap] : t.mapCodes.length ? t.mapCodes : [""];
    for (const key of keys) groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const groupOrder = ["", ...maps.map((m) => m.code)].filter((k) => groups.has(k));

  /** Сообщение после добавления; если часть заданий скрыта текущими фильтрами, говорим об этом. */
  function announce(text: string, created: CatalogTask[]) {
    const hidden = created.filter((t) => !matchesFilter(t, filter)).length;
    setNotice({ text, hidden });
  }

  const resetFilters = () => {
    setFilter({ ...DEFAULT_FILTER, kind: "all" });
    setNotice(null);
  };

  async function save() {
    if (!draft || !draft.text.trim()) {
      setErr("Укажите описание задания.");
      return;
    }
    const points = parsePoints(draft.settings.points);
    if (points === null) {
      setErr(`Баллы - от ${MIN_POINTS} до ${MAX_POINTS}.`);
      return;
    }
    setBusy(true);
    setErr("");
    const body = { ...settingsBody(draft.settings, points), name: draft.name, text: draft.text, active: draft.active };
    try {
      const saved = draft.id
        ? await api.patch<CatalogTask>(`/catalog/tasks/${draft.id}`, body)
        : await api.post<CatalogTask>("/catalog/tasks", body);
      setItems((xs) => (draft.id ? xs.map((x) => (x.id === saved.id ? saved : x)) : [...xs, saved]));
      if (!draft.id) announce("Задание добавлено.", [saved]);
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

  const edit = (t: CatalogTask) => {
    setErr("");
    setDraft({
      id: t.id,
      name: t.name ?? "",
      text: t.text,
      active: t.active,
      settings: {
        format: taskFormat(t),
        kind: t.kind,
        rarity: taskRarity(t),
        timed: t.tag === "timed",
        roundType: taskRoundType(t),
        mapCodes: t.mapCodes,
        points: String(t.points),
        // у существующего задания баллы заданы: переключение «На время» их не трогает
        pointsTouched: true,
        source: t.source === "boosty" ? "boosty" : "official",
        author: t.author ?? "",
        title: t.title ?? "",
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Задания</h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setErr("");
              setBulk({ raw: "", settings: settingsFromFilter() });
            }}
          >
            <span>Вставить списком</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setErr("");
              setDraft({ name: "", text: "", active: true, settings: settingsFromFilter() });
            }}
          >
            <span>+ Добавить</span>
          </button>
        </div>
      </div>
      <p className="text-sm text-muted">
        В матче каждой стороне на раунд выпадают три задания, одно из них на время (его выполняет только владелец): из пула под тип
        игроков, формат матча и тип раунда, без повторов в матче. Задания на карту пока не выдаются. Обычное задание стоит 2 балла, на время - 1;
        баллы можно задать вручную, от редкости они не зависят. Редкость и «На время» видны на стриме в виджете «Задания V2».
      </p>

      <Panel className="space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <label className="field-label" htmlFor="cat-q">
              Поиск
            </label>
            <input id="cat-q" className="input" value={filter.query} onChange={(e) => setF({ query: e.target.value })} placeholder="Название или текст" />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-muted">
            <input type="checkbox" checked={filter.showOff} onChange={(e) => setF({ showOff: e.target.checked })} />
            показывать выключенные
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <FilterSelect label="Формат" id="f-format" value={filter.format} onChange={(v) => setF({ format: v as TaskFilter["format"] })}>
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Пул" id="f-kind" value={filter.kind} onChange={(v) => setF({ kind: v as TaskFilter["kind"] })}>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Редкость" id="f-rarity" value={filter.rarity} onChange={(v) => setF({ rarity: v as TaskFilter["rarity"] })}>
            {RARITIES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Условие" id="f-timed" value={filter.timed} all="Любое" onChange={(v) => setF({ timed: v as TaskFilter["timed"] })}>
            <option value="timed">На время</option>
            <option value="normal">Не на время</option>
          </FilterSelect>
          <FilterSelect label="Тип раунда" id="f-round" value={filter.roundType} onChange={(v) => setF({ roundType: v as TaskFilter["roundType"] })}>
            {ROUND_TYPES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id === "any" ? "Любой (без привязки)" : r.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Карта" id="f-map" value={filter.map} onChange={(v) => setF({ map: v })}>
            <option value="universal">Общие (без карты)</option>
            {maps.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Источник" id="f-source" value={filter.source} onChange={(v) => setF({ source: v as TaskFilter["source"] })}>
            <option value="official">Организатор</option>
            <option value="boosty">Подписчик Boosty</option>
          </FilterSelect>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>
            Показано {visible.length} из {items.length}
          </span>
          {!sameFilter(filter, DEFAULT_FILTER) && (
            <button type="button" className="underline hover:text-fg" onClick={resetFilters}>
              Сбросить фильтры
            </button>
          )}
        </div>
      </Panel>

      {notice && (
        <p className="flex flex-wrap items-center gap-3 text-sm text-[var(--accent)]">
          <span>{notice.text}</span>
          {notice.hidden > 0 && (
            <>
              <span className="text-muted">Не видно под текущими фильтрами: {notice.hidden}.</span>
              <button type="button" className="underline" onClick={resetFilters}>
                Показать все
              </button>
            </>
          )}
        </p>
      )}
      {err && !draft && !bulk && <p className="text-sm text-danger">{err}</p>}

      {groupOrder.length ? (
        groupOrder.map((key) => (
          <section key={key || "universal"} className="space-y-2">
            <h3 className="font-display text-sm uppercase text-muted">
              {key ? mapName(key) : "Общие задания"} · {groups.get(key)!.length}
            </h3>
            <Panel className="divide-y divide-[var(--border)]">
              {groups.get(key)!.map((t) => (
                <div
                  key={t.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 ${t.active ? "" : "opacity-50"}`}
                  style={{ borderLeft: `3px solid ${rarityMeta(taskRarity(t)).color}` }}
                >
                  <div className="min-w-[240px] flex-1 space-y-1.5">
                    <div>
                      <div className="text-sm font-semibold">{t.name ? `«${t.name}»` : t.text}</div>
                      {t.name && <div className="text-sm text-muted">{t.text}</div>}
                    </div>
                    <TaskTags task={t} />
                    {t.mapCodes.length > 1 && <div className="text-xs text-muted">Карты: {t.mapCodes.map(mapName).join(", ")}</div>}
                    {t.source === "boosty" && (
                      <div className="text-xs text-[var(--boosty)]">
                        Boosty · {t.title} {t.author}
                      </div>
                    )}
                  </div>
                  <span className="pts pts-orange">
                    <span>+{t.points}</span>
                  </span>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => toggle(t)}>
                    <span>{t.active ? "Выключить" : "Включить"}</span>
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => edit(t)}>
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

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Изменить" : "Новое задание"} size="lg">
        {draft && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="space-y-3">
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
                <textarea id="d-text" className="input min-h-[72px]" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
              </div>
            </div>
            <TaskSettingsFields
              idPrefix="d"
              maps={maps}
              value={draft.settings}
              onChange={(settings) => setDraft({ ...draft, settings })}
              pointsHint="Обычное - 2, на время - 1; можно задать своё."
            />
            <div className="sticky bottom-[-1.25rem] z-10 -mx-5 -mb-5 space-y-2 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-3">
              {err && <p className="text-sm text-danger">{err}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>
                  <span>Отмена</span>
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                  <span>Сохранить</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={bulk !== null} onClose={() => setBulk(null)} title="Вставить списком" size="xl">
        {bulk && (
          <BulkForm
            maps={maps}
            items={items}
            state={bulk}
            setState={setBulk}
            busy={busy}
            err={err}
            mapName={mapName}
            onClose={() => setBulk(null)}
            onSubmit={async (rows, settings) => {
              const points = parsePoints(settings.points);
              if (points === null) {
                setErr(`Баллы - от ${MIN_POINTS} до ${MAX_POINTS}.`);
                return null;
              }
              setBusy(true);
              setErr("");
              try {
                const common = settingsBody(settings, points);
                const res = await api.post<BulkResult>("/catalog/tasks/bulk", {
                  items: rows.map((r) => ({ ...common, name: r.name, text: r.text })),
                });
                setItems((xs) => [...xs, ...res.created]);
                announce(`Добавлено заданий: ${res.created.length}.`, res.created);
                return res;
              } catch (e) {
                setErr(errorText(e));
                return null;
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Удалить?"
        message={`«${deleting?.name || deleting?.text}» - если оно уже выпадало в матчах, оно просто выключится, история останется.`}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
      />
    </div>
  );
}

function FilterSelect({
  label,
  id,
  value,
  onChange,
  children,
  all = "Все",
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  all?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">{all}</option>
        {children}
      </select>
    </div>
  );
}

/**
 * Вставка списком: общие настройки один раз, затем список. Текст в поле - единственный источник правды:
 * предпросмотр читает его, а исправление строки переписывает только её.
 */
function BulkForm({
  maps,
  items,
  state,
  setState,
  busy,
  err,
  mapName,
  onClose,
  onSubmit,
}: {
  maps: MapInfo[];
  items: CatalogTask[];
  state: { raw: string; settings: TaskSettings };
  setState: (s: { raw: string; settings: TaskSettings }) => void;
  busy: boolean;
  err: string;
  mapName: (code: string) => string;
  onClose: () => void;
  onSubmit: (rows: BulkRow[], settings: TaskSettings) => Promise<BulkResult | null>;
}) {
  const { raw, settings } = state;
  const [editing, setEditing] = React.useState<number | null>(null);
  const [report, setReport] = React.useState("");

  // Повтор - то же название и описание в том же разделе, пуле и формате (как проверяет сервер).
  const existing = React.useMemo(() => {
    return new Set(
      items
        .filter((t) => t.kind === settings.kind && taskFormat(t) === settings.format)
        .map((t) => taskKey(t.name ?? "", t.text)),
    );
  }, [items, settings.kind, settings.format]);
  const rows = React.useMemo(() => parseBulk(raw, existing), [raw, existing]);
  const ready = rows.filter((r) => !r.problem);
  const problems = rows.filter((r) => r.problem);
  const pointsOk = parsePoints(settings.points) !== null;
  const summary = describeSettings(settings, mapName);

  const setRaw = (next: string) => {
    setReport("");
    setState({ ...state, raw: next });
  };

  async function submit() {
    const res = await onSubmit(ready, settings);
    if (!res) return;
    if (!res.skipped.length) {
      onClose();
      return;
    }
    // Часть строк сервер не принял: добавленные убираем из списка, остальные оставляем для правки.
    const refused = new Set(res.skipped.map((s) => s.index));
    const added = new Set(ready.filter((_, i) => !refused.has(i)).map((r) => r.n));
    const rest = rows.filter((r) => !added.has(r.n)).map((r) => (r.problem === "no-separator" ? r.record.text : `${r.name} | ${r.text}`));
    const why = res.skipped.map((s) => `строка ${ready[s.index]?.n ?? s.index + 1}: ${s.reason}`).join("; ");
    setReport(`Добавлено: ${res.created.length}. Не добавлено: ${res.skipped.length} (${why}).`);
    setState({ ...state, raw: rest.join("\n") });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted">
          Выберите общие настройки: их получат <b>все</b> задания из списка.
        </p>
        <TaskSettingsFields
          idPrefix="b"
          maps={maps}
          value={settings}
          onChange={(s) => setState({ ...state, settings: s })}
          pointsHint="Обычное - 2, на время - 1."
          layout="flow"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <label className="field-label block" htmlFor="b-raw">
            Список заданий
          </label>
          <textarea
            id="b-raw"
            className="input min-h-[220px] font-mono text-xs"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"Уничтожить 3 ARC:Уничтожьте три единицы ARC за рейд\nУбить рейдера | Убейте одного вражеского рейдера\nили две колонки, скопированные из таблицы"}
          />
          <p className="text-xs text-muted">
            По строке на задание: «Название:Описание» (делит первое двоеточие), «Название | Описание» или две
            колонки из Excel / Google Таблиц.
          </p>
        </div>

        <div className="space-y-2">
          <span className="field-label block">Предпросмотр</span>
          {rows.length === 0 ? (
            <p className="bg-[var(--surface-2)] px-3 py-6 text-center text-sm text-muted shadow-[inset_0_0_0_1px_var(--border)]">
              Вставьте список слева - здесь появятся распознанные задания.
            </p>
          ) : (
            <>
              <div className="text-sm">
                <div className="font-semibold">
                  Распознано заданий: {rows.length}
                  {problems.length > 0 && (
                    <span className="font-normal text-muted">
                      {" "}
                      · будет добавлено {ready.length}, пропущено {problems.length}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted">Все задания будут добавлены: {summary}</div>
              </div>
              <ul className="max-h-[210px] divide-y divide-[var(--border)] overflow-y-auto bg-[var(--surface-2)] shadow-[inset_0_0_0_1px_var(--border)]">
                {rows.map((r) => (
                  <PreviewRow
                    key={`${r.n}-${r.record.start}`}
                    row={r}
                    editing={editing === r.n}
                    onEdit={() => setEditing(r.n)}
                    onCancel={() => setEditing(null)}
                    onApply={(name, text) => {
                      setRaw(replaceRecord(raw, r.record, name, text));
                      setEditing(null);
                    }}
                    onRemove={() => {
                      setRaw(removeRecord(raw, r.record));
                      setEditing(null);
                    }}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {report && <p className="text-sm text-[var(--primary-2)]">{report}</p>}
      {err && <p className="text-sm text-danger">{err}</p>}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {!pointsOk && (
          <span className="mr-auto text-xs text-danger">
            Баллы - от {MIN_POINTS} до {MAX_POINTS}.
          </span>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          <span>Отмена</span>
        </button>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy || !ready.length || !pointsOk} onClick={() => void submit()}>
          <span>{ready.length ? `Добавить ${ready.length}` : "Добавить"}</span>
        </button>
      </div>
    </div>
  );
}

/** Строка предпросмотра: распознанное задание или причина пропуска с возможностью поправить. */
function PreviewRow({
  row,
  editing,
  onEdit,
  onCancel,
  onApply,
  onRemove,
}: {
  row: BulkRow;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onApply: (name: string, text: string) => void;
  onRemove: () => void;
}) {
  const [name, setName] = React.useState(row.name);
  const [text, setText] = React.useState(row.text);
  const fixable = row.problem === "no-separator" || row.problem === "empty-name" || row.problem === "empty-text";

  if (editing) {
    return (
      <li className="space-y-2 px-3 py-2.5">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" aria-label={`Название, строка ${row.n}`} />
        <textarea className="input min-h-[56px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Описание" aria-label={`Описание, строка ${row.n}`} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            <span>Отмена</span>
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onApply(name, text)}>
            <span>Готово</span>
          </button>
        </div>
      </li>
    );
  }
  return (
    <li className={`flex items-start gap-2 px-3 py-2 text-sm ${row.problem ? "bg-[rgba(255,90,90,0.06)]" : ""}`}>
      <span className="w-6 shrink-0 pt-0.5 text-xs text-muted">{row.n}</span>
      <div className="min-w-0 flex-1">
        {row.name || row.text ? (
          <div className="break-words">
            {row.name && <b>«{row.name}»</b>} <span className="text-muted">{row.text}</span>
          </div>
        ) : (
          <span className="text-muted">пустая строка</span>
        )}
        {row.problem && (
          <div className="text-xs text-danger">
            {PROBLEM_TEXT[row.problem]}
            {row.duplicateOf ? ` (${row.duplicateOf})` : ""} - строка не будет добавлена
          </div>
        )}
      </div>
      <button
        type="button"
        className="text-xs text-muted underline hover:text-fg"
        onClick={() => {
          setName(row.name);
          setText(row.text);
          onEdit();
        }}
      >
        {fixable ? "Исправить" : "Изм."}
      </button>
      <button type="button" className="text-xs text-muted underline hover:text-danger" onClick={onRemove} aria-label={`Убрать строку ${row.n}`}>
        Убрать
      </button>
    </li>
  );
}
