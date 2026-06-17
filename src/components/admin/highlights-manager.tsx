"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";
import { VideoPlayer } from "@/components/domain/video-player";
import { SectionHead } from "@/components/ui/section-head";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { fmtDate } from "@/lib/format";
import type { Highlight, HighlightStatus } from "@/lib/types";

/* Модерация хайлайтов: очередь по статусу, предпросмотр, одобрить/отклонить/удалить. */

const TABS: { key: string; label: string }[] = [
  { key: "pending", label: "На модерации" },
  { key: "approved", label: "Одобренные" },
  { key: "rejected", label: "Отклонённые" },
  { key: "all", label: "Все" },
];

const STATUS_LABEL: Record<HighlightStatus, string> = {
  processing: "Обрабатывается",
  pending: "На модерации",
  approved: "Одобрен",
  rejected: "Отклонён",
  failed: "Ошибка",
};

const STATUS_CLASS: Record<HighlightStatus, string> = {
  processing: "text-accent",
  pending: "text-primary-2",
  approved: "text-ok",
  rejected: "text-danger",
  failed: "text-danger",
};

const PAGE_SIZE = 12;

export function HighlightsManager() {
  const [status, setStatus] = React.useState("pending");
  const [items, setItems] = React.useState<Highlight[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState("");
  const [rejecting, setRejecting] = React.useState<Highlight | null>(null);
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get<{ items: Highlight[]; total: number }>(
          `/highlights/moderation?status=${status}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
        );
        if (!active) return;
        setItems(res.items);
        setTotal(res.total);
      } catch (e) {
        if (active) setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось загрузить.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [status, page]);

  async function moderate(h: Highlight, approve: boolean, rejectReason = "") {
    setBusyId(h.id);
    setMsg("");
    try {
      await api.post(`/highlights/${h.id}/moderate`, { approve, reason: rejectReason });
      setItems((xs) => xs.filter((x) => x.id !== h.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось сохранить.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(h: Highlight) {
    setBusyId(h.id);
    setMsg("");
    try {
      await api.del(`/highlights/${h.id}`);
      setItems((xs) => xs.filter((x) => x.id !== h.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось удалить.");
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <SectionHead eyebrow="Организатор" title="Хайлайты" />

      <div className="flex flex-wrap items-center gap-3">
        <div className="seg">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className="seg-btn"
              aria-pressed={status === t.key}
              onClick={() => {
                setStatus(t.key);
                setPage(0);
                setLoading(true);
              }}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        {msg && <span className="text-sm text-danger">{msg}</span>}
        <span className="ml-auto text-xs text-muted">{total > 0 ? `всего: ${total}` : ""}</span>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Загрузка…</p>
      ) : items.length ? (
        <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${busyId ? "opacity-80" : ""}`}>
          {items.map((h) => (
            <article key={h.id} className="panel flex flex-col overflow-hidden">
              <div className="aspect-video bg-black">
                {h.videoUrl ? (
                  <VideoPlayer
                    className="h-full w-full"
                    src={h.videoUrl}
                    poster={h.thumbUrl || undefined}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    {h.status === "processing" ? "обрабатывается…" : "видео недоступно"}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="min-w-0 truncate font-display text-sm uppercase">{h.title}</h3>
                  <span className={`flex-none text-xs uppercase ${STATUS_CLASS[h.status]}`}>
                    {STATUS_LABEL[h.status]}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Avatar name={h.userName || h.userLogin} src={h.userAvatarUrl} size="sm" />
                  <span className="truncate">{h.userName || h.userLogin}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  {h.tournamentTitle && <span className="text-primary-2">{h.tournamentTitle}</span>}
                  <span>{fmtDate(h.createdAt)}</span>
                  <span className="uppercase">{h.source === "twitch_clip" ? "twitch" : "файл"}</span>
                  {h.sourceUrl && (
                    <a href={h.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      оригинал ↗
                    </a>
                  )}
                </div>
                {h.rejectReason && <p className="text-xs text-danger">Причина: {h.rejectReason}</p>}

                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  {h.status !== "approved" && h.status !== "processing" && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busyId === h.id}
                      onClick={() => moderate(h, true)}
                    >
                      <span>Одобрить</span>
                    </button>
                  )}
                  {h.status !== "rejected" && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busyId === h.id}
                      onClick={() => {
                        setRejecting(h);
                        setReason("");
                      }}
                    >
                      <span>Отклонить</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={busyId === h.id}
                    onClick={() => remove(h)}
                  >
                    <span>Удалить</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Пусто" hint="В этой вкладке хайлайтов нет." />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            className="seg-btn disabled:opacity-40"
            disabled={page === 0 || loading}
            onClick={() => {
              setPage((p) => Math.max(0, p - 1));
              setLoading(true);
            }}
          >
            <span>‹ Назад</span>
          </button>
          <span className="text-xs text-muted tnum">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="seg-btn disabled:opacity-40"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => {
              setPage((p) => Math.min(totalPages - 1, p + 1));
              setLoading(true);
            }}
          >
            <span>Вперёд ›</span>
          </button>
        </div>
      )}

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Отклонить хайлайт"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRejecting(null)}>
              <span>Отмена</span>
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => {
                if (rejecting) void moderate(rejecting, false, reason.trim());
                setRejecting(null);
              }}
            >
              <span>Отклонить</span>
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <label htmlFor="hl-reason" className="field-label">
            Причина (необязательно, увидит автор)
          </label>
          <textarea
            id="hl-reason"
            className="textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: не относится к турниру / неподходящий контент"
          />
        </div>
      </Modal>
    </div>
  );
}
