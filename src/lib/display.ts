/* Маппинг доменных значений бэкенда в UI-представление (статус-пиллы,
   отображаемое имя турнира). Держим отдельно от format.ts (тот без зависимостей
   от типов). */

import type { Registration, Role, Tournament } from "@/lib/types";
import { matchName } from "@/lib/format";

/** Статусы, которые понимает компонент StatusPill. */
export type PillStatus = "live" | "soon" | "announce" | "done" | "ok" | "no" | "wait";

/** Имя турнира для показа: «Ник vs Ник» из участников (приходят только на деталке
    GET /tournaments/{id}), иначе организаторский title, иначе бренд. На списочном
    эндпоинте /tournaments участников НЕТ → используется title. */
export function tournamentName(t: Pick<Tournament, "title" | "participants">): string {
  if (t.participants && t.participants.length >= 2) return matchName(t.participants);
  return t.title?.trim() || "Битва за Респект";
}

/** Статус турнира бэкенда (draft|upcoming|live|finished) → пилл + русская подпись. */
export function tournamentPill(status: string): { status: PillStatus; label: string } {
  switch (status) {
    case "live":
      return { status: "live", label: "В эфире" };
    case "upcoming":
      return { status: "soon", label: "Скоро" };
    case "finished":
      return { status: "done", label: "Завершён" };
    case "draft":
      return { status: "announce", label: "Анонс" };
    default:
      return { status: "announce", label: status || "—" };
  }
}

/** Статус заявки (pending|accepted|declined) → пилл + подпись. */
export function registrationPill(
  status: Registration["status"] | string,
): { status: PillStatus; label: string } {
  switch (status) {
    case "accepted":
      return { status: "ok", label: "Принята" };
    case "declined":
      return { status: "no", label: "Отклонена" };
    case "pending":
    default:
      return { status: "wait", label: "На рассмотрении" };
  }
}

/** Подходит ли заявка под поисковый запрос (по нику, логину, Embark ID, заметке). */
export function registrationMatches(r: Registration, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [r.userDisplayName, r.userLogin, r.embarkId, r.note]
    .some((f) => (f ?? "").toLowerCase().includes(q));
}

/** Завершён ли турнир (для архива/прошедших). */
export function isFinished(t: Pick<Tournament, "status">): boolean {
  return t.status === "finished";
}

/** Роль пользователя → бейдж (вид + подпись). */
export function roleBadge(
  role: Role | string,
): { kind: "champ" | "glad" | "org" | "boosty" | "official"; label: string } {
  switch (role) {
    case "organizer":
      return { kind: "org", label: "Организатор" };
    case "participant":
      return { kind: "glad", label: "Участник" };
    default:
      return { kind: "official", label: "Зритель" };
  }
}
