import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva("badge", {
  variants: {
    kind: {
      champ: "badge-champ",
      glad: "badge-glad",
      org: "badge-org",
      boosty: "badge-boosty",
      official: "badge-official",
    },
  },
  defaultVariants: { kind: "official" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ kind, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ kind }), className)} {...props}>
      <span>{children}</span>
    </span>
  );
}

export { badgeVariants };
