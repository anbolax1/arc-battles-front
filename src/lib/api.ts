/* Тонкий типизированный клиент к Go-бэкенду. Same-origin: в dev /api
   проксируется (next.config), в prod — через nginx. credentials:'include'
   обязателен — сессия живёт в httpOnly-cookie rsp_session. */

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";

export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`API ${status}: ${body || "ошибка запроса"}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...((init.headers as Record<string, string>) ?? {}) };
  // Content-Type ставим ТОЛЬКО при наличии тела: иначе GET/DELETE остаются
  // «простыми» CORS-запросами и не провоцируют лишний preflight (важно в split).
  if (init.body != null && headers["Content-Type"] == null) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** URL к API для ССЫЛОК-НАВИГАЦИЙ (напр. вход через Twitch `<a href>`), а не fetch.
    В dev BASE="/api" → относительный путь работает через прокси next.config.
    В prod split (NEXT_PUBLIC_API_BASE=https://api.brouhub.ru/api) → абсолютный URL
    на API-origin, т.к. фронт-origin (brouhub.ru) сам по себе /api не обслуживает. */
export function apiHref(path: string): string {
  return `${BASE}${path}`;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body == null ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: body == null ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: body == null ? undefined : JSON.stringify(body) }),
  del: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
