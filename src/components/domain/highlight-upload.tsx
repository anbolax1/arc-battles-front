"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { Panel } from "@/components/ui/card";

const fieldCls =
  "w-full bg-surface-2 px-3.5 py-2.5 text-sm text-fg shadow-[inset_0_0_0_1px_var(--border)] outline-none transition focus:shadow-[inset_0_0_0_1px_var(--primary)]";

/* Форма добавления хайлайта (только для авторизованных). Два режима: ссылка на твич-клип
   (скачивается к нам в фоне) или загрузка своего видео-файла. После отправки — на модерацию. */
export function HighlightUpload({
  tournaments = [],
  defaultTournamentId = "",
  onDone,
}: {
  tournaments?: { id: string; title: string }[];
  defaultTournamentId?: string;
  onDone?: () => void;
}) {
  const [mode, setMode] = React.useState<"link" | "file">("link");
  const [url, setUrl] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [title, setTitle] = React.useState("");
  const [tournamentId, setTournamentId] = React.useState(defaultTournamentId);
  const [status, setStatus] = React.useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      if (mode === "link") {
        if (!url.trim()) throw new Error("Вставь ссылку на твич-клип.");
        await api.post("/highlights", {
          twitchClipUrl: url.trim(),
          title: title.trim(),
          tournamentId,
        });
      } else {
        if (!file) throw new Error("Выбери видео-файл.");
        const fd = new FormData();
        fd.append("file", file);
        if (title.trim()) fd.append("title", title.trim());
        if (tournamentId) fd.append("tournamentId", tournamentId);
        // Загрузка файла идёт через свой Next route-handler (стримит тело на бэкенд),
        // а не через apiHref — dev-rewrite Next зависает на потоковом multipart.
        const res = await fetch("/api/highlights/upload", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Не удалось загрузить файл.");
      }
      setStatus("ok");
      setUrl("");
      setFile(null);
      setTitle("");
      onDone?.();
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof ApiError
          ? err.body || err.message
          : err instanceof Error
            ? err.message
            : "Не удалось отправить.",
      );
    }
  }

  return (
    <Panel className="space-y-4 p-5">
      <div className="seg">
        <button type="button" className="seg-btn" aria-pressed={mode === "link"} onClick={() => setMode("link")}>
          <span>Ссылка на клип</span>
        </button>
        <button type="button" className="seg-btn" aria-pressed={mode === "file"} onClick={() => setMode("file")}>
          <span>Загрузить файл</span>
        </button>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        {mode === "link" ? (
          <div key="link" className="space-y-1.5">
            <label htmlFor="hl-url" className="text-xs uppercase tracking-wide text-muted">
              Ссылка на твич-клип
            </label>
            <input
              id="hl-url"
              className={fieldCls}
              placeholder="https://clips.twitch.tv/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted">Клип скачается к нам и будет играть как наш файл; ссылка на оригинал сохранится.</p>
          </div>
        ) : (
          <div key="file" className="space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-muted">Видео-файл</span>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) setFile(f);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed p-6 text-center transition ${
                dragOver ? "border-primary bg-surface-2" : "border-[var(--border-strong)] hover:bg-surface-2"
              }`}
            >
              {file ? (
                <>
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-muted">
                    {(file.size / 1024 / 1024).toFixed(1)} МБ · нажми, чтобы заменить
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm">Перетащи видео сюда или нажми, чтобы выбрать</span>
                  <span className="text-xs text-muted">MP4, до 200 МБ</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="hl-title" className="text-xs uppercase tracking-wide text-muted">
              Заголовок
            </label>
            <input
              id="hl-title"
              className={fieldCls}
              placeholder="Например: клатч 1v3 на эваке"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          {tournaments.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="hl-tournament" className="text-xs uppercase tracking-wide text-muted">
                Турнир (необязательно)
              </label>
              <select
                id="hl-tournament"
                className={fieldCls}
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
              >
                <option value="">— без привязки —</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title || "Турнир"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {status === "ok" && (
          <p className="text-sm text-ok">Отправлено на модерацию. После одобрения организатором хайлайт появится в галерее.</p>
        )}
        {status === "error" && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
          <span>{status === "sending" ? "Отправляем…" : "Отправить"}</span>
        </button>
      </form>
    </Panel>
  );
}
