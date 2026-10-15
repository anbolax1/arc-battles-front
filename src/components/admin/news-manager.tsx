"use client";

import * as React from "react";
import Link from "next/link";
import { api, apiFetch, errorText } from "@/lib/api";
import { fmtDate, fmtTime } from "@/lib/format";
import type { News } from "@/lib/types";
import { Panel } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead } from "@/components/ui/section-head";
import { DateTimePicker, toMskInput } from "@/components/admin/date-time-picker";
import { PreviewImage, useChosenPreview, type PreviewSource } from "@/components/admin/match/show-preview";
import { RichEditor } from "@/components/admin/rich-editor";
import { BeltArt } from "@/components/surface/belt-art";

/** Пределы - те же, что проверяет сервер. */
const MAX_TITLE = 140;
const MAX_IMAGE_MB = 10;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Publish = "draft" | "now" | "date";

interface Draft {
  id?: string;
  title: string;
  body: string;
  publish: Publish;
  date: string; // «YYYY-MM-DDTHH:mm» по МСК
  image?: string;
  imageLink: string;
  removeImage: boolean;
}

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function putNewsImage(id: string, src: PreviewSource): Promise<News> {
  if ("file" in src) {
    return apiFetch<News>(`/news/${id}/image`, {
      method: "PUT",
      body: src.file,
      headers: { "Content-Type": src.file.type || "application/octet-stream" },
    });
  }
  return apiFetch<News>(`/news/${id}/image`, { method: "PUT", body: JSON.stringify({ url: src.url }) });
}

function draftOf(n?: News): Draft {
  if (!n) return { title: "", body: "", publish: "now", date: "", imageLink: "", removeImage: false };
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    publish: n.publishedAt ? "date" : "draft",
    date: toMskInput(n.publishedAt),
    image: n.imageUrl,
    imageLink: "",
    removeImage: false,
  };
}

function Status({ n }: { n: News }) {
  if (!n.publishedAt) {
    return (
      <span className="badge badge-official">
        <span>Черновик</span>
      </span>
    );
  }
  const when = `${fmtDate(n.publishedAt)}, ${fmtTime(n.publishedAt)}`;
  return n.published ? (
    <span className="badge badge-glad">
      <span>Опубликована · {when}</span>
    </span>
  ) : (
    <span className="badge badge-champ">
      <span>Выйдет · {when}</span>
    </span>
  );
}

/** Картинка новости: ссылка подхватывается сразу, без отдельной кнопки, файл - кнопкой, перетаскиванием или вставкой. */
function ImageField({
  link,
  shown,
  busy,
  onLink,
  onFile,
  onRemove,
}: {
  link: string;
  shown: string;
  busy: boolean;
  onLink: (v: string) => void;
  onFile: (f: File) => void;
  onRemove: () => void;
}) {
  const [over, setOver] = React.useState(false);
  const [err, setErr] = React.useState("");
  const fileId = React.useId();

  function pickFile(f?: File | null) {
    setErr("");
    if (!f) return;
    if (!IMAGE_TYPES.includes(f.type)) return setErr("Это не картинка: подойдут JPG, PNG, WebP или GIF.");
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) return setErr(`Файл больше ${MAX_IMAGE_MB} МБ.`);
    onFile(f);
  }

  return (
    <div
      className={`space-y-3 rounded-md border border-dashed p-3 transition ${
        over ? "border-[var(--primary)] bg-[rgba(255,106,26,0.06)]" : "border-[var(--border-strong)]"
      }`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setOver(false);
        pickFile(e.dataTransfer.files[0]);
      }}
      onPaste={(e) => {
        const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith("image/"));
        if (!f) return;
        e.preventDefault();
        pickFile(f);
      }}
    >
      <div className="flex flex-wrap gap-2">
        <input
          className="input min-w-0 flex-1"
          inputMode="url"
          placeholder="Ссылка на картинку: https://…"
          value={link}
          onChange={(e) => {
            setErr("");
            onLink(e.target.value);
          }}
        />
        <label htmlFor={fileId} className={`btn btn-ghost btn-sm cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
          <span>Файл с компьютера</span>
          <input
            id={fileId}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="sr-only"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="text-xs text-muted">
        Вставьте ссылку, выберите файл или перетащите картинку сюда. JPG, PNG, WebP или GIF до {MAX_IMAGE_MB} МБ; по ссылке сайт
        скачает картинку и будет хранить у себя.
      </p>
      {link.trim() && !isHttpUrl(link) && <p className="text-xs text-danger">Нужна ссылка, начинающаяся с http:// или https://</p>}
      {err && <p className="text-xs text-danger">{err}</p>}
      {shown && (
        <div className="space-y-2">
          <PreviewImage src={shown} className="max-w-md" />
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onRemove}>
            <span>Убрать картинку</span>
          </button>
        </div>
      )}
    </div>
  );
}

/** Новости лиги: черновики, публикация сразу или в назначенное время, картинка к новости. */
export function NewsManager() {
  const [items, setItems] = React.useState<News[] | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [chosen, choose] = useChosenPreview();
  const [deleting, setDeleting] = React.useState<News | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [loadErr, setLoadErr] = React.useState("");
  const editorRef = React.useRef<HTMLDivElement>(null);

  const reload = React.useCallback(() => {
    api
      .get<News[]>("/news/all")
      .then((list) => {
        setItems(list);
        setLoadErr("");
      })
      .catch(() => setLoadErr("Не удалось загрузить новости."));
  }, []);

  React.useEffect(reload, [reload]);

  function open(n?: News) {
    setErr("");
    choose(null);
    setDraft(draftOf(n));
    requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function close() {
    choose(null);
    setDraft(null);
    setErr("");
  }

  async function save() {
    if (!draft) return;
    if (draft.publish === "date" && !draft.date) {
      setErr("Укажите дату и время публикации.");
      return;
    }
    const link = draft.imageLink.trim();
    if (link && !isHttpUrl(link)) {
      setErr("Ссылка на картинку должна начинаться с http:// или https://");
      return;
    }
    const body = {
      title: draft.title.trim(),
      body: draft.body,
      publishedAt: draft.publish === "draft" ? null : draft.publish === "now" ? new Date().toISOString() : `${draft.date}:00+03:00`,
    };
    setBusy(true);
    setErr("");
    let id = draft.id;
    try {
      const saved = id ? await api.patch<News>(`/news/${id}`, body) : await api.post<News>("/news", body);
      id = saved.id;
      if (chosen) await putNewsImage(id, chosen.src);
      else if (link) await putNewsImage(id, { url: link });
      else if (draft.removeImage && draft.image) await api.del<News>(`/news/${id}/image`);
      close();
    } catch (e) {
      setErr(errorText(e));
      // Новость уже сохранена, не удалась только картинка: дальше правим её, а не создаём вторую.
      if (id && !draft.id) setDraft({ ...draft, id });
    } finally {
      setBusy(false);
      reload();
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setErr("");
    try {
      await api.del(`/news/${deleting.id}`);
      if (draft?.id === deleting.id) close();
      setDeleting(null);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
      reload();
    }
  }

  const shownImage =
    chosen?.shown || (draft && isHttpUrl(draft.imageLink) ? draft.imageLink.trim() : "") || (draft && !draft.removeImage ? draft.image ?? "" : "");

  return (
    <div className="space-y-6">
      <SectionHead
        eyebrow="Кабинет"
        title="Новости"
        action={
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => open()}>
            <span>+ Новая новость</span>
          </button>
        }
      />
      <p className="-mt-2 max-w-3xl text-sm text-muted">
        Новости видят все на странице «Новости», свежие сверху. Черновик видно только вам; новость с датой в будущем выйдет
        сама в это время. О поясе лиги сайт пишет сам: кто забрал пояс, у кого он выпал, кто стал почётным носителем. Такую
        новость можно поправить или удалить — удалённая не появится снова.
      </p>

      {draft && (
        <div ref={editorRef} className="scroll-mt-24">
          <Panel className="space-y-5 p-5">
            <h3 className="font-display text-lg uppercase">{draft.id ? "Изменить новость" : "Новая новость"}</h3>
            <div className="space-y-5">
              <label className="block space-y-1.5">
                <span className="field-label">Заголовок</span>
                <input
                  className="input"
                  maxLength={MAX_TITLE}
                  autoFocus
                  value={draft.title}
                  placeholder="Например, «4 сезон стартует 19 октября»"
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </label>

              <div className="space-y-1.5">
                <span className="field-label block">Текст</span>
                <RichEditor key={draft.id ?? "new"} value={draft.body} onChange={(html) => setDraft((d) => (d ? { ...d, body: html } : d))} />
                <span className="block text-xs text-muted">
                  Выделите текст и выберите оформление на панели — или сочетания клавиш, как в Телеграме. ||Текст|| при наборе
                  станет спойлером. В ленте виден первый абзац.
                </span>
              </div>

              <div className="space-y-2">
                <span className="field-label block">Картинка</span>
                <ImageField
                  link={draft.imageLink}
                  shown={shownImage}
                  busy={busy}
                  onLink={(v) => {
                    choose(null);
                    setDraft({ ...draft, imageLink: v });
                  }}
                  onFile={(f) => {
                    choose({ file: f });
                    setDraft({ ...draft, imageLink: "" });
                  }}
                  onRemove={() => {
                    choose(null);
                    setDraft({ ...draft, imageLink: "", removeImage: true });
                  }}
                />
              </div>

              <div className="space-y-2">
                <span className="field-label block">Публикация</span>
                <div className="seg">
                  {(
                    [
                      ["draft", "Черновик"],
                      ["now", "Сразу"],
                      ["date", "По дате"],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      className="seg-btn"
                      aria-pressed={draft.publish === v}
                      onClick={() => setDraft({ ...draft, publish: v, date: v === "date" && !draft.date ? toMskInput(new Date().toISOString()) : draft.date })}
                    >
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                {draft.publish === "date" && (
                  <div className="max-w-xs">
                    <DateTimePicker value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
                  </div>
                )}
                <p className="text-xs text-muted">
                  {draft.publish === "draft"
                    ? "Новость видно только вам, пока не опубликуете."
                    : draft.publish === "now"
                      ? "Новость появится на сайте сразу после сохранения."
                      : "Время московское. Прошедшая дата — новость уже на сайте, будущая — выйдет сама."}
                </p>
              </div>

              {err && <p className="text-sm text-danger">{err}</p>}

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-primary" disabled={busy || !draft.title.trim()} onClick={() => void save()}>
                  <span>{busy ? "Сохраняем…" : "Сохранить"}</span>
                </button>
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={close}>
                  <span>Отмена</span>
                </button>
                {draft.id && (
                  <Link className="ml-auto text-sm text-muted transition hover:text-fg" href={`/news/${draft.id}`} target="_blank">
                    Открыть на сайте ↗
                  </Link>
                )}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {loadErr && <p className="text-sm text-danger">{loadErr}</p>}
      {!draft && err && <p className="text-sm text-danger">{err}</p>}

      {items === null ? (
        !loadErr && <p className="text-sm text-muted">Загружаем…</p>
      ) : items.length === 0 ? (
        <EmptyState title="Новостей пока нет" hint="Напишите первую — она появится на странице «Новости»." />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Panel key={n.id} className="flex flex-wrap items-center gap-4 p-4">
              {n.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- картинка из нашего хранилища медиа
                <img src={n.imageUrl} alt="" className="h-16 w-28 flex-none rounded object-cover" />
              ) : n.belt ? (
                <div className="flex h-16 w-28 flex-none items-center rounded bg-[#130918] px-1.5" aria-hidden>
                  <BeltArt id={`adm-news-${n.id}`} name={n.belt.name} stars={n.belt.stars} vacant={n.belt.vacant} className="h-auto w-full" />
                </div>
              ) : (
                <div className="h-16 w-28 flex-none rounded bg-surface-2" aria-hidden />
              )}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="truncate font-semibold">{n.title}</div>
                <div className="flex flex-wrap gap-1.5">
                  <Status n={n} />
                  {n.belt && (
                    <span className="badge badge-champ">
                      <span>Написал сайт · пояс</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Link className="btn btn-ghost btn-sm" href={`/news/${n.id}`} target="_blank">
                  <span>Открыть</span>
                </Link>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => open(n)}>
                  <span>Изменить</span>
                </button>
                <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setDeleting(n)}>
                  <span>Удалить</span>
                </button>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Удалить новость?"
        message={deleting ? `«${deleting.title}» пропадёт с сайта вместе с картинкой. Вернуть её не получится.` : ""}
        busy={busy}
        error={deleting ? err : undefined}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
