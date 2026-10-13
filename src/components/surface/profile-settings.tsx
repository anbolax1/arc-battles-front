"use client";

import * as React from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { EMBARK_RE } from "@/components/domain/embark-id-editor";
import type { User, UserTag } from "@/lib/types";

/** Embark ID для лобби: после сохранения пропуск перерисуется с новым значением. */
function EmbarkField({ initial }: { initial: string }) {
  const router = useRouter();
  const [value, setValue] = React.useState(initial);
  const [saved, setSaved] = React.useState(initial);
  const [status, setStatus] = React.useState<"idle" | "saving" | "ok" | "error">("idle");
  const [error, setError] = React.useState("");
  const trimmed = value.trim();
  const dirty = trimmed !== saved.trim();
  const invalid = trimmed.length > 0 && !EMBARK_RE.test(trimmed);
  const done = status === "ok" && !dirty;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || invalid) return;
    setStatus("saving");
    setError("");
    try {
      const u = await api.patch<User>("/me", { embarkId: trimmed });
      setSaved(u.embarkId ?? "");
      setValue(u.embarkId ?? "");
      setStatus("ok");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(errorText(err, "Не удалось сохранить."));
    }
  }

  return (
    <form className="sf-field" onSubmit={onSubmit}>
      <label className="sf-field-label" htmlFor="pf-embark">
        Embark ID
      </label>
      <div className="pf-embark">
        <input
          id="pf-embark"
          className="sf-input"
          placeholder="Ник#1234"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid}
          aria-describedby="pf-embark-note"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
        />
        <button type="submit" className="sf-btn sf-btn-amber sf-btn-sm" disabled={!dirty || invalid || status === "saving"}>
          {status === "saving" ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>
      <p id="pf-embark-note" className={`sf-field-note ${invalid || status === "error" ? "bad" : done ? "good" : ""}`} aria-live="polite">
        {invalid
          ? "Формат: Ник#1234 — ник, решётка и 4 цифры."
          : status === "error"
            ? error
            : done
              ? "Сохранено"
              : "Для лобби в ARC Raiders, подставится в заявки."}
      </p>
    </form>
  );
}

/** Какие свои теги показывать в профиле; тег, скрытый организатором, включить нельзя. */
function TagToggles({ initial }: { initial: UserTag[] }) {
  const router = useRouter();
  const [tags, setTags] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function toggle(t: UserTag) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setTags(await api.put<UserTag[]>(`/me/tags/${t.id}`, { hidden: !t.hiddenByUser }));
      router.refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sf-field">
      <p className="sf-field-label" id="pf-tags">
        Теги в профиле
      </p>
      {tags.length ? (
        <div className="pf-tagset" role="group" aria-labelledby="pf-tags" aria-busy={busy}>
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              className="pf-tagbtn"
              style={{ "--tag": t.color || undefined } as CSSProperties}
              aria-pressed={t.visible && !t.hiddenByUser}
              disabled={!t.visible}
              title={t.visible ? undefined : "Скрыт организатором"}
              onClick={() => toggle(t)}
            >
              <i aria-hidden />
              {t.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="sf-field-note">Тегов пока нет.</p>
      )}
      {tags.length > 0 && (
        <p className={`sf-field-note ${error ? "bad" : ""}`} aria-live="polite">
          {error ||
            `Нажми на тег, чтобы убрать его с пропуска или вернуть.${tags.some((t) => !t.visible) ? " Бледные скрыл организатор." : ""}`}
        </p>
      )}
    </div>
  );
}

/** Настройки своего профиля под пропуском рейдера. */
export function ProfileSettings({ embarkId, tags }: { embarkId: string; tags: UserTag[] }) {
  return (
    <section className="pf-desk" aria-label="Настройки профиля">
      <EmbarkField initial={embarkId} />
      <TagToggles initial={tags} />
    </section>
  );
}
