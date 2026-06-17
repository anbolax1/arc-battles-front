"use client";

import * as React from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Panel } from "@/components/ui/card";
import type { User } from "@/lib/types";

const fieldCls =
  "w-full bg-surface-2 px-3.5 py-2.5 text-sm text-fg shadow-[inset_0_0_0_1px_var(--border)] outline-none transition focus:shadow-[inset_0_0_0_1px_var(--primary)]";

export function RegisterForm({ user }: { user: User }) {
  // Embark ID берём из профиля (там и редактируется) — в заявке его не вводят.
  const embarkId = (user.embarkId ?? "").trim();
  const hasEmbark = embarkId.length > 0;
  const [note, setNote] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasEmbark) {
      setStatus("error");
      setError("Сначала укажи Embark ID в профиле.");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      await api.post(`/registrations`, { note: note.trim() });
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof ApiError ? err.body || err.message : "Не удалось отправить заявку.",
      );
    }
  }

  return (
    <Panel glow className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 items-center bg-surface-2 px-3 text-sm shadow-[inset_0_0_0_1px_var(--border)] [clip-path:polygon(8px_0,100%_0,calc(100%-8px)_100%,0_100%)]">
          Вошёл как <span className="ml-1 font-display uppercase">{user.displayName || user.login}</span>
        </span>
      </div>

      {status === "ok" ? (
        <div className="space-y-2">
          <h3 className="font-display text-lg uppercase text-ok">Заявка в пуле</h3>
          <p className="text-sm text-muted">
            Ты в общем списке участников. Организатор позовёт тебя на подходящий турнир —
            статус появится в твоём профиле.
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm mt-2"
            onClick={() => setStatus("idle")}
          >
            <span>Изменить заявку</span>
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          {/* Embark ID — из профиля, не редактируется здесь */}
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-muted">Embark ID</span>
            {hasEmbark ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display uppercase tnum">{embarkId}</span>
                <Link href="/profile" className="text-xs text-accent transition hover:underline">
                  изменить в профиле
                </Link>
              </div>
            ) : (
              <div className="space-y-2 bg-surface-2 p-3 shadow-[inset_0_0_0_1px_rgba(255,106,26,0.35)]">
                <p className="text-sm">
                  Чтобы подать заявку, укажи свой <span className="font-display">Embark ID</span> в профиле —
                  он нужен организатору для лобби в Arc Raiders.
                </p>
                <Link href="/profile" className="btn btn-cyan btn-sm">
                  <span>Заполнить профиль</span>
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-note" className="text-xs uppercase tracking-wide text-muted">
              Удобные даты и пожелания
            </label>
            <textarea
              id="reg-note"
              className={`${fieldCls} min-h-20 resize-y`}
              placeholder="Например: могу по будням вечером и в выходные. Напарник — ник#0000."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {status === "error" && <p className="text-sm text-danger">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={!hasEmbark || status === "sending"}>
            <span>{status === "sending" ? "Отправляем…" : "Подать заявку"}</span>
          </button>
        </form>
      )}
    </Panel>
  );
}
