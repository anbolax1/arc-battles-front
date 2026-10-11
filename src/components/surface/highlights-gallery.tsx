"use client";

import * as React from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Highlight } from "@/lib/types";
import { useHighlightUpload } from "@/components/domain/highlight-upload";
import { Stripes } from "@/components/surface/stripes";
import { ClipLightbox, ClipTile } from "@/components/surface/highlights";

/** «1 клип», «3 клипа», «5 клипов». */
function clipsWord(n: number): string {
  const a = Math.abs(n) % 100,
    b = a % 10;
  if (a > 10 && a < 20) return "клипов";
  if (b === 1) return "клип";
  if (b >= 2 && b <= 4) return "клипа";
  return "клипов";
}

/** Свой клип на проверку: ссылкой на твич-клип или файлом. */
function UploadForm({ tournaments, onSent }: { tournaments: { id: string; title: string }[]; onSent: () => void }) {
  const up = useHighlightUpload({ onDone: onSent });
  const [dragOver, setDragOver] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const pick = () => fileRef.current?.click();

  return (
    <form className="hlp-form" onSubmit={up.submit}>
      <div className="sf-seg" role="tablist" aria-label="Как прислать клип">
        <button type="button" role="tab" aria-selected={up.mode === "link"} onClick={() => up.setMode("link")}>
          Ссылка на клип
        </button>
        <button type="button" role="tab" aria-selected={up.mode === "file"} onClick={() => up.setMode("file")}>
          Свой файл
        </button>
      </div>

      {up.mode === "link" ? (
        <div className="sf-field">
          <label className="sf-field-label" htmlFor="hlp-url">
            Ссылка на твич-клип
          </label>
          <input id="hlp-url" className="sf-input" placeholder="https://clips.twitch.tv/…" value={up.url} onChange={(e) => up.setUrl(e.target.value)} />
          <p className="sf-field-note">Клип скачается к нам и будет играть как наш файл; ссылка на оригинал сохранится.</p>
        </div>
      ) : (
        <div className="sf-field">
          <span className="sf-field-label">Видео-файл</span>
          <div
            role="button"
            tabIndex={0}
            className={`hlp-drop ${dragOver ? "over" : ""}`}
            onClick={pick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                pick();
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
              if (f) up.setFile(f);
            }}
          >
            <b>{up.file ? up.file.name : "Перетащи видео сюда или нажми, чтобы выбрать"}</b>
            <small>{up.file ? `${(up.file.size / 1024 / 1024).toFixed(1)} МБ · нажми, чтобы заменить` : "MP4, до 200 МБ"}</small>
            <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => up.setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
      )}

      <div className="hlp-row">
        <div className="sf-field">
          <label className="sf-field-label" htmlFor="hlp-title">
            Заголовок
          </label>
          <input id="hlp-title" className="sf-input" placeholder="Например: клатч 1v3 на эваке" value={up.title} onChange={(e) => up.setTitle(e.target.value)} />
        </div>
        {tournaments.length > 0 && (
          <div className="sf-field">
            <label className="sf-field-label" htmlFor="hlp-match">
              Матч (необязательно)
            </label>
            <select id="hlp-match" className="sf-select" value={up.tournamentId} onChange={(e) => up.setTournamentId(e.target.value)}>
              <option value="">— без привязки —</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title || "Матч"}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {up.status === "error" && <p className="sf-field-note bad">{up.error}</p>}
      <button type="submit" className="sf-btn sf-btn-amber" disabled={up.status === "sending"}>
        {up.status === "sending" ? "Отправляем…" : "Отправить на проверку"}
      </button>
    </form>
  );
}

/** Галерея хайлайтов в новом дизайне: клипы порциями, плеер поверх страницы и форма своего клипа для вошедших. */
export function SurfaceHighlightsGallery({
  initialItems,
  initialTotal,
  pageSize,
  tournaments,
}: {
  initialItems: Highlight[];
  initialTotal: number;
  pageSize: number;
  tournaments: { id: string; title: string }[];
}) {
  const { user } = useAuth();
  const [items, setItems] = React.useState(initialItems);
  const [total, setTotal] = React.useState(initialTotal);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [active, setActive] = React.useState<Highlight | null>(null);
  const close = React.useCallback(() => setActive(null), []);

  async function loadMore() {
    setLoading(true);
    try {
      const res = await api.get<{ items: Highlight[]; total: number }>(`/highlights?limit=${pageSize}&offset=${items.length}`);
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...res.items.filter((x) => !seen.has(x.id))];
      });
      setTotal(res.total);
    } catch {
      /* оставим то, что уже показано */
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="sf-page-head sf-night sf-grain hlp-top">
        <Stripes shape="corner" className="corner" draw />
        <div className="sf-wrap">
          <p className="sf-eyebrow">
            Хайлайты · {total} {clipsWord(total)}
          </p>
          <h1 className="sf-h-big">
            хайлайты<span className="sf-dot">.</span>
          </h1>
          <p className="sf-lead hlp-lead">
            Лучшие моменты с эфиров. Прислать свой клип может любой, кто вошёл, — после проверки организатором он появится здесь.
          </p>
          <div className="sf-controls">
            {user ? (
              <button
                type="button"
                className="sf-btn sf-btn-amber"
                aria-expanded={form}
                onClick={() => {
                  setForm((v) => !v);
                  setSent(false);
                }}
              >
                {form ? "Скрыть форму" : "Прислать клип"}
              </button>
            ) : (
              <Link className="sf-btn sf-btn-amber" href="/login?redirect=/highlights">
                Войти и прислать клип
              </Link>
            )}
          </div>
          {sent && (
            <p className="hlp-sent" role="status">
              Клип отправлен на проверку. После одобрения организатором он появится в галерее.
            </p>
          )}
          {form && (
            <UploadForm
              tournaments={tournaments}
              onSent={() => {
                setForm(false);
                setSent(true);
              }}
            />
          )}
        </div>
      </section>

      <section className="sf-sec sf-night-2 hlp-body">
        <div className="sf-wrap">
          {items.length ? (
            <div className="hlp-grid">
              {items.map((h) => (
                <ClipTile key={h.id} h={h} onOpen={setActive} />
              ))}
            </div>
          ) : (
            <p className="hlp-empty">Клипов пока нет — пришли первый.</p>
          )}
          {items.length < total && (
            <button type="button" className="sf-btn sf-btn-line hlp-more" disabled={loading} onClick={loadMore}>
              {loading ? "Загружаем…" : "Показать ещё"}
            </button>
          )}
        </div>
      </section>
      <ClipLightbox clip={active} onClose={close} />
    </>
  );
}
