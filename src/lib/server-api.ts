/* Серверный (RSC) fetch к Go-бэкенду. В отличие от клиентского lib/api.ts,
   ходит НАПРЯМУЮ на INTERNAL_API_URL (не через браузерный /api-прокси): на
   сервере Next нет относительного origin, а dev-rewrite/nginx применяются
   только к запросам браузера. Для авторизованных серверных запросов
   пробрасываем cookie сессии rsp_session через next/headers.

   Использовать ТОЛЬКО в серверных компонентах. */

import { cookies } from "next/headers";
import { ApiError } from "@/lib/api";

const INTERNAL = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8080";
const SESSION_COOKIE = "rsp_session";

export interface ServerFetchOptions {
  /** ISR: секунды до ревалидации. false (по умолчанию) — динамический no-store. */
  revalidate?: number | false;
  /** Теги для точечной ревалидации (revalidateTag). */
  tags?: string[];
  /** Пробросить cookie сессии — для эндпоинтов под входом (/auth/me, /me/*). */
  auth?: boolean;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
}

/** Низкоуровневый серверный запрос. path — без префикса /api («/tournaments»). */
export async function serverFetch<T>(path: string, opts: ServerFetchOptions = {}): Promise<T> {
  const { revalidate = false, tags, auth = false, method = "GET", body } = opts;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) headers["Cookie"] = `${SESSION_COOKIE}=${token}`;
  }

  const init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  };
  // Кэш-политика: либо динамический no-store, либо ISR-ревалидация.
  if (revalidate === false) init.cache = "no-store";
  else init.next = { revalidate, ...(tags ? { tags } : {}) };

  const res = await fetch(`${INTERNAL}/api${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Серверный GET, который на 401/403 (нет сессии/прав) возвращает null вместо
    исключения — удобно для опциональных авторизованных данных (текущий юзер). */
export async function serverGetOptional<T>(
  path: string,
  opts: ServerFetchOptions = {},
): Promise<T | null> {
  try {
    return await serverFetch<T>(path, opts);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
}
