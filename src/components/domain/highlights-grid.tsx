import { HighlightCard } from "./highlight-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Highlight } from "@/lib/types";

/** Сетка карточек хайлайтов. Переиспользуется в галерее, на странице турнира и в профиле. */
export function HighlightsGrid({ items, empty }: { items: Highlight[]; empty?: string }) {
  if (!items.length) {
    return <EmptyState title={empty ?? "Хайлайтов пока нет"} hint="Загляни позже или добавь свой." />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((h) => (
        <HighlightCard key={h.id} h={h} />
      ))}
    </div>
  );
}
