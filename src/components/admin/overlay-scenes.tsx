"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { DEFAULT_LAYOUT } from "@/components/overlay/default-layout";
import { OverlayEditor } from "@/components/admin/overlay-editor";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { LiveState, OverlayLayout, OverlayPreset, WidgetInstance, WidgetType } from "@/lib/types";

const SAVE_DELAY = 500; // мс без правок до сохранения: перетаскивание и ползунки не шлют запрос на каждый шаг
const RETRY_DELAY = 3000; // мс до повтора, если сервер не ответил
const UNDO_GAP = 600; // мс: правки чаще этого (ползунок) отменяются одним шагом
const UNDO_LIMIT = 100; // сколько шагов отмены помнить

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_TEXT: Record<SaveState, string> = {
  idle: "Правки сразу уходят в ссылку сцены",
  saving: "Сохраняется…",
  saved: "Сохранено, ссылка сцены обновлена",
  error: "Не сохранилось, повторяю…",
};

/** Пример матча для превью: без данных виджеты пустые, и их не расставить.
    Имена условные, чтобы пример не приняли за настоящий матч и таблицу. */
const SAMPLE_STATE: LiveState = {
  tournamentName: "Пример матча",
  status: "live",
  stage: "round",
  mode: "1x1",
  currentRound: 1,
  totalRounds: 2,
  currentParticipantId: "sample-a",
  currentName: "Игрок A",
  currentPoints: 5,
  currentMap: "Поле битвы у Дамбы",
  tasks: [],
  standings: [
    { participantId: "sample-a", name: "Игрок A", points: 5, roundPoints: 2, mmr: 1047, place: 2 },
    { participantId: "sample-b", name: "Игрок B", points: 3, roundPoints: 1, mmr: 1012, place: 4 },
  ],
  roundTasks: [
    { id: "sample-r1", text: "Эвакуироваться с добычей", points: 3, completed: true },
    { id: "sample-r2", text: "Уничтожить ARC-разведчика", points: 2, completed: false },
  ],
  bonusTasks: [
    { text: "Осиное Гнездо: Найдите и уничтожьте 5 Ос.", points: 2, valueType: "fixed", times: 1, category: "task" },
    { text: "Комплекс Гидропонного Купола: Уничтожьте 4 роботов в здании.", points: 2, valueType: "fixed", times: 0, category: "map" },
    { text: "Сапёр: Найдите и уничтожьте 5 Взрывоботов.", points: 1, valueType: "fixed", times: 0, category: "task", opponent: true },
  ],
  complications: [{ text: "S.O.S: Первые 3 минуты рейда: Вызовите Эвакуацию.", penalty: 0, valueType: "fixed", reward: 1, tag: "timed" }],
  chance: { a: 0.6, draw: 0.04, b: 0.4 },
  chanceTrail: [
    { a: 0.49, draw: 0.05, round: 1 },
    { a: 0.62, draw: 0.05, round: 1 },
    { a: 0.54, draw: 0.05, round: 1 },
    { a: 0.46, draw: 0.05, round: 1 },
    { a: 0.51, draw: 0.05, round: 1 },
    { a: 0.6, draw: 0.04, round: 2 },
  ],
  veto: [
    { mapCode: "spaceport", mapName: "Космопорт", action: "ban", side: "A", sideName: "Игрок A" },
    { mapCode: "blue_gate", mapName: "Синие ворота", action: "ban", side: "B", sideName: "Игрок B" },
    { mapCode: "dam", mapName: "Поле битвы у Дамбы", action: "pick", side: "B", sideName: "Игрок B", round: 1 },
    { mapCode: "buried_city", mapName: "Погребённый город", action: "pick", side: "A", sideName: "Игрок A", round: 2 },
  ],
};

/** Данные, которых в идущем матче может не быть: задания и протоколы сервер выдаёт с началом раунда,
    основные задания есть только в старом пульте, поэтому «Заданиям V2» их из примера не подставляем. */
const ofType = (...types: WidgetType[]) => (w: WidgetInstance) => types.includes(w.type);
const SAMPLE_CHANCE: Partial<LiveState> = { chance: SAMPLE_STATE.chance, chanceTrail: SAMPLE_STATE.chanceTrail };
const SAMPLE_PARTS: { uses: (w: WidgetInstance) => boolean; missing: string; has: (s: LiveState) => boolean; part: Partial<LiveState> }[] = [
  { uses: ofType("bonusTasks", "tasksV2"), missing: "заданий", has: (s) => !!s.bonusTasks?.length, part: { bonusTasks: SAMPLE_STATE.bonusTasks } },
  { uses: ofType("roundTasks"), missing: "основных заданий", has: (s) => !!s.roundTasks?.length, part: { roundTasks: SAMPLE_STATE.roundTasks } },
  {
    uses: ofType("complications", "tasksV2"),
    missing: "протоколов",
    has: (s) => !!s.complications?.length || !!s.complication,
    part: { complications: SAMPLE_STATE.complications },
  },
  { uses: ofType("veto"), missing: "пиков-банов", has: (s) => !!s.veto?.length, part: { veto: SAMPLE_STATE.veto } },
  { uses: ofType("chance"), missing: "шанса на победу", has: (s) => !!s.chance, part: SAMPLE_CHANCE },
  // После матча на табло остаётся только итог, поэтому и шанс под счётом в превью - из примера.
  {
    uses: (w) => w.type === "scoreboard" && (!!w.showChance || !!w.showChanceBar),
    missing: "шанса на победу",
    has: (s) => !!s.chance && s.stage !== "finished",
    part: SAMPLE_CHANCE,
  },
];

/** Что показать в превью: настоящий матч, а чего в нём ещё нет - из примера, иначе виджет не расставить. */
function previewOf(state: LiveState | null, layout: OverlayLayout): { data: LiveState; note?: string } {
  if (!state) {
    return {
      data: SAMPLE_STATE,
      note: "Матча сейчас нет: в превью пример с условными игроками. Во время матча здесь и в OBS будут его настоящие данные.",
    };
  }
  const shown = layout.widgets.filter((w) => w.visible);
  const gaps = SAMPLE_PARTS.filter((p) => !p.has(state) && shown.some(p.uses));
  const data = gaps.reduce<LiveState>((s, p) => ({ ...s, ...p.part }), state);
  const names = [...new Set(gaps.map((p) => p.missing))];
  if (!names.length) return { data };
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} и ${names[names.length - 1]}` : names[0];
  return { data, note: `В матче пока нет ${list}: в превью они для примера, в OBS появятся вместе с данными.` };
}

/** Раскладка сцены для редактора: без отметки о выбранной сцене и с обязательными полями. */
function sceneLayout(raw: unknown): OverlayLayout {
  const l = { ...((raw && typeof raw === "object" ? raw : {}) as Partial<OverlayLayout>) };
  delete l.activePresetId;
  return { ...l, version: l.version ?? 1, stageBg: l.stageBg ?? { on: false, opacity: 0.4 }, widgets: Array.isArray(l.widgets) ? l.widgets : [] };
}

function freshName(scenes: OverlayPreset[], base: string): string {
  const names = new Set(scenes.map((s) => s.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} ${i}`)) i += 1;
  return `${base} ${i}`;
}

/** Очередь сохранения сцены: правки уходят по одной, иначе ответ на старую правку мог бы прийти после новой. */
class SceneSaver {
  private pending: { id: string; name: string; layout: OverlayLayout } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private busy = false;
  private gone = new Set<string>();

  constructor(
    private onState: (s: SaveState) => void,
    private onSaved: (p: OverlayPreset) => void,
  ) {}

  push(id: string, name: string, layout: OverlayLayout) {
    this.pending = { id, name, layout };
    this.onState("saving");
    this.schedule(SAVE_DELAY);
  }

  rename(id: string, name: string) {
    if (this.pending?.id === id) this.pending.name = name;
  }

  /** Сцену удалили: её несохранённые правки больше не нужны. */
  drop(id: string) {
    this.gone.add(id);
    if (this.pending?.id === id) this.pending = null;
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const job = this.pending;
    if (this.busy || !job) return; // идущий запрос сам заберёт хвост правок
    this.pending = null;
    this.busy = true;
    let delay = 0;
    try {
      this.onSaved(await api.put<OverlayPreset>(`/overlay/presets/${job.id}`, { name: job.name, layout: job.layout }));
      this.onState(this.pending ? "saving" : "saved");
    } catch {
      if (!this.pending && !this.gone.has(job.id)) this.pending = job;
      this.onState(this.pending ? "error" : "idle");
      delay = RETRY_DELAY;
    } finally {
      this.busy = false;
    }
    if (this.pending) this.schedule(delay);
  }

  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), ms);
  }
}

/** Сцены оверлея: список, выбранная сцена и её раскладка. Выбранную сцену показывает /overlay,
    а правка сразу видна в превью и через полсекунды уходит в саму сцену и её ссылку для OBS. */
function useOverlayScenes(onListChanged?: () => void) {
  const [scenes, setScenes] = React.useState<OverlayPreset[]>([]);
  const [activeId, setActiveId] = React.useState("");
  const [layout, setLayout] = React.useState<OverlayLayout | null>(null);
  const [ready, setReady] = React.useState(false);
  const [save, setSave] = React.useState<SaveState>("idle");
  const [error, setError] = React.useState("");
  const [past, setPast] = React.useState<OverlayLayout[]>([]);
  const [future, setFuture] = React.useState<OverlayLayout[]>([]);
  const lastEdit = React.useRef(0);
  // Раскладку в списке ответ сервера не трогает: в ней уже могут быть правки новее ответа.
  const [saver] = React.useState(
    () => new SceneSaver(setSave, (u) => setScenes((xs) => xs.map((x) => (x.id === u.id ? { ...u, layout: x.layout } : x)))),
  );

  React.useEffect(() => {
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const [list, cur] = await Promise.all([
          api.get<OverlayPreset[]>("/overlay/presets"),
          api.get<Partial<OverlayLayout>>("/overlay/layout"),
        ]);
        if (!alive) return;
        setScenes(list);
        const sc = list.find((x) => x.id === cur?.activePresetId);
        if (sc) {
          setActiveId(sc.id);
          setLayout(sceneLayout(sc.layout));
        }
        setReady(true);
      } catch {
        if (alive) retry = setTimeout(() => void load(), RETRY_DELAY);
      }
    };
    void load();
    return () => {
      alive = false;
      if (retry) clearTimeout(retry);
    };
  }, []);

  // Уход со страницы не теряет правки последних полсекунды.
  React.useEffect(() => () => void saver.flush(), [saver]);

  function apply(next: OverlayLayout) {
    setLayout(next);
    setScenes((xs) => xs.map((x) => (x.id === activeId ? { ...x, layout: next } : x)));
    saver.push(activeId, scenes.find((s) => s.id === activeId)?.name ?? "", next);
  }

  function change(next: OverlayLayout) {
    if (!layout || !activeId) return;
    const now = Date.now();
    if (now - lastEdit.current > UNDO_GAP) {
      setPast((p) => [...p, layout].slice(-UNDO_LIMIT));
      setFuture([]);
    }
    lastEdit.current = now;
    apply(next);
  }

  function undo() {
    const prev = past[past.length - 1];
    if (!prev || !layout) return;
    setPast(past.slice(0, -1));
    setFuture([layout, ...future]);
    lastEdit.current = 0;
    apply(prev);
  }

  function redo() {
    const [next, ...rest] = future;
    if (!next || !layout) return;
    setFuture(rest);
    setPast([...past, layout]);
    lastEdit.current = 0;
    apply(next);
  }

  async function open(sc: OverlayPreset) {
    void saver.flush(); // хвост правок прошлой сцены уходит в неё же
    setActiveId(sc.id);
    setLayout(sceneLayout(sc.layout));
    setPast([]);
    setFuture([]);
    lastEdit.current = 0;
    setError("");
    try {
      await api.put("/overlay/active", { presetId: sc.id });
    } catch {
      setError("Сцена открыта, но сервер не ответил: /overlay может показывать прежнюю.");
    }
  }

  async function select(id: string) {
    const sc = scenes.find((s) => s.id === id);
    if (sc && id !== activeId) await open(sc);
  }

  async function create(base?: OverlayLayout, nameBase = "Сцена") {
    setError("");
    try {
      const p = await api.post<OverlayPreset>("/overlay/presets", {
        name: freshName(scenes, nameBase),
        layout: base ?? sceneLayout(DEFAULT_LAYOUT),
      });
      setScenes((xs) => [...xs, p]);
      onListChanged?.();
      await open(p);
    } catch {
      setError("Не удалось создать сцену.");
    }
  }

  function duplicate() {
    const sc = scenes.find((s) => s.id === activeId);
    if (sc && layout) void create(layout, `${sc.name} копия`);
  }

  async function rename(name: string) {
    const sc = scenes.find((s) => s.id === activeId);
    if (!sc || !name || name === sc.name) return;
    setScenes((xs) => xs.map((x) => (x.id === sc.id ? { ...x, name } : x)));
    saver.rename(sc.id, name);
    try {
      // Без раскладки: переименование не затирает свежие правки сцены.
      const u = await api.put<OverlayPreset>(`/overlay/presets/${sc.id}`, { name });
      setScenes((xs) => xs.map((x) => (x.id === u.id ? { ...u, layout: x.layout } : x)));
      onListChanged?.();
    } catch {
      setError("Не удалось переименовать сцену.");
    }
  }

  async function remove(id: string) {
    const rest = scenes.filter((x) => x.id !== id);
    // Сначала открываем соседнюю сцену, чтобы /overlay не мелькнул раскладкой по умолчанию.
    if (id === activeId && rest[0]) await open(rest[0]);
    saver.drop(id);
    try {
      await api.del(`/overlay/presets/${id}`);
    } catch {
      setError("Не удалось удалить сцену.");
      return;
    }
    setScenes(rest);
    onListChanged?.();
    if (id === activeId && !rest[0]) {
      setActiveId("");
      setLayout(null);
      setPast([]);
      setFuture([]);
    }
  }

  return {
    ready,
    scenes,
    activeId,
    layout,
    save,
    error,
    change,
    select,
    create,
    duplicate,
    rename,
    remove,
    history: { undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 },
  };
}

function SceneName({ name, onSave }: { name: string; onSave: (name: string) => void }) {
  const [draft, setDraft] = React.useState(name);
  return (
    <input
      className="input min-w-[10rem] max-w-[14rem] flex-1"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const clean = draft.trim();
        if (clean && clean !== name) onSave(clean);
        else setDraft(name);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      aria-label="название сцены"
    />
  );
}

/** Редактор сцен оверлея: сцена здесь = сцена в OBS, у каждой своя ссылка /overlay/<адрес>.
    state - данные матча для превью; чего в нём нет, показывается из примера. */
export function OverlaySceneEditor({
  state,
  onClose,
  onScenesChanged,
}: {
  state: LiveState | null;
  onClose?: () => void;
  /** Сцен стало больше или меньше, сменилось название - снаружи обновляется список ссылок для OBS. */
  onScenesChanged?: () => void;
}) {
  const sc = useOverlayScenes(onScenesChanged);
  const [askDelete, setAskDelete] = React.useState(false);
  const active = sc.scenes.find((s) => s.id === sc.activeId) ?? null;

  if (!sc.ready) return <p className="text-sm text-muted">Загружаем сцены…</p>;

  const bar = (
    <div className="space-y-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-muted">Сцены</span>
        {/* Место под статус постоянное: смена надписи не двигает строку. */}
        <span className={`w-56 truncate text-right text-xs ${sc.save === "error" ? "text-danger" : "text-muted"}`}>{SAVE_TEXT[sc.save]}</span>
      </div>
      {/* Карточки одной ширины и с одинаковой подписью: выбор сцены меняет только цвет, ряд не прыгает. */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2">
        {sc.scenes.map((s) => {
          const on = s.id === sc.activeId;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => void sc.select(s.id)}
              title={on ? "эту сцену правите, её же показывает /overlay" : "открыть сцену; /overlay тоже переключится на неё"}
              className={`min-w-0 rounded-md border px-3 py-2 text-left transition-colors ${
                on
                  ? "border-[var(--accent)] bg-[rgba(34,211,238,0.1)] shadow-[inset_3px_0_0_var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
              }`}
            >
              <span className="block truncate font-display text-sm">{s.name}</span>
              <span className={`block truncate text-[0.68rem] ${on ? "text-accent" : "text-muted"}`}>/overlay/{s.slug}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => void sc.create()}
          className="min-w-0 rounded-md border border-dashed border-[var(--border-strong)] px-3 py-2 text-left text-muted transition-colors hover:border-[var(--accent)] hover:text-fg"
        >
          <span className="block truncate font-display text-sm">+ Новая сцена</span>
          <span className="block truncate text-[0.68rem]">со своей ссылкой</span>
        </button>
      </div>
      {active && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-2.5">
          <SceneName key={active.id} name={active.name} onSave={(n) => void sc.rename(n)} />
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={sc.duplicate}>
              <span>Дублировать</span>
            </button>
            <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => setAskDelete(true)}>
              <span>Удалить</span>
            </button>
          </div>
        </div>
      )}
      <p className="text-[0.7rem] leading-snug text-muted">
        Выбранную сцену правите здесь, её же показывает общая ссылка /overlay.
      </p>
      {sc.error && <p className="text-xs text-danger">{sc.error}</p>}
      <ConfirmDialog
        open={askDelete}
        title="Удалить сцену?"
        message={`Сцена «${active?.name ?? ""}» пропадёт, а источник OBS со ссылкой /overlay/${active?.slug ?? ""} покажет «сцена не найдена».`}
        onConfirm={() => {
          setAskDelete(false);
          if (active) void sc.remove(active.id);
        }}
        onCancel={() => setAskDelete(false)}
      />
    </div>
  );

  if (!sc.layout) {
    return (
      <div className="space-y-3">
        {bar}
        <div className="rounded-lg border border-dashed border-[var(--border-strong)] p-6 text-center text-sm text-muted">
          {sc.scenes.length ? (
            "Выберите сцену, чтобы её править."
          ) : (
            <div className="space-y-3">
              <p>Сцен пока нет. Создайте первую: у неё будет своя ссылка для OBS.</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void sc.create()}>
                <span>Создать сцену</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const preview = previewOf(state, sc.layout);
  return (
    <OverlayEditor
      state={{ ...preview.data, layout: sc.layout }}
      layout={sc.layout}
      onChange={sc.change}
      onClose={onClose}
      history={sc.history}
      top={bar}
      note={preview.note}
    />
  );
}
