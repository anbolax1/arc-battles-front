import type { MmrPoint, MmrStats } from "@/lib/types";

/** Сводка по матчам одного сезона; сверка и сброс рейтинга - не матчи, незасчитанный матч - матч без исхода:
    в победы, поражения и серии не идёт. */
export function seasonStats(points: MmrPoint[], start: number): MmrStats {
  const st: MmrStats = {
    currentMmr: start,
    peakMmr: start,
    wins: 0,
    losses: 0,
    games: 0,
    winrate: 0,
    bestWinStreak: 0,
    bestLossStreak: 0,
    currentStreakKind: "",
    currentStreakLen: 0,
    place: 0,
  };
  let kind: "win" | "loss" | "" = "";
  let len = 0;
  for (const p of points) {
    st.peakMmr = Math.max(st.peakMmr, p.mmr);
    st.currentMmr = p.mmr;
    if (p.correction || p.reset) continue;
    st.firstMatch ??= p.date;
    const w = Math.max(p.games || 1, 1);
    st.games += w;
    if (p.voided) continue;
    if (p.win) st.wins += w;
    else st.losses += w;
    const k = p.win ? "win" : "loss";
    len = kind === k ? len + 1 : 1;
    kind = k;
    if (k === "win") st.bestWinStreak = Math.max(st.bestWinStreak, len);
    else st.bestLossStreak = Math.max(st.bestLossStreak, len);
  }
  const decided = st.wins + st.losses;
  st.winrate = decided ? Math.round((st.wins * 100) / decided) : 0;
  st.currentStreakKind = kind;
  st.currentStreakLen = len;
  return st;
}
