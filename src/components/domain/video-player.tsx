"use client";

import * as React from "react";

/* Кастомный плеер в стиле сайта: тёмный, тёплый градиент, скошенная кнопка play,
   своя полоса прогресса (клик + перетаскивание), таймкод, mute и фуллскрин.
   Управление показывается при наведении и на паузе. */

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const PlayGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M8 5v14l11-7z" />
  </svg>
);
const PauseGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
  </svg>
);
const VolGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M4 9v6h4l5 5V4L8 9H4zm12.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4z" />
  </svg>
);
const MuteGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M4 9v6h4l5 5V4L8 9H4zm15 3l2-2-1.4-1.4L17 9.6 15.4 8 14 9.4l1.6 1.6L14 12.6 15.4 14 17 12.4 18.6 14 20 12.6 18.4 11z" />
  </svg>
);
const FsGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
  </svg>
);

export function VideoPlayer({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const volTrackRef = React.useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [volume, setVolume] = React.useState(1);
  const [cur, setCur] = React.useState(0);
  const [dur, setDur] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [volDragging, setVolDragging] = React.useState(false);
  const [isFs, setIsFs] = React.useState(false);

  const clickTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    const onFs = () => setIsFs(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      if (clickTimer.current) clearTimeout(clickTimer.current);
    };
  }, []);

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }

  function seekToClientX(clientX: number) {
    const el = trackRef.current;
    const v = videoRef.current;
    if (!el || !v || !dur) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    v.currentTime = ratio * dur;
    setCur(v.currentTime);
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function setVolumeFromClientX(clientX: number) {
    const el = volTrackRef.current;
    const v = videoRef.current;
    if (!el || !v) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    v.volume = ratio;
    v.muted = ratio === 0;
    setVolume(ratio);
    setMuted(v.muted);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void containerRef.current?.requestFullscreen?.();
  }

  // Клик по видео = play/pause, двойной клик = фуллскрин.
  // play() вызываем СИНХРОННО в обработчике жеста — иначе iOS блокирует воспроизведение.
  // pause() можно отложить, чтобы двойной тап (фуллскрин) успел его отменить.
  function onVideoClick() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
      void v.play();
    } else {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = window.setTimeout(() => {
        v.pause();
        clickTimer.current = null;
      }, 220);
    }
  }
  function onVideoDoubleClick() {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    toggleFullscreen();
  }

  const progress = dur ? (cur / dur) * 100 : 0;
  const iconCls = isFs ? "h-8 w-8" : "h-5 w-5";

  return (
    <div
      ref={containerRef}
      className={`group relative flex items-center justify-center overflow-hidden bg-black ${className ?? ""}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        className="h-full w-full object-contain"
        onClick={onVideoClick}
        onDoubleClick={onVideoDoubleClick}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
        onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
      />

      {/* Центр: скошенная кнопка play (на паузе) */}
      {!playing && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Воспроизвести"
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/10"
        >
          <span
            className={`flex items-center justify-center rounded-full pl-1 text-[#1a0c02] ring-1 ring-white/30 transition group-hover:scale-105 ${
              isFs ? "h-28 w-28" : "h-16 w-16"
            }`}
            style={{ background: "var(--grad-warm)", boxShadow: "0 10px 34px -8px rgba(255,106,26,0.75)" }}
          >
            <PlayGlyph className={isFs ? "h-14 w-14" : "h-8 w-8"} />
          </span>
        </button>
      )}

      {/* Нижняя панель управления */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col bg-gradient-to-t from-black/85 to-transparent transition-opacity ${
          isFs ? "gap-3 px-6 pb-5 pt-14" : "gap-1.5 px-3 pb-2.5 pt-8"
        } ${playing ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100" : "opacity-100"}`}
      >
        {/* Прогресс */}
        <div
          ref={trackRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            setDragging(true);
            seekToClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (dragging) seekToClientX(e.clientX);
          }}
          onPointerUp={() => setDragging(false)}
          className={`group/track relative w-full cursor-pointer rounded-full bg-white/20 ${isFs ? "h-2.5" : "h-1.5"}`}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${progress}%`, background: "var(--grad-warm)" }}
          />
          <div
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-2 opacity-0 shadow transition group-hover/track:opacity-100 ${
              isFs ? "h-5 w-5" : "h-3 w-3"
            }`}
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Кнопки */}
        <div className={`flex items-center ${isFs ? "gap-6" : "gap-3"}`}>
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Пауза" : "Воспроизвести"}
            className="text-primary-2 transition hover:text-primary"
          >
            {playing ? <PauseGlyph className={iconCls} /> : <PlayGlyph className={iconCls} />}
          </button>
          <span className={`text-white/80 tnum ${isFs ? "text-base" : "text-xs"}`}>
            {fmt(cur)} / {fmt(dur)}
          </span>
          <div className="group/vol ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Включить звук" : "Выключить звук"}
              className="text-white/80 transition hover:text-fg"
            >
              {muted || volume === 0 ? <MuteGlyph className={iconCls} /> : <VolGlyph className={iconCls} />}
            </button>
            <div
              ref={volTrackRef}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                setVolDragging(true);
                setVolumeFromClientX(e.clientX);
              }}
              onPointerMove={(e) => {
                if (volDragging) setVolumeFromClientX(e.clientX);
              }}
              onPointerUp={() => setVolDragging(false)}
              className={`relative w-0 cursor-pointer overflow-hidden rounded-full bg-white/20 opacity-0 transition-all group-hover/vol:opacity-100 group-focus-within/vol:opacity-100 ${
                isFs ? "h-2.5 group-hover/vol:w-28 group-focus-within/vol:w-28" : "h-1.5 group-hover/vol:w-20 group-focus-within/vol:w-20"
              }`}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${(muted ? 0 : volume) * 100}%`, background: "var(--grad-warm)" }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFs ? "Свернуть" : "На весь экран"}
            className="text-white/80 transition hover:text-fg"
          >
            <FsGlyph className={iconCls} />
          </button>
        </div>
      </div>
    </div>
  );
}
