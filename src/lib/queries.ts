/* Типизированные серверные (RSC) запросы к Go-бэкенду поверх serverFetch.
   Устойчивы к недоступному бэкенду: на сетевой ошибке/5xx возвращают безопасный
   дефолт (пустой список/null) и пишут warning — витрина рендерит пустое
   состояние вместо краша, и `next build` проходит без поднятого бэка.
   ТОЛЬКО для серверных компонентов. */

import { serverFetch, serverGetOptional } from "@/lib/server-api";
import { ApiError } from "@/lib/api";
import type {
  LeaderboardResponse,
  LeaderboardRow,
  LiveState,
  PlayerProfile,
  Registration,
  RulesResponse,
  StarterTask,
  Tournament,
  TournamentMode,
  TournamentStatus,
  User,
} from "@/lib/types";

async function safe<T>(label: string, p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[queries] ${label}: бэкенд недоступен или ошибка — ${msg}`);
    return fallback;
  }
}

/** Список турниров (без participants/rounds). Опциональный фильтр по статусу. */
export function getTournaments(status?: TournamentStatus): Promise<Tournament[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return safe("tournaments", serverFetch<Tournament[]>(`/tournaments${q}`), []);
}

/** Один турнир с participants[] и rounds[]. null — если 404 или бэк недоступен. */
export async function getTournament(id: string): Promise<Tournament | null> {
  try {
    return await serverFetch<Tournament>(`/tournaments/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    console.warn(`[queries] tournament(${id}): ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

/** Сезонный рейтинг 1×1/2×2. Ответ обёрнут в {mode,rows} — разворачиваем в rows[]. */
export async function getLeaderboard(mode: TournamentMode): Promise<LeaderboardRow[]> {
  const res = await safe(
    `leaderboard(${mode})`,
    serverFetch<LeaderboardResponse>(`/leaderboard?mode=${mode}`),
    { mode, rows: [] },
  );
  return res.rows ?? [];
}

/** Каталог правил: задания + усложнения (ответ обёрнут в {tasks,complications}). */
export function getRules(): Promise<RulesResponse> {
  return safe("rules", serverFetch<RulesResponse>("/rules"), {
    tasks: [],
    complications: [],
  });
}

/** Текущее состояние оверлея. null — если стейт не задан ({}) или бэк недоступен. */
export async function getOverlayState(): Promise<LiveState | null> {
  const s = await safe<Partial<LiveState> | null>(
    "overlay/state",
    serverFetch<Partial<LiveState>>("/overlay/state"),
    null,
  );
  return s && s.tournamentName ? (s as LiveState) : null;
}

/** Публичный профиль игрока по логину. null — 404/ошибка. */
export async function getPlayer(login: string): Promise<PlayerProfile | null> {
  try {
    return await serverFetch<PlayerProfile>(`/players/${encodeURIComponent(login)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    console.warn(`[queries] player(${login}): ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

/** Текущий пользователь по сессии-cookie. null — аноним/бэк недоступен. */
export function getMe(): Promise<User | null> {
  return safe("auth/me", serverGetOptional<User>("/auth/me", { auth: true }), null);
}

/** Список пользователей для кабинета (выбор участников). Organizer-only. */
export function getUsers(): Promise<User[]> {
  return safe("users", serverFetch<User[]>("/users", { auth: true }), []);
}

/** Пул стартовых заданий (скрыт от публики). Organizer-only. */
export function getStarterTasks(): Promise<StarterTask[]> {
  return safe("starter-tasks", serverFetch<StarterTask[]>("/starter-tasks", { auth: true }), []);
}

/** Мои заявки (требует входа). [] — аноним/ошибка. */
export function getMyRegistrations(): Promise<Registration[]> {
  return safe(
    "me/registrations",
    serverFetch<Registration[]>("/me/registrations", { auth: true }),
    [],
  );
}
