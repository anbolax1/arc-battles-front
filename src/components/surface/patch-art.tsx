"use client";

import * as React from "react";
import type { PatchCode } from "@/lib/types";
import { patchSvgInner } from "@/components/surface/patch-svg";
import "@/components/surface/patches.css";

/** Нашивка картинкой. Подпись нужна, только когда рядом нет названия текстом. */
export function PatchArt({
  code,
  tier = 1,
  ghost = false,
  night = false,
  className,
  label,
}: {
  code: PatchCode;
  tier?: number;
  ghost?: boolean;
  night?: boolean;
  className?: string;
  label?: string;
}) {
  // у узоров и масок каждой нашивки на странице свои id
  const id = "pt" + React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const html = React.useMemo(() => patchSvgInner(code, { id, tier, ghost, night }), [code, id, tier, ghost, night]);
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
