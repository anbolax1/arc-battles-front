"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

const fieldCls =
  "w-full bg-surface-2 px-3.5 py-2.5 text-sm text-fg shadow-[inset_0_0_0_1px_var(--border)] outline-none transition focus:shadow-[inset_0_0_0_1px_var(--primary)]";

// Формат Embark ID: ник, решётка, ровно 4 цифры — напр. «Istwood#1234».
const EMBARK_RE = /^[^#]+#\d{4}$/;

/** Редактор Embark ID текущего пользователя (PATCH /api/me). */
export function EmbarkIdEditor({ initial }: { initial: string }) {
  const [value, setValue] = React.useState(initial);
  const [saved, setSaved] = React.useState(initial);
  const [status, setStatus] = React.useState<"idle" | "saving" | "ok" | "error">("idle");
  const [error, setError] = React.useState("");
  const trimmed = value.trim();
  const dirty = trimmed !== saved.trim();
  const invalid = trimmed.length > 0 && !EMBARK_RE.test(trimmed);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) {
      setStatus("error");
      setError("Формат: Ник#1234 — ник, решётка и ровно 4 цифры.");
      return;
    }
    setStatus("saving");
    setError("");
    try {
      const u = await api.patch<User>("/me", { embarkId: trimmed });
      setSaved(u.embarkId ?? "");
      setValue(u.embarkId ?? "");
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.body || err.message : "Не удалось сохранить.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-52 flex-1 space-y-1.5">
        <label htmlFor="eid" className="text-xs uppercase tracking-wide text-muted">
          Embark ID
        </label>
        <input
          id="eid"
          className={fieldCls}
          placeholder="Istwood#1234"
          aria-invalid={invalid}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
        />
        <p className={`text-xs ${invalid ? "text-danger" : "text-muted"}`}>
          Формат: <span className="tnum">Ник#1234</span> — ник, решётка и ровно 4 цифры.
        </p>
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={!dirty || status === "saving" || invalid}>
        <span>{status === "saving" ? "Сохраняем…" : "Сохранить"}</span>
      </button>
      {status === "ok" && !dirty && <span className="pb-2 text-sm text-ok">Сохранено</span>}
      {status === "error" && <span className="pb-2 text-sm text-danger">{error}</span>}
    </form>
  );
}
