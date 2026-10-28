"use client";

import { Panel } from "@/components/ui/card";
import { teamPlayers } from "@/lib/match";
import type { MatchState, Participant } from "@/lib/types";

/** Игроки стороны, у которых могут быть жетоны: у команды - оба, у игрока 1×1 - он сам. */
function sidePlayers(p: Participant): { userId: string; name: string }[] {
  if (p.kind === "team") return teamPlayers(p);
  return p.userId ? [{ userId: p.userId, name: p.name }] : [];
}

/** Имена игроков, поставивших жетон ×2 на матч: для пометки в шапке пульта. */
export function doubleNames(st: MatchState): string[] {
  const doubles = st.doubles ?? [];
  return (st.tournament.participants ?? []).flatMap((p) =>
    sidePlayers(p)
      .filter((pl) => doubles.some((d) => d.userId === pl.userId))
      .map((pl) => (p.kind === "team" ? `${p.name} (${pl.name})` : pl.name)),
  );
}

/** Жетоны ×2 до начала матча: игрок просит - ведущий ставит. В 2×2 жетон удваивает MMR всей команды,
    поэтому на сторону ставится один. Если жетонов ни у кого нет, блок не показывается. */
export function DoubleTokens({
  st,
  sides,
  busy,
  onToggle,
}: {
  st: MatchState;
  sides: [Participant | null, Participant | null];
  busy: boolean;
  onToggle: (userId: string, on: boolean) => void;
}) {
  const doubles = st.doubles ?? [];
  const wallet = st.doubleWallet ?? {};
  if (!doubles.length && !Object.values(wallet).some((n) => n > 0)) return null;

  return (
    <Panel className="space-y-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg uppercase">Жетоны ×2</h3>
        <span className="text-xs text-muted">Ставятся до первого раунда: победа приносит вдвое больше MMR, поражение снимает вдвое больше.</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sides.map(
          (p) =>
            p && (
              <div key={p.id} className="space-y-2 rounded-md p-3 shadow-[inset_0_0_0_1px_var(--border)]">
                <div className="truncate font-display uppercase">{p.name}</div>
                {sidePlayers(p).map((pl) => {
                  const on = doubles.some((d) => d.userId === pl.userId);
                  const mate = !on && doubles.some((d) => d.participantId === p.id);
                  const n = wallet[pl.userId] ?? 0;
                  return (
                    <div key={pl.userId} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-muted">
                        {p.kind === "team" ? `${pl.name} · ` : ""}жетонов <b className="tnum text-fg">{n}</b>
                      </span>
                      {on ? (
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onToggle(pl.userId, false)}>
                          <span>Снять ×2 - жетон вернётся</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-cyan btn-sm"
                          disabled={busy || mate || n < 1}
                          title={mate ? "У команды жетон уже стоит" : n < 1 ? "Жетонов нет" : undefined}
                          onClick={() => onToggle(pl.userId, true)}
                        >
                          <span>Поставить ×2</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ),
        )}
      </div>
    </Panel>
  );
}
