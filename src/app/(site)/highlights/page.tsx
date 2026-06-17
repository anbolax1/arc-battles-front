import { getHighlights, getTournaments } from "@/lib/queries";
import { SectionHead } from "@/components/ui/section-head";
import { HighlightsGallery } from "@/components/domain/highlights-gallery";

export const metadata = {
  title: "Хайлайты — Битва за Респект",
  description: "Лучшие моменты турниров по Arc Raiders: клипы участников.",
};

const PAGE_SIZE = 12;

export default async function HighlightsPage() {
  const [{ items, total }, tournaments] = await Promise.all([
    getHighlights({ limit: PAGE_SIZE, offset: 0 }),
    getTournaments(),
  ]);

  return (
    <div className="mx-auto max-w-[1240px] space-y-8 px-6 py-12 sm:py-16">
      <SectionHead
        eyebrow="Лучшие моменты"
        title="Хайлайты"
      />
      <p className="-mt-4 max-w-2xl text-sm text-muted">
        Клипы участников турниров. Загружать может любой, кто вошёл через Twitch — после модерации
        организатором хайлайт появляется здесь.
      </p>
      <HighlightsGallery
        initialItems={items}
        initialTotal={total}
        pageSize={PAGE_SIZE}
        tournaments={tournaments.map((t) => ({ id: t.id, title: t.title }))}
      />
    </div>
  );
}
