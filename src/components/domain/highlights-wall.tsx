"use client";

import * as React from "react";
import Link from "next/link";
import { apiHref } from "@/lib/api";
import { VideoPlayer } from "@/components/domain/video-player";
import { CloseIcon } from "@/components/icons";
import type { Highlight } from "@/lib/types";

/* «Лучшие моменты» на главной.
   - Десктоп (мышь, широкий экран): автоплей лёгкого превью-видео (~0.5 МБ, без звука, луп),
     играет только в зоне видимости (IntersectionObserver) — «гифка».
   - Мобайл/тач: статичный постер (картинка) с кнопкой play. Автоплей видео на мобиле НЕ делаем:
     на iOS он уводит видео в полноэкранный чёрный режим / ломает рендер. SSR отдаёт постер
     (серверный снапшот = не-десктоп), поэтому мобайл сразу видит картинку, без <video>.
   В обоих случаях клик открывает лайтбокс с полным клипом (звук, перемотка, фуллскрин). */

const MQ = "(min-width: 1024px) and (pointer: fine)";

function useDesktop(): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      let m: MediaQueryList;
      try {
        m = window.matchMedia(MQ);
      } catch {
        return () => {};
      }
      // addEventListener — современный API; addListener — фолбэк для старых Safari.
      if (m.addEventListener) {
        m.addEventListener("change", cb);
        return () => m.removeEventListener("change", cb);
      }
      m.addListener?.(cb);
      return () => m.removeListener?.(cb);
    },
    () => {
      try {
        return window.matchMedia(MQ).matches;
      } catch {
        return false;
      }
    },
    () => false,
  );
}

const PlayGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
    <path d="M8 5v14l11-7z" />
  </svg>
);

function Tile({ h, autoplay, onOpen }: { h: Highlight; autoplay: boolean; onOpen: (h: Highlight) => void }) {
  const ref = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (!autoplay) return;
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
  }, [autoplay]);

  const useVideo = autoplay && !!h.previewUrl;

  return (
    <button
      type="button"
      onClick={() => onOpen(h)}
      className="group panel relative block overflow-hidden text-left transition hover:-translate-y-1"
    >
      <div className="relative aspect-video bg-black">
        {useVideo ? (
          <video
            ref={ref}
            src={apiHref(h.previewUrl as string)}
            poster={h.thumbUrl ? apiHref(h.thumbUrl) : undefined}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <>
            {h.thumbUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={apiHref(h.thumbUrl)}
                alt={h.title}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/15 transition group-hover:bg-black/5">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full pl-0.5 text-[#1a0c02] ring-1 ring-white/30 transition group-hover:scale-110"
                style={{ background: "var(--grad-warm)", boxShadow: "0 8px 24px -6px rgba(255,106,26,0.7)" }}
              >
                <PlayGlyph />
              </span>
            </div>
          </>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
        <div className="truncate font-display text-sm uppercase">{h.title}</div>
        <div className="truncate text-xs text-white/70">{h.userName || h.userLogin}</div>
      </div>
    </button>
  );
}

export function HighlightsWall({ items }: { items: Highlight[] }) {
  const desktop = useDesktop();
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
          <Tile key={h.id} h={h} autoplay={desktop} onOpen={setActive} />
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
