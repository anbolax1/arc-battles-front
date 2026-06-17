import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const pillVariants = cva("pill", {
  variants: {
    status: {
      live: "pill-live",
      soon: "pill-soon",
      announce: "pill-announce",
      done: "pill-done",
      ok: "pill-ok",
      no: "pill-no",
      wait: "pill-wait",
    },
  },
  defaultVariants: { status: "announce" },
});

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {}

export function StatusPill({ status, className, children, ...props }: StatusPillProps) {
  return (
    <span className={cn(pillVariants({ status }), className)} {...props}>
      {status === "live" && <span className="live-dot" aria-hidden />}
      <span>{children}</span>
    </span>
  );
}

export { pillVariants };
