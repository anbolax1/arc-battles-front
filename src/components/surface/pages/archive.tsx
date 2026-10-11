import "./archive.css";
import { getTournaments } from "@/lib/queries";
import { isShowMatch } from "@/lib/match";
import { ArchiveView, type ArchiveMatch } from "@/components/surface/archive-list";

/** Архив сыгранных матчей в новом дизайне: свежие сверху. */
export async function SurfaceArchive() {
  const finished = await getTournaments("finished");
  const matches: ArchiveMatch[] = finished
    .map((t) => ({
      id: t.id,
      title: t.title,
      mode: t.mode,
      show: isShowMatch(t),
      at: t.startsAt || t.createdAt,
      score: t.score ?? [],
      maps: t.roundMaps?.length ? t.roundMaps : t.maps,
      mult: t.ratingMultiplier,
    }))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return <ArchiveView matches={matches} />;
}
