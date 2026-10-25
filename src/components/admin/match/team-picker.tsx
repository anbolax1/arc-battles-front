"use client";

import * as React from "react";
import { teamMembersLine } from "@/lib/display";
import { initials } from "@/lib/format";
import type { MatchTeam } from "@/lib/types";

/** Выбор команды 2×2: поиск по названию и никам, команды с заявками сверху; если нужной нет - завести новую.
    Команды с игроком соперника не предлагаются: игрок заходит с ведущим только за одну сторону. */
export function TeamPicker({
  inputId,
  teams,
  applicants,
  rival,
  onPick,
  onCreate,
  busy,
}: {
  inputId: string;
  teams: MatchTeam[];
  applicants: Set<string>;
  /** Команда на другой стороне. */
  rival?: MatchTeam | null;
  onPick: (t: MatchTeam) => void;
  /** Завести новую команду; name - то, что набрано в поиске. */
  onCreate: (name: string) => void;
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
  const taken = new Set(rival?.members.map((m) => m.userId) ?? []);
  const found = (t: MatchTeam) =>
    !query ||
    t.name.toLowerCase().includes(query) ||
    t.members.some((m) => m.login.toLowerCase().includes(query) || (m.displayName || "").toLowerCase().includes(query));
  const applied = (t: MatchTeam) => t.members.some((m) => applicants.has(m.userId));
  const matching = teams.filter(found);
  const free = matching.filter((t) => !t.members.some((m) => taken.has(m.userId)));
  const hidden = matching.length - free.length;
  const items = [...free.filter(applied), ...free.filter((t) => !applied(t))].slice(0, 8);
  const named = query.length >= 2 && !teams.some((t) => t.name.toLowerCase() === query);

  const pick = (t: MatchTeam) => {
    onPick(t);
    setQ("");
    setOpen(false);
  };
  const create = () => {
    onCreate(named ? q.trim() : "");
    setQ("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative space-y-1.5">
      <label className="field-label" htmlFor={inputId}>
        Команда
      </label>
      <input
        id={inputId}
        className="input"
        autoComplete="off"
        placeholder="Название команды или ник игрока"
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
            else if (named) create();
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-md border border-[var(--border-strong)] bg-[var(--surface)] p-1.5 shadow-2xl">
          {items.map((t) => (
            <button
              key={t.teamKey}
              type="button"
              onClick={() => pick(t)}
              className="flex w-full items-center gap-3 rounded px-2 py-2 text-left transition hover:bg-[var(--surface-2)]"
            >
              <span className="flex h-8 w-8 flex-none items-center justify-center bg-[var(--surface-2)] font-display text-[0.7rem] [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]">
                {initials(t.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm uppercase">{t.name}</span>
                <span className="block truncate text-xs text-muted">
                  {teamMembersLine(t)} · {t.isNew ? "новая в сезоне" : `${t.wins}–${t.losses} в сезоне`}
                </span>
              </span>
              {applied(t) && <span className="badge badge-org"><span>Заявка</span></span>}
              <span className="font-display text-sm tnum text-primary-2">{t.mmr}</span>
            </button>
          ))}
          {!items.length && (
            <p className="px-2 py-3 text-sm text-muted">{teams.length ? "Таких команд нет." : "Команд пока нет — заведите первую."}</p>
          )}
          {hidden > 0 && <p className="px-2 py-1.5 text-xs text-muted">Не показаны команды с игроком соперника: {hidden}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={create}
            className="mt-1 flex w-full items-center gap-3 rounded bg-[rgba(34,211,238,0.07)] px-2 py-2 text-left text-accent shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]"
          >
            <span className="flex h-8 w-8 flex-none items-center justify-center text-lg">+</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{named ? `Создать команду «${q.trim()}»` : "Новая команда"}</span>
              <span className="block text-xs text-muted">Два игрока и название — команда останется в списке для следующих матчей</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
