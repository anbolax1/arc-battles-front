/* Трофеи рейдера: итоговые нашивки закрытых сезонов, собранные по видам. */

import type { PatchCode, PlayerProfile, Season } from "@/lib/types";
import { PATCH_INFO, PATCH_ORDER, patchResult, winsWord } from "@/components/surface/patch-meta";

export interface TrophyWin {
  seasonId: string;
  season: string;
  /** Номер сезона для знамени и адреса его итогов. */
  number: number | null;
  result: string;
  note?: string;
}

export interface Trophy {
  code: PatchCode;
  name: string;
  /** По порядку сезонов. */
  wins: TrophyWin[];
  /** «Король карты»: все карты, на которых был королём. */
  maps: string[];
}

/** В старых сезонах карты набраны капсом и без «ё». */
export function mapKey(name: string): string {
  return name.trim().toUpperCase().replaceAll("Ё", "Е");
}

export function collectTrophies(patches: PlayerProfile["patches1x1"], seasons: Season[], mapName: (s: string) => string): Trophy[] {
  const ordered = [...seasons].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return PATCH_ORDER.filter((code) => PATCH_INFO[code].seasonEnd).flatMap((code) => {
    const wins: TrophyWin[] = [];
    const maps = new Set<string>();
    for (const s of ordered) {
      const p = patches?.[s.id]?.items.find((i) => i.code === code && !i.provisional);
      if (!p) continue;
      const win: TrophyWin = { seasonId: s.id, season: s.name, number: s.number ?? null, result: patchResult(p, mapName) };
      if (code === "king") {
        const own = (p.detail.maps ?? []).map(mapName);
        own.forEach((m) => maps.add(m));
        // у нескольких карт число побед разное, а приходит только наибольшее
        const n = p.detail.wins ?? 0;
        if (own.length === 1 && n) win.note = `${n} ${winsWord(n)}`;
      }
      wins.push(win);
    }
    return wins.length ? [{ code, name: PATCH_INFO[code].name, wins, maps: [...maps] }] : [];
  });
}
