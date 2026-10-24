import type { ReactNode } from "react";

/** Стрелка роста шанса после заметного скачка: место под неё занято всегда, поэтому соседи не сдвигаются. */
export function JumpArrow({ jump, className = "" }: { jump: number; className?: string }) {
  return (
    <span className={`ov-chance-jump text-[0.65rem] font-bold leading-none tnum text-ok ${jump > 0 ? "on" : ""} ${className}`} aria-hidden>
      ▲{Math.max(jump, 0)}
    </span>
  );
}

/** Подпись у числа шанса, которую на время скачка сменяет стрелка: одно место на двоих, ничего не налезает.
    end - прижать к правому краю, когда подпись стоит слева от числа. */
export function JumpSwap({
  jump,
  end,
  className = "",
  labelClassName,
  children,
}: {
  jump: number;
  end: boolean;
  className?: string;
  labelClassName: string;
  children: ReactNode;
}) {
  return (
    <span className={`grid grid-cols-[minmax(0,1fr)] ${end ? "justify-items-end" : "justify-items-start"} ${className}`}>
      <span
        className={`max-w-full transition-opacity duration-[250ms] [grid-area:1/1] motion-reduce:transition-none ${jump > 0 ? "opacity-0" : ""} ${labelClassName}`}
      >
        {children}
      </span>
      <JumpArrow jump={jump} className="self-center [grid-area:1/1]" />
    </span>
  );
}
