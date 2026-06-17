import { getLeaderboard } from "@/lib/queries";
import { RatingTabs } from "@/components/domain/rating-tabs";
import { SectionHead } from "@/components/ui/section-head";

export const metadata = {
  title: "Рейтинг — Битва за Респект",
  description: "Сезонная таблица лидеров 1×1 и 2×2 по Arc Raiders.",
};

export default async function RatingPage() {
  const [solo, duo] = await Promise.all([getLeaderboard("1x1"), getLeaderboard("2x2")]);

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 px-6 py-12 sm:py-16">
      <SectionHead eyebrow="Сезон" title="Таблица лидеров" />
      <p className="max-w-2xl text-sm text-muted">
        Очки начисляются по итогам завершённых турниров сезона. Пока турниры не
        сыграны, рейтинг может быть пустым.
      </p>
      <RatingTabs solo={solo} duo={duo} />
    </div>
  );
}
