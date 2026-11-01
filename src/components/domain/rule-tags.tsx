import type { CSSProperties } from "react";
import type { CatalogTask } from "@/lib/types";
import { TIMED_META, formatLabel, rarityMeta, roundTypeMeta, taskFormat, taskRarity, taskRoundType } from "@/lib/task-meta";

const base: CSSProperties = {
  fontSize: "0.62rem",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "1px 7px",
  whiteSpace: "nowrap",
};

/** Залитая метка с цветом характеристики: читается и на светлом, и на тёмном фоне. */
const solid = (color: string, ink: string): CSSProperties => ({ ...base, background: color, color: ink });

/** Формат матча - только контур цветом текста страницы, чтобы не спорить с цветными метками. */
const outline: CSSProperties = { ...base, boxShadow: "inset 0 0 0 1px currentColor", opacity: 0.7 };

/** Характеристики задания метками для справочника: формат, редкость, «на время», тип раунда. */
export function RuleTags({ task }: { task: CatalogTask }) {
  const rarity = rarityMeta(taskRarity(task));
  const roundType = taskRoundType(task);
  const round = roundTypeMeta(roundType);
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
      <span style={outline}>{formatLabel(taskFormat(task))}</span>
      <span style={solid(rarity.color, rarity.ink)}>{rarity.label}</span>
      {task.tag === "timed" && <span style={solid(TIMED_META.color, TIMED_META.ink)}>{TIMED_META.label}</span>}
      {roundType !== "any" && round.color && <span style={solid(round.color, round.ink ?? "#111")}>{round.label}</span>}
    </span>
  );
}
