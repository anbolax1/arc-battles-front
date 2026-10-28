"use client";

import * as React from "react";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SectionHead } from "@/components/ui/section-head";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { fmtDate } from "@/lib/format";
import { fmtCount, STAT_LABEL } from "@/lib/tokens";
import type { StatClaim, StatClaimStatus } from "@/lib/types";

/* Проверка скриншотов: игрок вписал в профиль часы в игре или ноки, модератор сверяет число со скриншотом. */

const TABS: { key: StatClaimStatus | ""; label: string }[] = [
  { key: "pending", label: "На проверке" },
  { key: "approved", label: "Подтверждённые" },
  { key: "rejected", label: "Отклонённые" },
  { key: "", label: "Все" },
];

const STATUS_LABEL: Record<StatClaimStatus, string> = {
  pending: "На проверке",
  approved: "Подтверждено",
  rejected: "Отклонено",
};

const STATUS_CLASS: Record<StatClaimStatus, string> = {
  pending: "text-primary-2",
  approved: "text-ok",
  rejected: "text-danger",
};

// Причина отказа стоит в профиле игрока одной строкой - как и на сервере.
const MAX_REASON = 160;
const PAGE_SIZE = 12;

export function StatClaimsManager() {
  const { user, isSuperadmin } = useAuth();
  const [status, setStatus] = React.useState<StatClaimStatus | "">("pending");
  const [items, setItems] = React.useState<StatClaim[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState("");
  const [rejecting, setRejecting] = React.useState<StatClaim | null>(null);
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get<{ items: StatClaim[]; total: number }>(
          `/stat-claims?status=${status}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
        );
        if (!active) return;
        setItems(res.items);
        setTotal(res.total);
      } catch (e) {
        if (active) setMsg(errorText(e, "Не удалось загрузить."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [status, page]);

  async function decide(c: StatClaim, approve: boolean, why = "") {
    setBusyId(c.id);
    setMsg("");
    try {
      const next = await api.post<StatClaim>(`/stat-claims/${c.id}/decide`, {
        approve,
        reason: why,
      });
      // Во вкладке «Все» решённая остаётся с новым статусом, в остальных - уходит.
      if (status === "") setItems((xs) => xs.map((x) => (x.id === c.id ? next : x)));
      else {
        setItems((xs) => xs.filter((x) => x.id !== c.id));
        setTotal((t) => Math.max(0, t - 1));
      }
    } catch (e) {
      setMsg(errorText(e, "Не удалось сохранить."));
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <SectionHead eyebrow="Модерация" title="Проверка скриншотов" />
      <p className="max-w-2xl text-sm text-muted">
        Игроки сами вписывают в профиль часы в игре и ноки за всё время и прикладывают скриншот. Пока число не проверено, в профиле рядом с
        ним стоит «не подтверждено». Сверьте число со скриншотом и подтвердите или отклоните - причину отказа игрок увидит в своём профиле.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="seg">
          {TABS.map((t) => (
            <button
              key={t.key || "all"}
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
        <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${busyId ? "opacity-80" : ""}`}>
          {items.map((c) => (
            <article key={c.id} className="panel flex flex-col overflow-hidden">
              <a
                href={c.screenshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-video bg-black"
                aria-label={`Скриншот ${c.displayName || c.login} в полном размере`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- скриншот из хранилища медиа */}
                <img src={c.screenshotUrl} alt="" className="h-full w-full object-contain" />
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-muted opacity-0 transition group-hover:opacity-100">
                  в полном размере ↗
                </span>
              </a>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={`/profile/${encodeURIComponent(c.login ?? "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 truncate font-display text-sm uppercase hover:text-accent"
                  >
                    {c.displayName || c.login}
                  </a>
                  <span className={`flex-none text-xs uppercase ${STATUS_CLASS[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-xs uppercase tracking-wide text-muted">{STAT_LABEL[c.kind]}</span>
                  <b className="font-display text-xl tnum text-primary-2">{fmtCount(c.value)}</b>
                  {c.previous != null && <span className="text-xs text-muted tnum">было подтверждено {fmtCount(c.previous)}</span>}
                </div>
                <div className="text-xs text-muted">{fmtDate(c.createdAt)}</div>
                {c.reason && <p className="text-xs text-danger">Причина: {c.reason}</p>}
                {c.userId === user?.id && !isSuperadmin ? (
                  <p className="mt-auto pt-2 text-xs text-muted">Ваш скриншот проверит другой модератор или организатор.</p>
                ) : (
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    {c.status !== "approved" && (
                      <button type="button" className="btn btn-primary btn-sm" disabled={busyId === c.id} onClick={() => decide(c, true)}>
                        <span>Подтвердить</span>
                      </button>
                    )}
                    {c.status !== "rejected" && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busyId === c.id}
                        onClick={() => {
                          setRejecting(c);
                          setReason("");
                        }}
                      >
                        <span>Отклонить</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Пусто" hint={status === "pending" ? "Все скриншоты проверены." : "В этой вкладке ничего нет."} />
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
        title="Отклонить число"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRejecting(null)}>
              <span>Отмена</span>
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => {
                if (rejecting) void decide(rejecting, false, reason.trim());
                setRejecting(null);
              }}
            >
              <span>Отклонить</span>
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <label htmlFor="sc-reason" className="field-label">
            Причина (необязательно, увидит игрок)
          </label>
          <input
            id="sc-reason"
            className="input"
            maxLength={MAX_REASON}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: на скриншоте другое число"
          />
        </div>
      </Modal>
    </div>
  );
}
