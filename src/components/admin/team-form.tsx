"use client";

import * as React from "react";
import { api, ApiError, errorText } from "@/lib/api";
import { initials } from "@/lib/format";
import { createPlaceholderPlayer, PlayerPicker } from "@/components/admin/match/player-picker";
import type { MatchPlayer, MatchTeam } from "@/lib/types";

/** Название стоит на табло оверлея рядом со счётом - как и на сервере. */
export const MAX_TEAM_NAME = 32;

type Slot = { id: string; name: string } | null;
type Slots = [Slot, Slot];

/** Ключ команды из ответа 409: у выбранной пары она уже есть. */
function existingTeamKey(e: unknown): string {
  if (!(e instanceof ApiError) || e.status !== 409) return "";
  try {
    return (JSON.parse(e.body) as { teamKey?: string }).teamKey ?? "";
  } catch {
    return "";
  }
}

function teamSlots(team?: MatchTeam): Slots {
  const slot = (i: number): Slot => {
    const m = team?.members[i];
    return m ? { id: m.userId, name: m.displayName || m.login } : null;
  };
  return [slot(0), slot(1)];
}

/** Команда 2×2: название и два игрока. Состав команды, у которой уже есть матчи, не меняется: MMR у этой пары. */
export function TeamForm({
  idPrefix,
  team,
  initialName = "",
  players,
  applicants,
  hide,
  onPlayer,
  onSaved,
  onExisting,
  onCancel,
}: {
  idPrefix: string;
  /** Правка команды; нет - новая. */
  team?: MatchTeam;
  initialName?: string;
  players: MatchPlayer[];
  applicants: Set<string>;
  /** Игроки, которых в команду не взять: они на другой стороне матча. */
  hide?: Set<string>;
  /** Игрок создан по нику - его добавляют в общий список. */
  onPlayer: (p: MatchPlayer) => void;
  onSaved: (team: MatchTeam) => void;
  /** У выбранной пары уже есть команда: взять её вместо новой. */
  onExisting?: (teamKey: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(team?.name ?? initialName);
  const [slots, setSlots] = React.useState<Slots>(() => teamSlots(team));
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [existing, setExisting] = React.useState("");
  const locked = !!team && team.matches > 0;
  const clean = name.trim().replace(/\s+/g, " ");
  const ready = clean.length >= 2 && !!slots[0] && !!slots[1];

  const put = (i: 0 | 1, p: MatchPlayer) => {
    setSlots((s) => (i === 0 ? [{ id: p.id, name: p.displayName || p.login }, s[1]] : [s[0], { id: p.id, name: p.displayName || p.login }]));
    setErr("");
    setExisting("");
  };

  const createPlayer = async (i: 0 | 1, nick: string) => {
    setBusy(true);
    setErr("");
    try {
      const p = await createPlaceholderPlayer(nick, players);
      onPlayer(p);
      put(i, p);
    } catch (e) {
      setErr(errorText(e, "Не удалось создать игрока."));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const [a, b] = slots;
    if (!ready || !a || !b) return;
    setBusy(true);
    setErr("");
    setExisting("");
    try {
      const body = { name: clean, members: locked ? undefined : [a.id, b.id] };
      const saved = team
        ? await api.patch<MatchTeam>(`/teams/${encodeURIComponent(team.teamKey)}`, body)
        : await api.post<MatchTeam>("/teams", body);
      onSaved(saved);
    } catch (e) {
      setErr(errorText(e, "Не удалось сохранить команду."));
      setExisting(existingTeamKey(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label className="block space-y-1.5">
        <span className="field-label">Название</span>
        <input
          className="input"
          maxLength={MAX_TEAM_NAME}
          autoFocus
          value={name}
          placeholder="Например, «Сутулые псы»"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {([0, 1] as const).map((i) => {
          const slot = slots[i];
          if (!slot) {
            return (
              <PlayerPicker
                key={i}
                inputId={`${idPrefix}-player-${i}`}
                label={`Игрок ${i + 1}`}
                players={players}
                applicants={applicants}
                exclude={slots[i === 0 ? 1 : 0]?.id}
                hide={hide}
                busy={busy}
                onPick={(p) => put(i, p)}
                onCreate={(nick) => void createPlayer(i, nick)}
              />
            );
          }
          return (
            <div key={i} className="space-y-1.5">
              <span className="field-label block">Игрок {i + 1}</span>
              <div className="flex min-h-[42px] items-center gap-3 rounded-md bg-surface-2 px-3 py-1.5 shadow-[inset_0_0_0_1px_var(--border)]">
                <span className="flex h-7 w-7 flex-none items-center justify-center bg-[var(--surface)] font-display text-[0.65rem] [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]">
                  {initials(slot.name)}
                </span>
                <span className="min-w-0 flex-1 truncate font-display uppercase">{slot.name}</span>
                {!locked && (
                  <button
                    type="button"
                    className="flex-none text-sm text-muted underline transition hover:text-fg"
                    onClick={() => setSlots((s) => (i === 0 ? [null, s[1]] : [s[0], null]))}
                  >
                    Сменить
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {locked && (
        <p className="text-xs text-muted">
          У команды уже есть матчи, поэтому состав не меняется: MMR у этой пары игроков. Для другого состава заведите новую команду.
        </p>
      )}
      {err && (
        <p className="text-sm text-danger">
          {err}
          {existing && onExisting && (
            <>
              {" "}
              <button type="button" className="text-accent underline" onClick={() => onExisting(existing)}>
                Взять её
              </button>
            </>
          )}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          <span>Отмена</span>
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !ready}>
          <span>{busy ? "Сохраняем…" : team ? "Сохранить" : "Создать команду"}</span>
        </button>
      </div>
    </form>
  );
}
