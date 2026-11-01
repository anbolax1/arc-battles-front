"use client";

import * as React from "react";
import type { CatalogTask, MapInfo, TaskCategory } from "@/lib/types";
import {
  FORMATS,
  FORMAT_COLOR,
  KINDS,
  MAX_POINTS,
  MIN_POINTS,
  RARITIES,
  ROUND_TYPES,
  TIMED_META,
  defaultPoints,
  formatLabel,
  kindLabel,
  parsePoints,
  rarityMeta,
  roundTypeMeta,
  taskFormat,
  taskRarity,
  taskRoundType,
  withTimed,
  type TaskSettings,
} from "@/lib/task-meta";

type ToneStyle = React.CSSProperties & { "--tone"?: string; "--ink"?: string };

/** Кнопка сегмента; с color окрашивается в цвет характеристики. */
export function SegButton({
  pressed,
  onClick,
  color,
  ink,
  children,
  title,
}: {
  pressed: boolean;
  onClick: () => void;
  color?: string;
  ink?: string;
  children: React.ReactNode;
  title?: string;
}) {
  const style: ToneStyle | undefined = color ? { "--tone": color, "--ink": ink } : undefined;
  return (
    <button type="button" className="seg-btn" aria-pressed={pressed} data-tone={color ? "" : undefined} style={style} title={title} onClick={onClick}>
      <span>{children}</span>
    </button>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="field-label block">{label}</span>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

const ROUND_HINT: Record<string, string> = {
  any: "Выпадает в любом раунде.",
  free: "Игрок выступает с бесплатным снаряжением: первый раунд обычного матча.",
  paid: "Игрок играет своим билдом и сам выбирает снаряжение: остальные раунды и шоу-матч.",
};

/**
 * Общие характеристики задания. Одни и те же поля в форме одного задания и во вставке списком,
 * чтобы два способа добавления не расходились.
 * layout "stack" - две колонки для узкой формы, "flow" - поля в строку, переносятся по ширине.
 */
export function TaskSettingsFields({
  value,
  onChange,
  category,
  maps,
  idPrefix,
  pointsHint,
  layout = "stack",
}: {
  value: TaskSettings;
  onChange: (next: TaskSettings) => void;
  category: TaskCategory;
  maps: MapInfo[];
  idPrefix: string;
  pointsHint?: string;
  layout?: "stack" | "flow";
}) {
  const set = (patch: Partial<TaskSettings>) => onChange({ ...value, ...patch });
  const pointsBad = parsePoints(value.points) === null;
  const flow = layout === "flow";

  const format = (
    <Field label="Формат матча" hint={value.format === "any" ? "Выпадает и в 1×1, и в 2×2 (так работают старые задания)." : undefined}>
      <div className="seg seg-wrap">
        {FORMATS.map((f) => (
          <SegButton key={f.id} pressed={value.format === f.id} onClick={() => set({ format: f.id })}>
            {f.label}
          </SegButton>
        ))}
      </div>
    </Field>
  );
  const kind =
    category === "task" ? (
      <Field label="Пул">
        <div className="seg seg-wrap">
          {KINDS.map((k) => (
            <SegButton key={k.id} pressed={value.kind === k.id} onClick={() => set({ kind: k.id })}>
              {k.label}
            </SegButton>
          ))}
        </div>
      </Field>
    ) : null;
  const rarity = (
    <Field label="Редкость">
      <div className="seg seg-wrap">
        {RARITIES.map((r) => (
          <SegButton key={r.id} pressed={value.rarity === r.id} color={r.color} ink={r.ink} onClick={() => set({ rarity: r.id })}>
            {r.label}
          </SegButton>
        ))}
      </div>
    </Field>
  );
  const timed = (
    <Field label={flow ? "Условие" : "Дополнительное условие"} hint={flow ? undefined : "Независимо от редкости: «Обычный» тоже может быть на время."}>
      <div className="seg">
        <SegButton pressed={value.timed} color={TIMED_META.color} ink={TIMED_META.ink} onClick={() => onChange(withTimed(value, category, !value.timed))}>
          {TIMED_META.label}
        </SegButton>
      </div>
    </Field>
  );
  const round = (
    <Field label="Тип раунда" hint={flow ? undefined : ROUND_HINT[value.roundType]}>
      <div className="seg seg-wrap">
        {ROUND_TYPES.map((r) => (
          <SegButton key={r.id} pressed={value.roundType === r.id} color={r.color} ink={r.ink} onClick={() => set({ roundType: r.id })} title={ROUND_HINT[r.id]}>
            {r.label}
          </SegButton>
        ))}
      </div>
    </Field>
  );
  const mapsField =
    category === "task" ? (
      <Field label="Карты" hint={value.mapCodes.length ? undefined : "Ничего не выбрано - задание действует на всех картах."}>
        <div className="flex flex-wrap gap-1.5">
          {maps.map((m) => {
            const on = value.mapCodes.includes(m.code);
            return (
              <button
                key={m.code}
                type="button"
                aria-pressed={on}
                onClick={() => set({ mapCodes: on ? value.mapCodes.filter((c) => c !== m.code) : [...value.mapCodes, m.code] })}
                className={`px-2.5 py-1 text-xs transition ${on ? "bg-[var(--primary-soft)] text-[var(--primary-2)] shadow-[inset_0_0_0_1px_var(--primary)]" : "bg-[var(--surface-2)] text-muted shadow-[inset_0_0_0_1px_var(--border)] hover:text-fg"}`}
              >
                {m.name}
              </button>
            );
          })}
        </div>
      </Field>
    ) : null;
  const points = (
    <Field
      label="Баллы"
      hint={
        <>
          {pointsHint}
          {value.pointsTouched && (
            <>
              {" "}
              <button
                type="button"
                className="underline hover:text-fg"
                onClick={() => onChange({ ...value, pointsTouched: false, points: String(defaultPoints(category, value.timed)) })}
              >
                Вернуть стандартные
              </button>
            </>
          )}
        </>
      }
    >
      <input
        id={`${idPrefix}-pts`}
        type="number"
        inputMode="numeric"
        min={MIN_POINTS}
        max={MAX_POINTS}
        className="input"
        aria-invalid={pointsBad}
        value={value.points}
        onChange={(e) => set({ points: e.target.value, pointsTouched: true })}
      />
    </Field>
  );
  const source = (
    <Field label="Источник">
      <div className="seg seg-wrap">
        <SegButton pressed={value.source === "official"} onClick={() => set({ source: "official" })}>
          Организатор
        </SegButton>
        <SegButton pressed={value.source === "boosty"} onClick={() => set({ source: "boosty" })}>
          Подписчик Boosty
        </SegButton>
      </div>
    </Field>
  );
  const boosty =
    value.source === "boosty" ? (
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" value={value.title} onChange={(e) => set({ title: e.target.value })} placeholder="Титул: «Советник Арены»" />
        <input className="input" value={value.author} onChange={(e) => set({ author: e.target.value })} placeholder="Ник автора" />
      </div>
    ) : null;

  if (flow) {
    return (
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        {format}
        {kind}
        {rarity}
        {timed}
        {round}
        <div className="w-28">{points}</div>
        {source}
        {mapsField && <div className="basis-full">{mapsField}</div>}
        {boosty && <div className="basis-full">{boosty}</div>}
      </div>
    );
  }
  const grid = "grid gap-x-5 gap-y-4 sm:grid-cols-2";
  return (
    <div className="space-y-4">
      <div className={grid}>
        {format}
        {kind}
      </div>
      {rarity}
      <div className={grid}>
        {timed}
        {round}
      </div>
      {mapsField}
      <div className={grid}>
        {points}
        {source}
      </div>
      {boosty}
    </div>
  );
}

function Tone({ color, children, title }: { color: string; children: React.ReactNode; title?: string }) {
  const style: ToneStyle = { "--tone": color };
  return (
    <span className="badge badge-tone" style={style} title={title}>
      <span>{children}</span>
    </span>
  );
}

/**
 * Характеристики задания компактными метками: формат и пул приглушённые, редкость, «на время» и
 * тип раунда цветные. Тип раунда «любой» не показывается - это отсутствие ограничения.
 */
export function TaskTags({ task, showKind = true }: { task: CatalogTask; showKind?: boolean }) {
  const rarity = rarityMeta(taskRarity(task));
  const roundType = taskRoundType(task);
  const round = roundTypeMeta(roundType);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Tone color={FORMAT_COLOR} title="Формат матча">
        {formatLabel(taskFormat(task))}
      </Tone>
      {showKind && (
        <span className="badge badge-official" title="Пул">
          <span>{kindLabel(task.kind)}</span>
        </span>
      )}
      <Tone color={rarity.color} title="Редкость">
        {rarity.label}
      </Tone>
      {task.tag === "timed" && <Tone color={TIMED_META.color}>{TIMED_META.label}</Tone>}
      {roundType !== "any" && round.color && <Tone color={round.color}>{round.label}</Tone>}
    </div>
  );
}
