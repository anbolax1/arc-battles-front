"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, errorText } from "@/lib/api";
import { initials } from "@/lib/format";
import { roundsLabel } from "@/lib/match";
import { Panel } from "@/components/ui/card";
import { PlayerPicker } from "@/components/admin/match/player-picker";
import {
  MAX_PRIZE,
  PreviewImage,
  PreviewPicker,
  putShowPreview,
  useChosenPreview,
} from "@/components/admin/match/show-preview";
import type { MatchFormat, MatchPlayer, MatchState, PlayerType, Registration, User } from "@/lib/types";

const PLAYER_TYPES: Array<[PlayerType, string]> = [
  ["pvp", "PvP"],
  ["pve", "PvE"],
  ["pvpve", "PvPvE"],
];

/** Кто станет стороной A (первой ходит в пиках-банах): новичок сезона или тот, у кого меньше MMR. */
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

/** Завтра в 20:00 по часам ведущего - в формате поля datetime-local. */
function defaultShowTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(20, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Новый матч: стороны, тип игроков и ×2 - и сразу к пикам-банам; шоу-матч - в расписание на дату. */
export function NewMatchForm({ liveMatchId = "" }: { liveMatchId?: string }) {
  const router = useRouter();
  const [format, setFormat] = React.useState<MatchFormat>(liveMatchId ? "show" : "match");
  const [startsAt, setStartsAt] = React.useState(defaultShowTime);
  const [players, setPlayers] = React.useState<MatchPlayer[]>([]);
  const [pool, setPool] = React.useState<Registration[]>([]);
  const [first, setFirst] = React.useState<MatchPlayer | null>(null);
  const [second, setSecond] = React.useState<MatchPlayer | null>(null);
  const [playerType, setPlayerType] = React.useState<PlayerType>("pvp");
  const [mult, setMult] = React.useState(1);
  const [rounds, setRounds] = React.useState<2 | 3>(2);
  const [prize, setPrize] = React.useState("");
  const [preview, choosePreview] = useChosenPreview();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [liveId, setLiveId] = React.useState("");
  // Шоу-матч создан, а превью не загрузилось: повторное создание дало бы второй такой же матч.
  const [createdId, setCreatedId] = React.useState("");

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

  const show = format === "show";
  const roundCount = show ? 3 : rounds;
  const create = async () => {
    if (!sideA || !sideB) return;
    if (show && !startsAt) {
      setErr("Укажите дату и время шоу-матча.");
      return;
    }
    setBusy(true);
    setErr("");
    setLiveId("");
    try {
      const st = await api.post<MatchState>("/matches", {
        mode: "1x1",
        playerType,
        ratingMultiplier: mult,
        format,
        rounds: roundCount,
        startsAt: show ? new Date(startsAt).toISOString() : undefined,
        prize: show ? prize.trim() : undefined,
        sides: [{ userId: sideA.id }, { userId: sideB.id }],
      });
      if (show && preview) {
        try {
          await putShowPreview(st.tournament.id, preview.src);
        } catch (e) {
          setCreatedId(st.tournament.id);
          setErr(`Шоу-матч создан, но превью не загрузилось (${errorText(e)}). Загрузите его в пульте матча.`);
          setBusy(false);
          return;
        }
      }
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
          <span className="field-label">Формат</span>
          <div className="seg">
            <button
              type="button"
              className={`seg-btn ${liveMatchId ? "opacity-50" : ""}`}
              aria-pressed={!show}
              disabled={!!liveMatchId}
              title={liveMatchId ? "Сначала завершите текущий матч" : "Матч начнётся сразу"}
              onClick={() => setFormat("match")}
            >
              <span>Матч</span>
            </button>
            <button type="button" className="seg-btn" aria-pressed={show} onClick={() => setFormat("show")}>
              <span>Шоу-матч</span>
            </button>
          </div>
        </div>
        {show && (
          <label className="space-y-1.5">
            <span className="field-label">Начало</span>
            <input
              type="datetime-local"
              className="input block"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
        )}
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
          <span className="field-label">Раунды</span>
          <div className="seg">
            {([2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                className={`seg-btn ${show && n === 2 ? "opacity-50" : ""}`}
                aria-pressed={roundCount === n}
                disabled={show && n === 2}
                title={show ? "У шоу-матча всегда три раунда" : n === 3 ? "Пики-баны как в шоу-матче" : undefined}
                onClick={() => setRounds(n)}
              >
                <span>{n}</span>
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

      {show && (
        <Panel className="grid gap-5 p-5 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-display text-lg uppercase">Анонс на главной</h3>
            <label className="block space-y-1.5">
              <span className="field-label">Приз</span>
              <input
                className="input"
                maxLength={MAX_PRIZE}
                placeholder="Например: 5000 ₽ и роль в Discord"
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
              />
              <span className="block text-xs text-muted">Необязательно. Покажем крупно в анонсе.</span>
            </label>
            <div className="space-y-1.5">
              <span className="field-label">Превью</span>
              {preview ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-muted">{"file" in preview.src ? preview.src.file.name : "Картинка по ссылке"}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => choosePreview(null)}>
                    <span>Выбрать другую</span>
                  </button>
                </div>
              ) : (
                <PreviewPicker onPick={choosePreview} />
              )}
            </div>
          </div>
          {preview ? (
            <PreviewImage src={preview.shown} />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-[var(--border-strong)] px-4 text-center text-sm text-muted">
              Здесь будет картинка анонса
            </div>
          )}
        </Panel>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <SideCard
          title="Игрок A"
          hint="ходит первым: меньше MMR или новичок"
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
            {show ? "Шоу-матч · " : ""}1×1 · {PLAYER_TYPES.find(([v]) => v === playerType)?.[1]} · {roundsLabel(roundCount)} ·
            рейтинг ×{mult}
            {show && prize.trim() ? ` · приз: ${prize.trim()}` : ""}
          </div>
          <div className="text-xs text-muted">
            {show
              ? "Появится в расписании; начать его можно из пульта, когда придёт время"
              : "Название соберётся из ников, матч сразу станет текущим"}
          </div>
          {roundCount === 3 && (
            <div className="text-xs text-muted">Пики-баны на три раунда: пик A → пик B → бан A → бан B → пик A</div>
          )}
        </div>
        <button type="button" className="btn btn-primary" disabled={!sideA || !sideB || busy || !!createdId} onClick={create}>
          <span>{busy ? "Создаём…" : show ? "Запланировать шоу-матч →" : "Создать и перейти к пикам →"}</span>
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
          {createdId && (
            <Link href={`/admin/matches/${createdId}`} className="text-accent underline">
              Открыть пульт шоу-матча
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
