import * as React from "react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

type AvatarTone = "lead" | "cyan" | "bronze" | "muted";
type AvatarSize = "sm" | "md" | "lg";

const toneClass: Record<AvatarTone, string> = {
  lead: "",
  cyan: "avatar-cyan",
  bronze: "avatar-bronze",
  muted: "avatar-muted",
};
const sizeClass: Record<AvatarSize, string> = { sm: "avatar-sm", md: "", lg: "avatar-lg" };

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name?: string | null;
  src?: string | null;
  tone?: AvatarTone;
  size?: AvatarSize;
}

/** Скошенный аватар: фото (если src) или инициалы. */
export function Avatar({ name, src, tone = "lead", size = "md", className, ...props }: AvatarProps) {
  return (
    <span className={cn("avatar", toneClass[tone], sizeClass[size], className)} {...props}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- внешний Twitch CDN, без next/image
        <img src={src} alt="" loading="lazy" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </span>
  );
}

/** Тон аватара по позиции в списке (топ-3 в рейтинге). */
export function toneByIndex(i: number): AvatarTone {
  return i === 0 ? "lead" : i === 1 ? "cyan" : i === 2 ? "bronze" : "muted";
}
