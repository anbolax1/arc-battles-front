import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva("btn", {
  variants: {
    variant: {
      primary: "btn-primary",
      ghost: "btn-ghost",
      cyan: "btn-cyan",
      danger: "btn-danger",
      twitch: "btn-twitch",
    },
    size: { md: "", sm: "btn-sm" },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Иконка слева (svg) — рендерится прямым потомком, чтобы CSS контр-скосил её. */
  icon?: React.ReactNode;
}

export function Button({ className, variant, size, icon, children, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

export { buttonVariants };
