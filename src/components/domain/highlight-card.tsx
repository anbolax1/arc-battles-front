"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { VideoPlayer } from "@/components/domain/video-player";
import { fmtDate } from "@/lib/format";
import { TwitchIcon } from "@/components/icons";
import type { Highlight } from "@/lib/types";

/* Карточка хайлайта. ВАЖНО: по умолчанию показываем только лёгкий постер-картинку с кнопкой
   play — сам <video> (полный клип, десятки МБ) появляется ТОЛЬКО после тапа. Иначе галерея
   из N карточек тянула бы N полных клипов сразу (iOS игнорит preload=none) → «вечная загрузка».
   videoUrl/thumbUrl — same-origin пути (/media/…), используем как есть. */

const PlayGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
    <path d="M8 5v14l11-7z" />
  </svg>
);

export function HighlightCard({ h }: { h: Highlight }) {
  const [open, setOpen] = React.useState(false);

  return (
    <article className="panel flex flex-col overflow-hidden">
      <div className="aspect-video bg-black">
        {!h.videoUrl ? (
          <div className="flex h-full items-center justify-center text-xs text-muted">видео недоступно</div>
        ) : open ? (
          <VideoPlayer className="h-full w-full" src={h.videoUrl} poster={h.thumbUrl || undefined} />
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative block h-full w-full"
            aria-label="Смотреть хайлайт"
          >
            {h.thumbUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={h.thumbUrl}
                alt={h.title}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/15 transition group-hover:bg-black/5">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full pl-0.5 text-[#1a0c02] ring-1 ring-white/30 transition group-hover:scale-110"
                style={{ background: "var(--grad-warm)", boxShadow: "0 8px 24px -6px rgba(255,106,26,0.7)" }}
              >
                <PlayGlyph />
              </span>
            </div>
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="font-display text-sm uppercase leading-snug">{h.title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Avatar name={h.userName || h.userLogin} src={h.userAvatarUrl} size="sm" />
          <span className="truncate">{h.userName || h.userLogin}</span>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted">
          {h.tournamentTitle && <span className="font-display uppercase text-primary-2">{h.tournamentTitle}</span>}
          <span>{fmtDate(h.createdAt)}</span>
          {h.sourceUrl && (
            <a
              href={h.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-accent transition hover:underline"
            >
              <TwitchIcon className="h-3.5 w-3.5" />
              оригинал
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
