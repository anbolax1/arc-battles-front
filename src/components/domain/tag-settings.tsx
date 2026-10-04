"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { TagBadge } from "@/components/ui/tag-badge";
import type { UserTag } from "@/lib/types";

/** Какие свои теги показывать в профиле; тег, скрытый организатором, включить нельзя. */
export function TagSettings() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [tags, setTags] = React.useState<UserTag[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (!open || tags) return;
    api.get<UserTag[]>("/me/tags").then(setTags).catch(() => setErr("Не удалось загрузить теги."));
  }, [open, tags]);

  async function toggle(t: UserTag) {
    setBusy(true);
    setErr("");
    try {
      setTags(await api.put<UserTag[]>(`/me/tags/${t.id}`, { hidden: !t.hiddenByUser }));
      router.refresh();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="text-xs text-accent transition hover:underline" onClick={() => setOpen(true)}>
        Настроить теги
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-md bg-surface-2 p-3 shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-muted">Какие теги показывать</span>
        <button type="button" className="text-xs text-muted transition hover:text-fg" onClick={() => setOpen(false)}>
          Готово
        </button>
      </div>
      {tags === null ? (
        <p className="text-xs text-muted">Загружаем…</p>
      ) : tags.length === 0 ? (
        <p className="text-xs text-muted">Тегов пока нет.</p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {tags.map((t) => (
            <label
              key={t.id}
              className={`flex items-center gap-2 ${t.visible ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
              title={t.visible ? undefined : "Скрыт организатором"}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--primary)]"
                checked={t.visible && !t.hiddenByUser}
                disabled={!t.visible || busy}
                onChange={() => toggle(t)}
              />
              <TagBadge tag={t} />
            </label>
          ))}
        </div>
      )}
      {tags?.some((t) => !t.visible) && (
        <p className="text-xs text-muted">Бледные теги скрыл организатор — их не включить.</p>
      )}
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
