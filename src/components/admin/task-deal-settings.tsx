"use client";

import * as React from "react";
import { api, errorText } from "@/lib/api";
import { Panel } from "@/components/ui/card";
import { SegButton } from "@/components/admin/task-parts";
import { RARITIES } from "@/lib/task-meta";

/** Общие правила раздачи заданий; пределы те же, что на сервере. */
interface TaskDealSettings {
  timedEnabled: boolean;
  maxPoints: number;
  maxTasks: number;
}

const MAX_POINTS = 30;
const MAX_TASKS = 10;

/** Целое от 1 до max из поля ввода; иначе null. */
function toInt(v: string, max: number): number | null {
  if (!/^\d+$/.test(v.trim())) return null;
  const n = Number(v);
  return n >= 1 && n <= max ? n : null;
}

/** Правила раздачи: задание на время вкл/выкл, на сколько очков и сколько обычных заданий получает сторона в раунде. */
export function TaskDealSettingsPanel() {
  const [saved, setSaved] = React.useState<TaskDealSettings | null>(null);
  const [timed, setTimed] = React.useState(true);
  const [points, setPoints] = React.useState("");
  const [tasks, setTasks] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const load = React.useCallback((s: TaskDealSettings) => {
    setSaved(s);
    setTimed(s.timedEnabled);
    setPoints(String(s.maxPoints));
    setTasks(String(s.maxTasks));
  }, []);

  React.useEffect(() => {
    api
      .get<TaskDealSettings>("/task-settings")
      .then(load)
      .catch((e) => setMsg({ ok: false, text: errorText(e) }));
  }, [load]);

  const p = toInt(points, MAX_POINTS);
  const n = toInt(tasks, MAX_TASKS);
  const dirty = !!saved && (saved.timedEnabled !== timed || String(saved.maxPoints) !== points.trim() || String(saved.maxTasks) !== tasks.trim());

  async function save() {
    if (p === null || n === null) return;
    setBusy(true);
    setMsg(null);
    try {
      load(await api.put<TaskDealSettings>("/task-settings", { timedEnabled: timed, maxPoints: p, maxTasks: n }));
      setMsg({ ok: true, text: "Сохранено. Действует со следующей раздачи, выданные задания не меняются." });
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="space-y-4 p-4">
      <div>
        <h3 className="font-display text-sm uppercase text-muted">Раздача заданий</h3>
        <p className="mt-1 text-sm text-muted">
          Очки задания равны его редкости: {RARITIES.map((r, i) => `${r.label.toLowerCase()} ${i + 1}`).join(", ")}. Сторона получает в раунде
          набор обычных заданий на заданное число очков, например при 5: пять обычных, необычное + редкое, эпическое + обычное или одно легендарное.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <div className="space-y-1.5">
          <span className="field-label block">Задание на время</span>
          <div className="seg">
            <SegButton pressed={timed} onClick={() => setTimed(true)}>
              Включено
            </SegButton>
            <SegButton pressed={!timed} onClick={() => setTimed(false)}>
              Выключено
            </SegButton>
          </div>
          <p className="max-w-[260px] text-xs text-muted">Одно на сторону в раунде, сверх лимитов ниже.</p>
        </div>
        <div className="space-y-1.5">
          <label className="field-label block" htmlFor="ds-points">
            Очков на раунд
          </label>
          <input
            id="ds-points"
            className="input"
            style={{ maxWidth: 112 }}
            inputMode="numeric"
            aria-invalid={p === null}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
          <p className="text-xs text-muted">От 1 до {MAX_POINTS}</p>
        </div>
        <div className="space-y-1.5">
          <label className="field-label block" htmlFor="ds-tasks">
            Заданий на раунд, не больше
          </label>
          <input
            id="ds-tasks"
            className="input"
            style={{ maxWidth: 112 }}
            inputMode="numeric"
            aria-invalid={n === null}
            value={tasks}
            onChange={(e) => setTasks(e.target.value)}
          />
          <p className="text-xs text-muted">Обычных, от 1 до {MAX_TASKS}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy || !dirty || p === null || n === null} onClick={() => void save()}>
          <span>Сохранить</span>
        </button>
        {msg && <span className={`text-sm ${msg.ok ? "text-muted" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </Panel>
  );
}
