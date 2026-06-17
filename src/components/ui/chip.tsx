import * as React from "react";
import { cn } from "@/lib/cn";

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Циановая точка вместо оранжевой. */
  cyan?: boolean;
  /** Показать ведущую точку. */
  dot?: boolean;
}

export function Chip({ cyan, dot, className, children, ...props }: ChipProps) {
  return (
    <span className={cn("chip", cyan && "chip-cyan", className)} {...props}>
      {dot && <span className="dot" aria-hidden />}
      {children}
    </span>
  );
}
