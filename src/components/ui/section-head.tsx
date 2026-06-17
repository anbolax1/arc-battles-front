import * as React from "react";

export interface SectionHeadProps {
  eyebrow?: string;
  title: React.ReactNode;
  /** Действие справа (напр. ссылка «Все →»). */
  action?: React.ReactNode;
}

export function SectionHead({ eyebrow, title, action }: SectionHeadProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="text-2xl sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
