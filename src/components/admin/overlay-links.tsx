"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { CheckIcon, CopyIcon } from "@/components/icons";
import type { OverlayPreset } from "@/lib/types";

/** Кнопка «скопировать» с галочкой-подтверждением. */
function CopyButton({ text, label = "скопировать ссылку" }: { text: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard может быть недоступен */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={copied ? "Скопировано" : "Скопировать ссылку"}
      className={`flex h-7 w-7 flex-none items-center justify-center rounded-md transition-colors ${
        copied ? "text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)]"
      }`}
    >
      {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
    </button>
  );
}

/** Строка пресета: название, правимый адрес ссылки и копирование полного URL.
    Ключ строки включает slug — после сохранения компонент пересоздаётся, и черновик
    подхватывает адрес, каким его нормализовал сервер. */
function PresetLinkRow({
  origin,
  preset,
  onRename,
}: {
  origin: string;
  preset: OverlayPreset;
  onRename: (next: string) => Promise<void>;
}) {
  const [draft, setDraft] = React.useState(preset.slug);
  const [busy, setBusy] = React.useState(false);
  const clean = draft.trim();
  const dirty = clean !== "" && clean !== preset.slug;
  const url = `${origin}/overlay/${preset.slug}`;

  const save = async () => {
    if (!dirty || busy) return;
    setBusy(true);
    try {
      await onRename(clean);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] py-1 pl-2.5 pr-1">
      <span className="w-24 flex-none truncate text-xs" title={preset.name}>
        {preset.name}
      </span>
      <span className="flex min-w-0 flex-1 items-center text-xs text-[var(--muted)]">
        <span className="flex-none">/overlay/</span>
        <input
          className="min-w-0 flex-1 bg-transparent text-[var(--fg)] outline-none"
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            }
          }}
          aria-label={`адрес сцены «${preset.name}»`}
          title={url}
        />
      </span>
      {dirty && (
        <button type="button" className="btn btn-cyan btn-sm flex-none" disabled={busy} onClick={save} title="сохранить адрес">
          <span>✓</span>
        </button>
      )}
      <CopyButton text={url} label={`скопировать ссылку сцены «${preset.name}»`} />
    </div>
  );
}

/** Ссылки на оверлей для OBS: своя у каждой сцены, чтобы вид оверлея переключался сценой OBS,
    а не кабинетом, плюс общая - на сцену, выбранную в редакторе. */
export function OverlayLinks({ reloadSig }: { reloadSig: number }) {
  const [origin, setOrigin] = React.useState("");
  const [presets, setPresets] = React.useState<OverlayPreset[]>([]);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    // origin доступен только на клиенте после монтирования (иначе рассинхрон гидрации).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  // Перечитываем список, когда пресеты меняли в редакторе (reloadSig).
  React.useEffect(() => {
    let active = true;
    api
      .get<OverlayPreset[]>("/overlay/presets")
      .then((l) => {
        // Без slug ссылки не существует — так отвечает бэкенд старее этой фичи
        // (окно между деплоями фронта и бэка). Такие пресеты просто не показываем.
        if (active) setPresets(l.filter((p) => typeof p.slug === "string" && p.slug !== ""));
      })
      .catch(() => {
        if (active) setPresets([]);
      });
    return () => {
      active = false;
    };
  }, [reloadSig]);

  // Адрес нормализует и разводит по уникальности бэкенд — в списке держим его ответ.
  const rename = async (p: OverlayPreset, next: string) => {
    setErr("");
    try {
      const u = await api.put<OverlayPreset>(`/overlay/presets/${p.id}`, { name: p.name, slug: next });
      setPresets((xs) => xs.map((x) => (x.id === u.id ? u : x)));
    } catch {
      setErr("Не удалось изменить адрес сцены.");
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="field-label">Ссылки для OBS (Browser Source)</span>

      {presets.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[0.7rem] leading-snug text-muted">
            Своя ссылка у каждой сцены: заведите по источнику на сцену OBS. Правки в редакторе доходят до них сразу.
          </p>
          {presets.map((p) => (
            <PresetLinkRow key={`${p.id}:${p.slug}`} origin={origin} preset={p} onRename={(next) => rename(p, next)} />
          ))}
        </div>
      ) : (
        <p className="text-[0.7rem] leading-snug text-muted">Сцен пока нет: создайте первую в редакторе, у неё появится своя ссылка.</p>
      )}
      {err && <p className="text-xs text-danger">{err}</p>}

      <div className="space-y-1 pt-2">
        <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] py-1 pl-2.5 pr-1">
          <code className="flex-1 truncate text-xs text-[var(--muted)]">{origin}/overlay</code>
          <CopyButton text={`${origin}/overlay`} />
        </div>
        <p className="text-[0.7rem] leading-snug text-muted">Общая ссылка: показывает сцену, выбранную в редакторе.</p>
      </div>

      <details className="mt-1.5 text-xs text-[var(--muted)]">
        <summary className="cursor-pointer select-none hover:text-[var(--fg)]">Как добавить в OBS</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-4 leading-relaxed">
          <li>В OBS, в блоке «Источники», нажмите «+» → «Браузер».</li>
          <li>Создайте новый источник (например «Оверлей - задания») → «ОК».</li>
          <li>В поле «URL-адрес» вставьте ссылку сцены (кнопка копирования).</li>
          <li>Ширина — 1920, высота — 1080 (под размер вашей сцены).</li>
          <li>Поставьте галочку «Обновлять браузер, когда сцена становится активной» → «ОК».</li>
          <li>
            Повторите для каждой сцены, каждую - в своей сцене OBS. Переключили сцену в OBS - сменился оверлей, кабинет для
            этого открывать не нужно.
          </li>
          <li>
            Оверлей обновляется сам во время эфира. Если завис — правый клик по источнику → «Обновить».
          </li>
        </ol>
      </details>
    </div>
  );
}
