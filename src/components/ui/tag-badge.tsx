import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { UserTag } from "@/lib/types";

/** Тег игрока в виде скошенного бейджа в цвете тега. */
export function TagBadge({
  tag,
  className,
  title,
}: {
  tag: Pick<UserTag, "name" | "color">;
  className?: string;
  title?: string;
}) {
  const style: CSSProperties = {
    color: tag.color,
    background: `color-mix(in srgb, ${tag.color} 14%, transparent)`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tag.color} 40%, transparent)`,
  };
  return (
    <span className={cn("badge", className)} style={style} title={title}>
      <span>{tag.name}</span>
    </span>
  );
}

/** Теги игрока на сайте: роль и остальные, если организатор их не скрыл. */
export function PublicTags({ tags }: { tags?: UserTag[] }) {
  return (
    <>
      {(tags ?? [])
        .filter((t) => t.visible && !t.hiddenByUser)
        .map((t) => (
          <TagBadge key={t.id} tag={t} />
        ))}
    </>
  );
}
