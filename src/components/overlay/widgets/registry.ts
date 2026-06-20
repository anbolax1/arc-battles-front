import type { ComponentType } from "react";
import type { WidgetType } from "@/lib/types";
import { ScoreboardWidget } from "./scoreboard-widget";
import { RoundWidget } from "./round-widget";
import { ComplicationsWidget } from "./complications-widget";
import { StandingsWidget } from "./standings-widget";
import { RoundTasksWidget } from "./round-tasks-widget";
import { BonusTasksWidget } from "./bonus-tasks-widget";
import { TextWidget } from "./text-widget";
import { LogoWidget } from "./logo-widget";
import type { WidgetProps } from "./types";

/** Реестр виджетов оверлея: тип → компонент. Единый источник для /overlay,
    превью в кабинете и редактора макета. */
export const WIDGET_REGISTRY: Record<WidgetType, ComponentType<WidgetProps>> = {
  scoreboard: ScoreboardWidget,
  round: RoundWidget,
  complications: ComplicationsWidget,
  standings: StandingsWidget,
  roundTasks: RoundTasksWidget,
  bonusTasks: BonusTasksWidget,
  text: TextWidget,
  logo: LogoWidget,
};

/** Русские названия типов (меню «+ добавить виджет», список «Слои»). */
export const WIDGET_LABELS: Record<WidgetType, string> = {
  scoreboard: "Счёт",
  round: "Раунд",
  complications: "Усложнения",
  standings: "Таблица мест",
  roundTasks: "Задания раунда",
  bonusTasks: "Бонусные",
  text: "Текст",
  logo: "Логотип",
};

/** Порядок типов в меню добавления. */
export const WIDGET_ORDER: WidgetType[] = [
  "scoreboard",
  "round",
  "complications",
  "standings",
  "roundTasks",
  "bonusTasks",
  "text",
  "logo",
];
