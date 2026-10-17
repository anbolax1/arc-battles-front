import type { MmrPoint, Season } from "@/lib/types";

/** Сезон, который профиль открывает первым: текущий, если в нём есть матчи, иначе последний сыгранный.
    По нему же шапка считает нашивки, чтобы цифра сверху совпадала с блоком нашивок ниже. */
export function firstProfileSeason(timeline: MmrPoint[], seasons: Season[]): Season | undefined {
  const played = new Set(timeline.map((p) => p.season ?? ""));
  const active = seasons.find((s) => s.status === "active");
  if (active && played.has(active.id)) return active;
  return seasons.filter((s) => played.has(s.id)).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}
