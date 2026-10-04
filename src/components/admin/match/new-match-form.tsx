"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, errorText } from "@/lib/api";
import { initials } from "@/lib/format";
import { Panel } from "@/components/ui/card";
import { PlayerPicker } from "@/components/admin/match/player-picker";
import type { MatchPlayer, MatchState, PlayerType, Registration, User } from "@/lib/types";

const PLAYER_TYPES: Array<[PlayerType, string]> = [
  ["pvp", "PvP"],
  ["pve", "PvE"],
  ["pvpve", "PvPvE"],
];

/** Кто станет стороной A (первой банит карту): новичок сезона или тот, у кого меньше MMR. */
function orderSides(a: MatchPlayer, b: MatchPlayer): [MatchPlayer, MatchPlayer] {
  if (b.isNew && !a.isNew) return [b, a];
  if (a.isNew === b.isNew && b.mmr < a.mmr) return [b, a];
  return [a, b];
}

function SideCard({
  title,
  hint,
  player,
  tone,
  applicant,
  onClear,
  children,
}: {
  title: string;
  hint: string;
  player: MatchPlayer | null;
  tone: "primary" | "cyan";
  applicant: boolean;
  onClear: () => void;
  children: React.ReactNode;
}) {
  const avatar =
    tone === "primary"
      ? "bg-[image:var(--grad-warm)] text-[#150800]"
      : "bg-[var(--accent)] text-[#06232a]";
  return (
    <Panel className="min-w-0 flex-1 space-y-3 overflow-visible p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-display text-lg uppercase">{title}</h3>
        <span className="text-xs text-muted">{hint}</span>
      </div>
      {player ? (
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`flex h-14 w-14 flex-none items-center justify-center font-display text-lg ${avatar} [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]`}
          >
            {initials(player.displayName || player.login)}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="truncate font-display text-xl uppercase">{player.displayName || player.login}</div>
            <div className="text-sm text-muted">
              MMR {player.mmr} · {player.isNew ? "новичок сезона" : `${player.wins}–${player.losses} в сезоне`}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {applicant && <span className="badge badge-org"><span>Из заявки</span></span>}
              {player.isPlaceholder && <span className="badge badge-official"><span>Без входа</span></span>}
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
            <span>Сменить</span>
          </button>
        </div>
      ) : (
        children
      )}
    </Panel>
  );
}

/** Новый матч: стороны, тип игроков и ×2 - и сразу к пикам-банам. */
export function NewMatchForm() {
  const router = useRouter();
  const [players, setPlayers] = React.useState<MatchPlayer[]>([]);
  const [pool, setPool] = React.useState<Registration[]>([]);
  const [first, setFirst] = React.useState<MatchPlayer | null>(null);
  const [second, setSecond] = React.useState<MatchPlayer | null>(null);
  const [playerType, setPlayerType] = React.useState<PlayerType>("pvp");
  const [mult, setMult] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [liveId, setLiveId] = React.useState("");

  React.useEffect(() => {
    api.get<MatchPlayer[]>("/match-players").then(setPlayers).catch(() => setErr("Не удалось загрузить игроков."));
    api.get<Registration[]>("/registrations/pool").then(setPool).catch(() => setPool([]));
  }, []);

  const applicants = React.useMemo(() => new Set(pool.map((r) => r.userId)), [pool]);
  const [sideA, sideB] = first && second ? orderSides(first, second) : [first, second];

  const put = (p: MatchPlayer) => {
    if (!first) setFirst(p);
    else if (!second) setSecond(p);
  };

  const createPlayer = async (nick: string, slot: "first" | "second") => {
    setBusy(true);
    setErr("");
    try {
      const u = await api.post<User>("/players/placeholder", { nickname: nick });
      const existing = players.find((p) => p.id === u.id);
      const p: MatchPlayer = existing ?? {
        id: u.id,
        login: u.login,
        displayName: u.displayName,
        mmr: players.find((x) => x.isNew)?.mmr ?? 1000,
        wins: 0,
        losses: 0,
        isNew: true,
        isPlaceholder: true,
      };
      if (!existing) setPlayers((xs) => [...xs, p]);
      if (slot === "first") setFirst(p);
      else setSecond(p);
    } catch (e) {
      setErr(errorText(e, "Не удалось создать игрока."));
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!sideA || !sideB) return;
    setBusy(true);
    setErr("");
    setLiveId("");
    try {
      const st = await api.post<MatchState>("/matches", {
        mode: "1x1",
        playerType,
        ratingMultiplier: mult,
        sides: [{ userId: sideA.id }, { userId: sideB.id }],
      });
      router.push(`/admin/matches/${st.tournament.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        try {
          const j = JSON.parse(e.body) as { matchId?: string };
          if (j.matchId) setLiveId(j.matchId);
        } catch {
          /* тело без id - покажем только текст */
        }
      }
      setErr(errorText(e, "Не удалось создать матч."));
      setBusy(false);
    }
  };

  const freePool = pool.filter((r) => r.userId !== first?.id && r.userId !== second?.id);

  return (
    <div className="space-y-4">
      <Panel className="flex flex-wrap items-end gap-x-8 gap-y-4 p-5">
        <div className="space-y-1.5">
          <span className="field-label">Режим</span>
          <div className="seg">
            <button type="button" className="seg-btn" aria-pressed={true}>
              <span>1×1</span>
            </button>
            <button type="button" className="seg-btn opacity-50" aria-pressed={false} disabled title="2×2 — следующим шагом">
              <span>2×2</span>
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="field-label">Тип игроков</span>
          <div className="seg">
            {PLAYER_TYPES.map(([v, label]) => (
              <button key={v} type="button" className="seg-btn" aria-pressed={playerType === v} onClick={() => setPlayerType(v)}>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="field-label">Рейтинг</span>
          <div className="seg">
            {[1, 2].map((m) => (
              <button key={m} type="button" className="seg-btn" aria-pressed={mult === m} onClick={() => setMult(m)}>
                <span>×{m}</span>
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <div className="flex flex-col gap-4 lg:flex-row">
        <SideCard
          title="Игрок A"
          hint="банит первым: меньше MMR или новичок"
          player={sideA}
          tone="primary"
          applicant={!!sideA && applicants.has(sideA.id)}
          onClear={() => (sideA === first ? setFirst(null) : setSecond(null))}
        >
          <PlayerPicker
            inputId="side-a"
            players={players}
            applicants={applicants}
            exclude={second?.id ?? first?.id}
            busy={busy}
            onPick={put}
            onCreate={(nick) => createPlayer(nick, first ? "second" : "first")}
          />
        </SideCard>
        <SideCard
          title="Игрок B"
          hint="больше MMR"
          player={sideB}
          tone="cyan"
          applicant={!!sideB && applicants.has(sideB.id)}
          onClear={() => (sideB === second ? setSecond(null) : setFirst(null))}
        >
          <PlayerPicker
            inputId="side-b"
            players={players}
            applicants={applicants}
            exclude={first?.id ?? second?.id}
            busy={busy}
            onPick={put}
            onCreate={(nick) => createPlayer(nick, first ? "second" : "first")}
          />
        </SideCard>
      </div>

      {freePool.length > 0 && (!first || !second) && (
        <Panel className="flex flex-wrap items-center gap-2 p-4">
          <span className="field-label mr-1">Заявки</span>
          {freePool.map((r) => {
            const p = players.find((x) => x.id === r.userId);
            if (!p) return null;
            return (
              <button key={r.id} type="button" className="chip transition hover:brightness-125" onClick={() => put(p)}>
                <span>{r.userDisplayName || r.userLogin}</span>
                {r.note && <span className="font-normal text-muted">{r.note}</span>}
              </button>
            );
          })}
          <span className="text-xs text-muted">нажмите — игрок встанет в свободный слот</span>
        </Panel>
      )}

      <Panel glow className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0 space-y-1">
          <div className="font-display text-xl uppercase">
            {sideA && sideB ? `${sideA.displayName || sideA.login} vs ${sideB.displayName || sideB.login}` : "Выберите обоих игроков"}
          </div>
          <div className="text-sm text-muted">
            1×1 · {PLAYER_TYPES.find(([v]) => v === playerType)?.[1]} · 2 раунда · рейтинг ×{mult}
          </div>
          <div className="text-xs text-muted">Название соберётся из ников, матч сразу станет текущим</div>
        </div>
        <button type="button" className="btn btn-primary" disabled={!sideA || !sideB || busy} onClick={create}>
          <span>{busy ? "Создаём…" : "Создать и перейти к пикам →"}</span>
        </button>
      </Panel>

      {err && (
        <p className="text-sm text-danger">
          {err}{" "}
          {liveId && (
            <Link href={`/admin/matches/${liveId}`} className="text-accent underline">
              Открыть текущий матч
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
