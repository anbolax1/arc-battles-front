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

/** Клипы с эфиров: по нажатию - плеер поверх страницы. */
export function SurfaceHighlights({ items, title = "лучшие моменты", eyebrow = "Клипы с эфиров", paper = false }: { items: Highlight[]; title?: string; eyebrow?: string; paper?: boolean }) {
  const [active, setActive] = React.useState<Highlight | null>(null);

  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

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
            <button key={h.id} type="button" className="sf-hl" onClick={() => setActive(h)} aria-label={`Смотреть клип «${h.title}»`}>
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
          ))}
        </div>
      </div>
      {active && (
        <div className="sf-lightbox" role="dialog" aria-modal="true" aria-label={active.title} onClick={() => setActive(null)}>
          <div className="sf-lightbox-in" onClick={(e) => e.stopPropagation()}>
            <div className="sf-lightbox-head">
              <b>{active.title}</b>
              <button type="button" onClick={() => setActive(null)} aria-label="Закрыть">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            {active.videoUrl && <VideoPlayer className="aspect-video w-full" src={active.videoUrl} poster={active.thumbUrl || undefined} autoPlay />}
          </div>
        </div>
      )}
    </section>
  );
}
