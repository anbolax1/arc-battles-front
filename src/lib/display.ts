/* Маппинг доменных значений бэкенда в UI-представление (статус-пиллы,
   отображаемое имя турнира). Держим отдельно от format.ts (тот без зависимостей
   от типов). */

import type { MatchTeam, Registration, Role, Tournament } from "@/lib/types";
import { matchName } from "@/lib/format";

/** Шаги записи на матч - одинаковые в обоих дизайнах. */
export const JOIN_STEPS = [
  { n: 1, title: "Аккаунт", text: "Войди по логину и паролю — так заявка свяжется с твоим профилем." },
  { n: 2, title: "Embark ID в профиле", text: "Ник вида «ник#0000» задаётся один раз в профиле — он нужен для лобби в ARC Raiders и подставляется в заявку." },
  { n: 3, title: "Удобные даты", text: "Напиши, в какие даты можешь играть. Организатор позовёт тебя на матч." },
];

/** Пояснение на /register вместо формы - одинаковое в обоих дизайнах. */
export const REGISTER_CLOSED_TEXT =
  "Аккаунты на сайте заводит организатор, а вход игроку выдаёт персональной ссылкой. Если ты уже играл в лиге, аккаунт с твоей историей матчей уже есть: попроси ссылку у организатора.";

/** Статусы, которые понимает компонент StatusPill. */
export type PillStatus = "live" | "soon" | "announce" | "done" | "ok" | "no" | "wait";

/** Имя турнира для показа: «Ник vs Ник» из участников (приходят только на деталке
    GET /tournaments/{id}), иначе организаторский title, иначе бренд. На списочном
    эндпоинте /tournaments участников НЕТ → используется title. */
export function tournamentName(t: Pick<Tournament, "title" | "participants">): string {
  if (t.participants && t.participants.length >= 2) return matchName(t.participants);
  return t.title?.trim() || "Лига";
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

/** Роль подписчика, пока организатор её не переименовал. */
export const DEFAULT_SUBSCRIBER_ROLE = "Подписчик";

/** Роль пользователя → бейдж (вид + подпись). Название роли подписчика меняет организатор. */
export function roleBadge(
  role: Role | string,
  subscriberName = DEFAULT_SUBSCRIBER_ROLE,
): { kind: "champ" | "glad" | "org" | "boosty" | "official"; label: string } {
  switch (role) {
    case "superadmin":
      return { kind: "org", label: "Организатор" };
    case "moderator":
      return { kind: "glad", label: "Модератор" };
    case "subscriber":
      return { kind: "boosty", label: subscriberName };
    default:
      return { kind: "official", label: "Игрок" };
  }
}

/** Игроки команды 2×2 через точку: «Ник1 · Ник2». */
export function teamMembersLine(t: MatchTeam): string {
  return t.members.map((m) => m.displayName || m.login).join(" · ");
}

/** Рейтинг команды в текущем сезоне - как у игрока в форме матча. */
export function teamSeasonLine(t: MatchTeam): string {
  return `MMR ${t.mmr} · ${t.isNew ? "новая в сезоне" : `${t.wins}–${t.losses} в сезоне`}`;
}
