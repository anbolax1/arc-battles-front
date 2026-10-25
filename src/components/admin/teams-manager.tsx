"use client";

import * as React from "react";
import Link from "next/link";
import { api, errorText } from "@/lib/api";
import { Panel } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead } from "@/components/ui/section-head";
import { TeamForm } from "@/components/admin/team-form";
import { matchesWord } from "@/components/surface/fmt";
import { teamSeasonLine } from "@/lib/display";
import type { MatchPlayer, MatchTeam, Registration } from "@/lib/types";

function teamMatches(t: MatchTeam, q: string): boolean {
  const norm = (s: string) => s.toLowerCase();
  return !q || norm(t.name).includes(q) || t.members.some((m) => norm(m.displayName || "").includes(q) || norm(m.login).includes(q));
}

/** Команды 2×2: пара игроков и название. Их выбирают сторонами матча 2×2. */
export function TeamsManager() {
  const [teams, setTeams] = React.useState<MatchTeam[] | null>(null);
  const [players, setPlayers] = React.useState<MatchPlayer[]>([]);
  const [pool, setPool] = React.useState<Registration[]>([]);
  const [query, setQuery] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<MatchTeam | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    api.get<MatchTeam[]>("/match-teams").then(setTeams).catch(() => setErr("Не удалось загрузить команды."));
    api.get<MatchPlayer[]>("/match-players").then(setPlayers).catch(() => setPlayers([]));
    api.get<Registration[]>("/registrations/pool").then(setPool).catch(() => setPool([]));
  }, []);

  const applicants = React.useMemo(() => new Set(pool.map((r) => r.userId)), [pool]);
  const addPlayer = (p: MatchPlayer) => setPlayers((xs) => (xs.some((x) => x.id === p.id) ? xs : [...xs, p]));
  const q = query.trim().toLowerCase();
  const shown = (teams ?? []).filter((t) => teamMatches(t, q));

  async function remove(t: MatchTeam) {
    setBusy(true);
    setErr("");
    try {
      await api.del(`/teams/${encodeURIComponent(t.teamKey)}`);
      setTeams((xs) => (xs ?? []).filter((x) => x.teamKey !== t.teamKey));
    } catch (e) {
      setErr(errorText(e, "Не удалось удалить команду."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHead
        eyebrow="Кабинет"
        title="Команды"
        action={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setCreating(true);
              setEditing(null);
            }}
          >
            <span>+ Новая команда</span>
          </button>
        }
      />
      <p className="-mt-2 max-w-3xl text-sm text-muted">
        Команда 2×2 — два игрока и название, её выбирают стороной матча 2×2. MMR у пары игроков, поэтому состав команды, у которой
        уже есть матчи, не меняется — для другого состава заведите новую команду. Название можно поменять в любой момент.
      </p>

      {creating && (
        <Panel className="space-y-4 overflow-visible p-5">
          <h3 className="font-display text-lg uppercase">Новая команда</h3>
          <TeamForm
            idPrefix="new-team"
            players={players}
            applicants={applicants}
            onPlayer={addPlayer}
            onSaved={(t) => {
              setTeams((xs) => [t, ...(xs ?? [])]);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        </Panel>
      )}

      {err && <p className="text-sm text-danger">{err}</p>}

      {teams === null ? (
        <p className="text-sm text-muted">Загружаем…</p>
      ) : teams.length === 0 ? (
        <EmptyState title="Команд пока нет" hint="Заведите первую команду — её можно будет выбрать в матче 2×2." />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="input max-w-xs flex-1"
              placeholder="Поиск по названию или нику"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="ml-auto text-xs text-muted">{q ? `найдено ${shown.length} из ${teams.length}` : `всего ${teams.length}`}</span>
          </div>
          {shown.length ? (
            <Panel className="divide-y divide-[var(--border)] overflow-visible">
              {shown.map((t) =>
                editing === t.teamKey ? (
                  <div key={t.teamKey} className="space-y-3 bg-surface-2/40 p-5">
                    <h3 className="font-display text-base uppercase">Изменить команду</h3>
                    <TeamForm
                      idPrefix={`team-${t.teamKey}`}
                      team={t}
                      players={players}
                      applicants={applicants}
                      onPlayer={addPlayer}
                      onSaved={(next) => {
                        setTeams((xs) => (xs ?? []).map((x) => (x.teamKey === t.teamKey ? next : x)));
                        setEditing(null);
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  </div>
                ) : (
                  <div key={t.teamKey} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="truncate font-display text-lg uppercase">{t.name}</div>
                      <div className="flex flex-wrap gap-x-2 text-sm text-muted">
                        {t.members.map((m, i) => (
                          <React.Fragment key={m.userId}>
                            {i > 0 && <span aria-hidden>·</span>}
                            <Link href={`/profile/${m.login}`} className="transition hover:text-fg">
                              {m.displayName || m.login}
                            </Link>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-muted">
                      {teamSeasonLine(t)}
                      <span className="block text-xs">{t.matches ? `${t.matches} ${matchesWord(t.matches)} всего` : "ещё не играла"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/teams/${encodeURIComponent(t.teamKey)}`} className="btn btn-ghost btn-sm" target="_blank">
                        <span>Страница ↗</span>
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => {
                          setEditing(t.teamKey);
                          setCreating(false);
                        }}
                      >
                        <span>Изменить</span>
                      </button>
                      {t.matches === 0 && (
                        <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setDeleting(t)}>
                          <span>Удалить</span>
                        </button>
                      )}
                    </div>
                  </div>
                ),
              )}
            </Panel>
          ) : (
            <EmptyState title="Ничего не нашли" hint="Измените запрос: ищем по названию команды и никам игроков." />
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Удалить команду?"
        message={`У команды «${deleting?.name}» ещё нет матчей — её можно убрать из списка. Игроки останутся.`}
        confirmLabel="Удалить"
        danger
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const t = deleting;
          setDeleting(null);
          if (t) await remove(t);
        }}
      />
    </div>
  );
}
