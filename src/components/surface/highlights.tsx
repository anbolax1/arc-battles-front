"use client";

import * as React from "react";
import Link from "next/link";
import { VideoPlayer } from "@/components/domain/video-player";
import { CloseIcon } from "@/components/icons";
import type { Highlight } from "@/lib/types";
import { Arrow, PlayGlyph, SecHead } from "@/components/surface/ui";

function duration(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
}

/** Плитка клипа: превью и подпись, по нажатию - плеер. */
export function ClipTile({ h, onOpen }: { h: Highlight; onOpen: (h: Highlight) => void }) {
  return (
    <button type="button" className="sf-hl" onClick={() => onOpen(h)} aria-label={`Смотреть клип «${h.title}»`}>
      <span className="sf-hl-bar" />
      {/* eslint-disable-next-line @next/next/no-img-element -- превью из хранилища медиа */}
      {h.thumbUrl && <img src={h.thumbUrl} alt="" loading="lazy" />}
      <span className="sf-hl-play">
        <PlayGlyph />
      </span>
      <span className="sf-hl-cap">
        <b>{h.title}</b>
        <small>
          {h.userName || h.userLogin}
          {h.duration ? ` · ${duration(h.duration)}` : ""}
        </small>
      </span>
    </button>
  );
}

/** Плеер клипа поверх страницы; закрывается кнопкой, кликом мимо и Esc. */
export function ClipLightbox({ clip, onClose }: { clip: Highlight | null; onClose: () => void }) {
  React.useEffect(() => {
    if (!clip) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [clip, onClose]);

  if (!clip) return null;
  return (
    <div className="sf-lightbox" role="dialog" aria-modal="true" aria-label={clip.title} onClick={onClose}>
      <div className="sf-lightbox-in" onClick={(e) => e.stopPropagation()}>
        <div className="sf-lightbox-head">
          <b>{clip.title}</b>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {clip.videoUrl && <VideoPlayer className="aspect-video w-full" src={clip.videoUrl} poster={clip.thumbUrl || undefined} autoPlay />}
      </div>
    </div>
  );
}

/** Клипы с эфиров: по нажатию - плеер поверх страницы. */
export function SurfaceHighlights({ items, title = "лучшие моменты", eyebrow = "Клипы с эфиров", paper = false }: { items: Highlight[]; title?: string; eyebrow?: string; paper?: boolean }) {
  const [active, setActive] = React.useState<Highlight | null>(null);
  const close = React.useCallback(() => setActive(null), []);

  if (!items.length) return null;

  return (
    <section className={`sf-sec ${paper ? "sf-paper" : "sf-night-2"}`} aria-labelledby="hl-t">
      <div className="sf-wrap">
        <SecHead
          id="hl-t"
          eyebrow={eyebrow}
          title={title}
          action={
            <Link className="sf-more" href="/highlights">
              Все хайлайты <Arrow />
            </Link>
          }
        />
        <div className="sf-hl-row">
          {items.slice(0, 4).map((h) => (
            <ClipTile key={h.id} h={h} onOpen={setActive} />
          ))}
        </div>
      </div>
      <ClipLightbox clip={active} onClose={close} />
    </section>
  );
}
