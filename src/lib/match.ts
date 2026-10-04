/* Расчёты по матчу 3 сезона для пульта, главной и страницы матча: стороны A/B, счёт по раундам,
   подписи стадий и превью карт. */

import type { MatchStage, MatchState, Participant, RoundBonusTask, Tournament } from "@/lib/types";

/** Превью карты по коду (картинки лежат в /public/maps). */
export function mapImage(code?: string | null): string {
  return code ? `/maps/${code}.jpg` : "";
}

/** Стороны матча по порядку: A - тот, кто банит первым. */
export function matchSides(st: MatchState): [Participant | null, Participant | null] {
  const parts = [...(st.tournament.participants ?? [])].sort((a, b) => a.seed - b.seed);
  return [parts[0] ?? null, parts[1] ?? null];
}

export function roundScore(st: MatchState, round: number, participantId?: string | null): number {
  if (!participantId) return 0;
  return st.scores
    .filter((s) => s.roundNumber === round && s.participantId === participantId)
    .reduce((sum, s) => sum + s.points, 0);
}

export function totalScore(st: MatchState, participantId?: string | null): number {
  if (!participantId) return 0;
  return st.scores.filter((s) => s.participantId === participantId).reduce((sum, s) => sum + s.points, 0);
}

export function manualPoints(st: MatchState, round: number, participantId: string): number {
  return st.manual.find((s) => s.roundNumber === round && s.participantId === participantId)?.points ?? 0;
}

export function stageLabel(stage: MatchStage, round: number, total: number): string {
  switch (stage) {
    case "scheduled":
      return "Запланирован";
    case "veto":
      return "Пики-баны";
    case "ready":
      return "Карты выбраны";
    case "round":
      return total > 1 ? `Раунд ${round} из ${total}` : "Раунд идёт";
    case "finished":
      return "Матч завершён";
  }
}

export function isShowMatch(t: Pick<Tournament, "format">): boolean {
  return t.format === "show";
}

/** «2 раунда», «3 раунда», «1 раунд». */
export function roundsLabel(n: number): string {
  return n === 1 ? "1 раунд" : `${n} раунда`;
}

/** Набор на раунд по правилам 3 сезона: в первом - бесплатный, дальше - свой. */
export function loadoutLabel(round: number): string {
  return round === 1 ? "бесплатный набор" : "свой набор";
}

/** Задание для показа: у задания на карту описание уже начинается с локации. */
export function taskTitle(t: RoundBonusTask): string {
  return t.name || t.text;
}

export function taskDescription(t: RoundBonusTask): string {
  return t.name ? t.text : "";
}

export function taskKindLabel(t: RoundBonusTask): string {
  if (t.category === "protocol") return "Протокол";
  return t.mapCode ? "На карту" : "Задание";
}
