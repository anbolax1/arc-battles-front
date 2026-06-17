import { getTournaments } from "@/lib/queries";
import { ArchiveCard } from "@/components/domain/archive-card";
import { SectionHead } from "@/components/ui/section-head";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Архив — Битва за Респект",
  description: "Прошедшие турниры по Arc Raiders: результаты и записи эфиров.",
};

export default async function ArchivePage() {
  const finished = await getTournaments("finished");

  return (
    <div className="mx-auto max-w-[1240px] space-y-8 px-6 py-12 sm:py-16">
      <SectionHead eyebrow="История" title="Прошедшие турниры" />
      {finished.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {finished.map((t) => (
            <ArchiveCard key={t.id} t={t} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Архив пока пуст"
          hint="Здесь появятся завершённые турниры с результатами и VOD."
        />
      )}
    </div>
  );
}
