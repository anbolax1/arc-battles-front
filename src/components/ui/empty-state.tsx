import * as React from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  title: string;
  hint?: React.ReactNode;
  className?: string;
}

/** Единый плейсхолдер для пустых списков / отсутствующих данных. */
export function EmptyState({ title, hint, className }: EmptyStateProps) {
  return (
    <div className={cn("panel px-6 py-12 text-center", className)}>
      <p className="font-display text-lg uppercase text-muted">{title}</p>
      {hint && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{hint}</p>}
    </div>
  );
}
