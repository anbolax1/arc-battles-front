"use client";

import * as React from "react";
import Link from "next/link";
import { apiHref } from "@/lib/api";
import { VideoPlayer } from "@/components/domain/video-player";
import { CloseIcon } from "@/components/icons";
import type { Highlight } from "@/lib/types";

/* «Стена моментов» на главной: случайные хайлайты автоплеем без звука и зациклены
   (как гифки), играют только когда блок в зоне видимости (IntersectionObserver) —
   чтобы не грузить трафик. Клик по плитке открывает лайтбокс с полным плеером (звук,
   перемотка, фуллскрин). */

function AutoTile({ h, onOpen }: { h: Highlight; onOpen: (h: Highlight) => void }) {
  const ref = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.4 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <button
      type="button"
      onClick={() => onOpen(h)}
      className="group panel relative block overflow-hidden text-left transition hover:-translate-y-1"
    >
      <div className="aspect-video bg-black">
        {h.videoUrl && (
          <video
            ref={ref}
            src={apiHref(h.videoUrl)}
            poster={h.thumbUrl ? apiHref(h.thumbUrl) : undefined}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
        <div className="truncate font-display text-sm uppercase">{h.title}</div>
        <div className="truncate text-xs text-white/70">{h.userName || h.userLogin}</div>
      </div>
      <span className="absolute right-2 top-2 rounded bg-black/55 px-2 py-1 text-[0.6rem] uppercase tracking-wide text-white/80">
        без звука · клик
      </span>
    </button>
  );
}

export function HighlightsWall({ items }: { items: Highlight[] }) {
  const [active, setActive] = React.useState<Highlight | null>(null);

  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Хайлайты</p>
          <h2 className="mt-1 text-2xl sm:text-3xl">Лучшие моменты</h2>
        </div>
        <Link href="/highlights" className="btn btn-ghost btn-sm">
          <span>Все хайлайты</span>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((h) => (
          <AutoTile key={h.id} h={h} onOpen={setActive} />
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
          role="presentation"
        >
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-display uppercase">{active.title}</div>
                <div className="truncate text-xs text-muted">{active.userName || active.userLogin}</div>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="Закрыть"
                className="flex-none text-muted transition hover:text-fg"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>
            {active.videoUrl && (
              <VideoPlayer
                className="aspect-video w-full"
                src={apiHref(active.videoUrl)}
                poster={active.thumbUrl ? apiHref(active.thumbUrl) : undefined}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
