import { getLeaderboard, getTeamLeaderboard, getSeasons } from "@/lib/queries";
import { RatingTabs } from "@/components/domain/rating-tabs";
import { SectionHead } from "@/components/ui/section-head";

export const metadata = {
  title: "Рейтинг — Битва за Респект",
  description: "Сезонная таблица лидеров 1×1 и 2×2 по Arc Raiders.",
};

export default async function RatingPage() {
  // По умолчанию (без season) — активный сезон.
  const [seasons, solo, duo] = await Promise.all([getSeasons(), getLeaderboard("1x1"), getTeamLeaderboard()]);

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 px-6 py-12 sm:py-16">
      <SectionHead eyebrow="Сезон" title="Таблица лидеров" />
      <p className="max-w-2xl text-sm text-muted">
        Главный показатель — MMR: в начале каждого сезона у всех 1000, за победы он растёт, за
        поражения падает. Переключай сезон справа — у каждого сезона своя таблица.
      </p>
      <RatingTabs seasons={seasons} initialSolo={solo} initialDuo={duo} />
    </div>
  );
}
