"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";
import type { MatchState } from "@/lib/types";

/** Картинка-превью шоу-матча: файл с компьютера или ссылка, по которой сервер скачает её сам. */
export type PreviewSource = { file: File } | { url: string };

/** Форматы и пределы - те же, что проверяет сервер; приз стоит крупно в анонсе, поэтому короткий. */
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_MB = 10;
export const MAX_PRIZE = 120;

export function putShowPreview(id: string, src: PreviewSource): Promise<MatchState> {
  if ("file" in src) {
    return apiFetch<MatchState>(`/tournaments/${id}/preview`, {
      method: "PUT",
      body: src.file,
      headers: { "Content-Type": src.file.type || "application/octet-stream" },
    });
  }
  return apiFetch<MatchState>(`/tournaments/${id}/preview`, { method: "PUT", body: JSON.stringify({ url: src.url }) });
}

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Выбранное превью и адрес для показа; адрес выбранного файла освобождается, когда он больше не нужен. */
export function useChosenPreview() {
  const [chosen, setChosen] = React.useState<{ src: PreviewSource; shown: string } | null>(null);
  const blob = React.useRef("");
  React.useEffect(
    () => () => {
      if (blob.current) URL.revokeObjectURL(blob.current);
    },
    [],
  );
  const choose = React.useCallback((src: PreviewSource | null) => {
    if (blob.current) URL.revokeObjectURL(blob.current);
    blob.current = src && "file" in src ? URL.createObjectURL(src.file) : "";
    setChosen(src ? { src, shown: blob.current || ("url" in src ? src.url : "") } : null);
  }, []);
  return [chosen, choose] as const;
}

/** Превью целиком, как в анонсе на главной: края рамки добирает размытая копия картинки. */
export function PreviewImage({ src, className = "" }: { src: string; className?: string }) {
  const [brokenSrc, setBrokenSrc] = React.useState("");
  return (
    <div className={`relative aspect-video overflow-hidden rounded-md bg-surface-2 shadow-[inset_0_0_0_1px_var(--border)] ${className}`}>
      {brokenSrc === src ? (
        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-danger">
          Картинка не открывается — проверьте ссылку
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- превью может быть по чужой ссылке, без next/image */}
          <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-xl" />
          {/* Подпись лежит под картинкой и видна, пока та грузится: Discord отдаёт картинку по несколько секунд. */}
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">Загружаем картинку…</div>
          {/* eslint-disable-next-line @next/next/no-img-element -- превью может быть по чужой ссылке, без next/image */}
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-contain" onError={() => setBrokenSrc(src)} />
        </>
      )}
    </div>
  );
}

/** Выбор картинки-превью: ссылкой или файлом с компьютера. */
export function PreviewPicker({ busy, onPick }: { busy?: boolean; onPick: (src: PreviewSource) => void }) {
  const [mode, setMode] = React.useState<"url" | "file">("url");
  const [url, setUrl] = React.useState("");
  const [err, setErr] = React.useState("");
  const fileId = React.useId();

  function pickFile(f?: File) {
    setErr("");
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setErr(`Файл больше ${MAX_MB} МБ.`);
      return;
    }
    onPick({ file: f });
  }

  return (
    <div className="space-y-2.5">
      <div className="seg">
        <button type="button" className="seg-btn" aria-pressed={mode === "url"} onClick={() => setMode("url")}>
          <span>По ссылке</span>
        </button>
        <button type="button" className="seg-btn" aria-pressed={mode === "file"} onClick={() => setMode("file")}>
          <span>Файл с компьютера</span>
        </button>
      </div>
      {mode === "url" ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (isHttpUrl(url)) onPick({ url: url.trim() });
          }}
        >
          <input
            className="input min-w-0 flex-1"
            placeholder="https://… ссылка на картинку"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" className="btn btn-ghost btn-sm" disabled={busy || !isHttpUrl(url)}>
            <span>{busy ? "Скачиваем…" : "Взять картинку"}</span>
          </button>
        </form>
      ) : (
        <label
          htmlFor={fileId}
          className={`flex cursor-pointer items-center justify-center rounded-md border border-dashed border-[var(--border-strong)] bg-surface-2 px-4 py-5 text-sm text-muted transition hover:text-fg ${busy ? "pointer-events-none opacity-50" : ""}`}
        >
          Выбрать картинку…
          <input
            id={fileId}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      )}
      <p className="text-xs text-muted">
        JPG, PNG, WebP или GIF до {MAX_MB} МБ. По ссылке сайт сам скачает картинку и будет хранить у себя — анонс не
        пропадёт, даже когда ссылка Discord перестанет открываться.
      </p>
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
