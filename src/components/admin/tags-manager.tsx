"use client";

import * as React from "react";
import Link from "next/link";
import { api, errorText } from "@/lib/api";
import { Panel } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead } from "@/components/ui/section-head";
import { TagBadge } from "@/components/ui/tag-badge";
import { PlayerPicker } from "@/components/admin/match/player-picker";
import type { MatchPlayer, Tag } from "@/lib/types";

/** Готовые цвета тегов: из палитры сайта, чтобы бейджи смотрелись рядом друг с другом. */
const COLORS = ["#ffc53d", "#ff8a3d", "#ff6b6b", "#e070ff", "#9146ff", "#4f8cff", "#22d3ee", "#34d399", "#c9d2dc", "#9a9aa6"];

type Draft = { id?: string; name: string; color: string; visible: boolean; note?: string };

const NO_APPLICANTS = new Set<string>();

/** Откуда у тега держатели: роль и победа в сезоне выдаются сами. */
function autoNote(t: Tag): string {
  if (t.role) return `есть у всех с этой ролью · ${t.holderCount}`;
  if (t.seasonId) return `выдаётся победителю «${t.seasonName}» сам`;
  return "";
}

function TagRow({
  tag,
  players,
  busy,
  onEdit,
  onDelete,
  onAdd,
  onRemove,
}: {
  tag: Tag;
  players: MatchPlayer[];
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAdd: (userId: string) => void;
  onRemove: (userId: string) => void;
}) {
  const auto = !!tag.role || !!tag.seasonId;
  const holders = React.useMemo(() => new Set(tag.holders.map((h) => h.userId)), [tag.holders]);

  return (
    <Panel className="space-y-4 overflow-visible p-5">
      <div className="flex flex-wrap items-center gap-3">
        <TagBadge tag={tag} className={`text-[0.7rem] ${tag.visible ? "" : "opacity-50"}`} />
        <span className="text-xs text-muted">
          {tag.visible ? "виден на сайте" : "скрыт с сайта"}
          {auto ? ` · ${autoNote(tag)}` : ""}
        </span>
        <div className="ml-auto flex gap-2">
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onEdit}>
            <span>Изменить</span>
          </button>
          {!auto && (
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={onDelete}>
              <span>Удалить</span>
            </button>
          )}
        </div>
      </div>

      {!tag.role && (
        <div className="flex flex-wrap items-center gap-2">
          {tag.holders.length === 0 && <span className="text-sm text-muted">Пока ни у кого нет.</span>}
          {tag.holders.map((h) => (
            <span key={h.userId} className="chip">
              <Link href={`/profile/${h.login}`} className="hover:text-fg">
                {h.displayName || h.login}
              </Link>
              {!auto && (
                <button
                  type="button"
                  className="ml-1 text-muted transition hover:text-danger"
                  disabled={busy}
                  aria-label={`Забрать тег у ${h.displayName || h.login}`}
                  onClick={() => onRemove(h.userId)}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!auto && (
        <div className="max-w-sm">
          <PlayerPicker
            inputId={`tag-${tag.id}`}
            players={players}
            applicants={NO_APPLICANTS}
            hide={holders}
            busy={busy}
            onPick={(p) => onAdd(p.id)}
          />
        </div>
      )}
    </Panel>
  );
}

/** Теги у ника игрока: роли, победители сезонов и свои; любой можно перекрасить или скрыть с сайта. */
export function TagsManager() {
  const [tags, setTags] = React.useState<Tag[] | null>(null);
  const [players, setPlayers] = React.useState<MatchPlayer[]>([]);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [deleting, setDeleting] = React.useState<Tag | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    api.get<Tag[]>("/tags").then(setTags).catch(() => setErr("Не удалось загрузить теги."));
    api.get<MatchPlayer[]>("/match-players").then(setPlayers).catch(() => setPlayers([]));
  }, []);

  async function send(req: Promise<Tag[]>): Promise<boolean> {
    setBusy(true);
    setErr("");
    try {
      setTags(await req);
      return true;
    } catch (e) {
      setErr(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft) return;
    const body = { name: draft.name.trim(), color: draft.color, visible: draft.visible };
    const ok = await send(draft.id ? api.patch<Tag[]>(`/tags/${draft.id}`, body) : api.post<Tag[]>("/tags", body));
    if (ok) setDraft(null);
  }

  return (
    <div className="space-y-6">
      <SectionHead
        eyebrow="Кабинет"
        title="Теги"
        action={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setDraft({ name: "", color: COLORS[0], visible: true })}
          >
            <span>+ Новый тег</span>
          </button>
        }
      />
      <p className="-mt-2 max-w-3xl text-sm text-muted">
        Теги — подписи у ника в профиле: роли, победители сезонов и ваши собственные. Любой тег можно перекрасить или скрыть
        с сайта — тогда он виден только в кабинете. Роли и победителей сезонов сайт выдаёт сам.
      </p>

      {err && <p className="text-sm text-danger">{err}</p>}

      {tags === null ? (
        <p className="text-sm text-muted">Загружаем…</p>
      ) : tags.length === 0 ? (
        <EmptyState title="Тегов пока нет" hint="Создайте первый тег и выдайте его игрокам." />
      ) : (
        <div className="space-y-3">
          {tags.map((t) => (
            <TagRow
              key={t.id}
              tag={t}
              players={players}
              busy={busy}
              onEdit={() =>
                setDraft({
                  id: t.id,
                  name: t.name,
                  color: t.color,
                  visible: t.visible,
                  note: t.role || t.seasonId ? autoNote(t) : undefined,
                })
              }
              onDelete={() => setDeleting(t)}
              onAdd={(userId) => send(api.post<Tag[]>(`/tags/${t.id}/holders`, { userId }))}
              onRemove={(userId) => send(api.del<Tag[]>(`/tags/${t.id}/holders/${userId}`))}
            />
          ))}
        </div>
      )}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Изменить тег" : "Новый тег"}>
        {draft && (
          <form
            className="space-y-5 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <label className="block space-y-1.5">
              <span className="field-label">Название</span>
              <input
                className="input"
                maxLength={40}
                autoFocus
                value={draft.name}
                placeholder="Например, «Стример»"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>

            <div className="space-y-1.5">
              <span className="field-label">Цвет</span>
              <div className="flex flex-wrap items-center gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Цвет ${c}`}
                    aria-pressed={draft.color === c}
                    onClick={() => setDraft({ ...draft, color: c })}
                    className={`h-8 w-8 rounded-full transition ${draft.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--surface)]" : "hover:scale-110"}`}
                    style={{ background: c }}
                  />
                ))}
                <label className="ml-1 flex items-center gap-2 text-xs text-muted">
                  свой
                  <input
                    type="color"
                    className="h-8 w-10 cursor-pointer rounded bg-transparent"
                    value={draft.color}
                    onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                  />
                </label>
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--primary)]"
                checked={draft.visible}
                onChange={(e) => setDraft({ ...draft, visible: e.target.checked })}
              />
              Показывать на сайте
            </label>

            <div className="flex flex-wrap items-center gap-3 rounded-md bg-surface-2 px-4 py-3">
              <span className="text-xs text-muted">Так будет у ника:</span>
              {draft.visible ? (
                <TagBadge tag={{ name: draft.name.trim() || "Тег", color: draft.color }} />
              ) : (
                <span className="text-xs text-muted">тег скрыт</span>
              )}
            </div>

            {draft.note && <p className="text-xs text-muted">Держателей выбирает сайт: {draft.note}.</p>}

            <div className="flex justify-end gap-3">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>
                <span>Отмена</span>
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !draft.name.trim()}>
                <span>{draft.id ? "Сохранить" : "Создать"}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Удалить тег?"
        message={`Тег «${deleting?.name}» пропадёт у всех, кому выдан.`}
        confirmLabel="Удалить"
        danger
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const t = deleting;
          setDeleting(null);
          if (t) await send(api.del<Tag[]>(`/tags/${t.id}`));
        }}
      />
    </div>
  );
}
