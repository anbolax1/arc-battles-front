/* Типизированные серверные (RSC) запросы к Go-бэкенду поверх serverFetch.
   Устойчивы к недоступному бэкенду: на сетевой ошибке/5xx возвращают безопасный
   дефолт (пустой список/null) и пишут warning — витрина рендерит пустое
   состояние вместо краша, и `next build` проходит без поднятого бэка.
   ТОЛЬКО для серверных компонентов. */

import { serverFetch, serverGetOptional } from "@/lib/server-api";
import { ApiError } from "@/lib/api";
import type {
  CatalogLegendary,
  LeaderboardResponse,
  LeaderboardRow,
  TeamLeaderboardResponse,
  TeamLeaderboardRow,
  LiveState,
  PlayerProfile,
  TeamProfile,
  Registration,
  RulesResponse,
  Season,
  StarterTask,
  Tournament,
  TournamentMode,
  TournamentStatus,
  User,
  UserOverview,
  Highlight,
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

/** Сезонный рейтинг 1×1 (по игрокам). season: пусто — активный сезон, "all" — за всё время, иначе id. */
export async function getLeaderboard(mode: TournamentMode, season?: string): Promise<LeaderboardRow[]> {
  const q = season ? `&season=${encodeURIComponent(season)}` : "";
  const res = await safe(
    `leaderboard(${mode})`,
    serverFetch<LeaderboardResponse>(`/leaderboard?mode=${mode}${q}`),
    { mode, rows: [] },
  );
  return res.rows ?? [];
}

/** Сезонный рейтинг 2×2 по КОМАНДАМ (пара игроков = команда). season как в getLeaderboard. */
export async function getTeamLeaderboard(season?: string): Promise<TeamLeaderboardRow[]> {
  const q = season ? `&season=${encodeURIComponent(season)}` : "";
  const res = await safe(
    "leaderboard(2x2/teams)",
    serverFetch<TeamLeaderboardResponse>(`/leaderboard?mode=2x2${q}`),
    { mode: "2x2" as TournamentMode, rows: [] },
  );
  return res.rows ?? [];
}

/** Список сезонов (новые сверху). */
export function getSeasons(): Promise<Season[]> {
  return safe("seasons", serverFetch<Season[]>(`/seasons`), []);
}

/** Каталог правил: контракты + протоколы + легендарные (ответ обёрнут в {tasks,complications,legendary}). */
export function getRules(): Promise<RulesResponse> {
  return safe("rules", serverFetch<RulesResponse>("/rules"), {
    tasks: [],
    complications: [],
    legendary: [],
  });
}

/** Легендарные контракты (глобальный пул со статусом и журналом). */
export function getLegendary(): Promise<CatalogLegendary[]> {
  return safe("legendary", serverFetch<CatalogLegendary[]>("/legendary"), []);
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

/** Публичная страница команды 2×2 по ключу (пара userId). null — 404/ошибка.
    Ключ нормализуем: сначала декодируем (Next может отдать параметр уже закодированным —
    `A%7CB`), затем кодируем ровно один раз, иначе `|` уедет в двойное кодирование → 404. */
export async function getTeam(teamKey: string): Promise<TeamProfile | null> {
  let raw = teamKey;
  try {
    raw = decodeURIComponent(teamKey);
  } catch {
    /* оставим как есть */
  }
  try {
    return await serverFetch<TeamProfile>(`/teams/${encodeURIComponent(raw)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    console.warn(`[queries] team(${teamKey}): ${e instanceof Error ? e.message : e}`);
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

/** Публичные (одобренные) хайлайты с пагинацией и фильтрами по турниру/игроку. */
export function getHighlights(
  params: { tournamentId?: string; userId?: string; limit?: number; offset?: number; random?: boolean } = {},
): Promise<{ items: Highlight[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.tournamentId) qs.set("tournamentId", params.tournamentId);
  if (params.userId) qs.set("userId", params.userId);
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  if (params.random) qs.set("random", "1");
  const suffix = qs.toString() ? `?${qs}` : "";
  return safe(
    "highlights",
    serverFetch<{ items: Highlight[]; total: number }>(`/highlights${suffix}`),
    { items: [], total: 0 },
  );
}

/** Страница пользователей с агрегатами участия (раздел «Пользователи»). Organizer-only. */
export function getUsersOverview(params: {
  limit?: number;
  offset?: number;
  q?: string;
  sort?: string;
} = {}): Promise<{ items: UserOverview[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  if (params.q) qs.set("q", params.q);
  if (params.sort) qs.set("sort", params.sort);
  const suffix = qs.toString() ? `?${qs}` : "";
  return safe(
    "users/overview",
    serverFetch<{ items: UserOverview[]; total: number }>(`/users/overview${suffix}`, { auth: true }),
    { items: [], total: 0 },
  );
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
