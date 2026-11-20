import { apiFetch } from "@/lib/api";

/* Кто давно не играл: один общий список на все ники и профили страницы.
   Живёт в памяти вкладки и в sessionStorage, чтобы не спрашивать бэк на каждой странице. */

type IdleRow = { login: string; displayName?: string; days: number };

const CACHE_KEY = "goarc-idle-v2";
const CACHE_MS = 10 * 60 * 1000;

let pending: Promise<Map<string, number>> | null = null;

/** Ключи - ник и отображаемое имя (на сайте игрок бывает под любым из них); ник главнее. */
function toMap(rows: IdleRow[]): Map<string, number> {
  const map = new Map(rows.map((r) => [r.login.toLowerCase(), r.days]));
  for (const r of rows) {
    const name = r.displayName?.trim().toLowerCase();
    if (name && !map.has(name)) map.set(name, r.days);
  }
  return map;
}

function readCache(): IdleRow[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, rows } = JSON.parse(raw) as { at: number; rows: IdleRow[] };
    return Date.now() - at < CACHE_MS ? rows : null;
  } catch {
    return null;
  }
}

/** Ник или имя (в нижнем регистре) -> дней без матчей. Недоступный бэк - пустой список: снега просто нет. */
export function loadIdle(): Promise<Map<string, number>> {
  if (pending) return pending;
  const cached = readCache();
  pending = cached
    ? Promise.resolve(toMap(cached))
    : apiFetch<IdleRow[]>("/players/idle")
        .then((rows) => {
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows }));
          } catch {
            /* без хранилища спросим снова на другой странице */
          }
          return toMap(rows);
        })
        .catch(() => {
          pending = null;
          return new Map<string, number>();
        });
  return pending;
}
