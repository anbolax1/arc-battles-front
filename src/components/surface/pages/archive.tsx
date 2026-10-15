import "./archive.css";
import { getBelt, getTournaments } from "@/lib/queries";
import { isShowMatch } from "@/lib/match";
import { ArchiveView, type ArchiveMatch } from "@/components/surface/archive-list";
import { beltMarkLabel, matchBelt } from "@/components/surface/belt-lib";

/** Архив сыгранных матчей в новом дизайне: свежие сверху. */
export async function SurfaceArchive() {
  const [finished, belt] = await Promise.all([getTournaments("finished"), getBelt()]);
  const matches: ArchiveMatch[] = finished
    .map((t) => {
      const mark = matchBelt(belt, t, []);
      return {
        id: t.id,
        title: t.title,
        mode: t.mode,
        show: isShowMatch(t),
        at: t.startsAt || t.createdAt,
        score: t.score ?? [],
        maps: t.roundMaps?.length ? t.roundMaps : t.maps,
        mult: t.ratingMultiplier,
        belt: mark ? beltMarkLabel(mark) : undefined,
      };
    })
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return <ArchiveView matches={matches} />;
}
