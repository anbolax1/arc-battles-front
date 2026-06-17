import * as React from "react";
import { cn } from "@/lib/cn";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Градиентная кромка слева (glow-edge). */
  glow?: boolean;
}

export function Panel({ glow, className, children, ...props }: PanelProps) {
  return (
    <div className={cn("panel", glow && "glow-edge", className)} {...props}>
      {children}
    </div>
  );
}
