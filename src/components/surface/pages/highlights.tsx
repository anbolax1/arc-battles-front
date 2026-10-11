import "./highlights.css";
import { getHighlights, getTournaments } from "@/lib/queries";
import { SurfaceHighlightsGallery } from "@/components/surface/highlights-gallery";

const PAGE_SIZE = 12;

/** Хайлайты в новом дизайне: первая порция клипов приходит с сервера, остальные - по кнопке. */
export async function SurfaceHighlightsPage() {
  const [{ items, total }, tournaments] = await Promise.all([getHighlights({ limit: PAGE_SIZE, offset: 0 }), getTournaments()]);
  return (
    <SurfaceHighlightsGallery
      initialItems={items}
      initialTotal={total}
      pageSize={PAGE_SIZE}
      tournaments={tournaments.map((t) => ({ id: t.id, title: t.title }))}
    />
  );
}
