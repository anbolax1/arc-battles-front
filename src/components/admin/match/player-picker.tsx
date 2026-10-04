"use client";

import * as React from "react";
import type { MatchPlayer } from "@/lib/types";
import { initials } from "@/lib/format";

/** Выбор игрока стороны: поиск по нику с MMR сезона, заявки сверху; если игрока нет - создать по нику. */
export function PlayerPicker({
  inputId,
  players,
  applicants,
  exclude,
  onPick,
  onCreate,
  busy,
}: {
  inputId: string;
  players: MatchPlayer[];
  applicants: Set<string>;
  exclude?: string | null;
  onPick: (p: MatchPlayer) => void;
  onCreate: (nick: string) => void;
  busy?: boolean;
}) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const query = q.trim().toLowerCase();
  const matches = (p: MatchPlayer) =>
    !query || p.login.toLowerCase().includes(query) || (p.displayName || "").toLowerCase().includes(query);
  const pool = players.filter((p) => p.id !== exclude && applicants.has(p.id) && matches(p));
  const rest = players.filter((p) => p.id !== exclude && !applicants.has(p.id) && matches(p));
  const items = [...pool, ...rest].slice(0, 8);
  const exact = players.some((p) => p.login.toLowerCase() === query || (p.displayName || "").toLowerCase() === query);
  const canCreate = query.length >= 2 && !exact;

  const pick = (p: MatchPlayer) => {
    onPick(p);
    setQ("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative space-y-1.5">
      <label className="field-label" htmlFor={inputId}>
        Ник игрока
      </label>
      <input
        id={inputId}
        className="input"
        autoComplete="off"
        placeholder="Начните вводить ник"
        value={q}
        disabled={busy}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (items[0]) pick(items[0]);
            else if (canCreate) onCreate(q.trim());
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-md border border-[var(--border-strong)] bg-[var(--surface)] p-1.5 shadow-2xl">
          {items.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              className="flex w-full items-center gap-3 rounded px-2 py-2 text-left transition hover:bg-[var(--surface-2)]"
            >
              <span className="flex h-8 w-8 flex-none items-center justify-center bg-[var(--surface-2)] font-display text-[0.7rem] [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]">
                {initials(p.displayName || p.login)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm uppercase">{p.displayName || p.login}</span>
                <span className="block text-xs text-muted">
                  {p.isNew ? "новичок сезона" : `${p.wins}–${p.losses} в сезоне`}
                </span>
              </span>
              {applicants.has(p.id) && <span className="badge badge-org"><span>Заявка</span></span>}
              <span className="font-display text-sm tnum text-primary-2">{p.mmr}</span>
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onCreate(q.trim())}
              className="mt-1 flex w-full items-center gap-3 rounded bg-[rgba(34,211,238,0.07)] px-2 py-2 text-left text-accent shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]"
            >
              <span className="flex h-8 w-8 flex-none items-center justify-center text-lg">+</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Создать игрока «{q.trim()}»</span>
                <span className="block text-xs text-muted">Без пароля — ссылку для входа можно выдать позже в «Игроках»</span>
              </span>
            </button>
          )}
          {!items.length && !canCreate && (
            <p className="px-2 py-3 text-sm text-muted">Никого не нашли — введите хотя бы 2 символа, чтобы создать игрока.</p>
          )}
        </div>
      )}
    </div>
  );
}
