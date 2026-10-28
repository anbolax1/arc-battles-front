"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, errorText } from "@/lib/api";
import { teamMembersLine, teamSeasonLine } from "@/lib/display";
import { initials } from "@/lib/format";
import { roundsLabel } from "@/lib/match";
import { Panel } from "@/components/ui/card";
import { DateTimePicker, toMskInput } from "@/components/admin/date-time-picker";
import { createPlaceholderPlayer, PlayerPicker } from "@/components/admin/match/player-picker";
import { TeamPicker } from "@/components/admin/match/team-picker";
import { TeamForm } from "@/components/admin/team-form";
import {
  MAX_PRIZE,
  PreviewImage,
  PreviewPicker,
  putShowPreview,
  useChosenPreview,
} from "@/components/admin/match/show-preview";
import type { Belt, MatchFormat, MatchPlayer, MatchState, MatchTeam, PlayerType, Registration, TournamentMode } from "@/lib/types";
import { holderName } from "@/components/surface/belt-lib";

const PLAYER_TYPES: Array<[PlayerType, string]> = [
  ["pvp", "PvP"],
  ["pve", "PvE"],
  ["pvpve", "PvPvE"],
];

type OrderWhy = "mmr" | "games" | "coin";

/** Кто станет стороной A (первой ходит в пиках-банах), как решит сервер: меньше MMR, при равном - меньше матчей
    в прошлых сезонах; при полном равенстве сервер бросит жребий, здесь стороны остаются в порядке выбора. */
function orderSides<T extends { mmr: number; prevGames: number }>(a: T, b: T): { sides: [T, T]; why: OrderWhy } {
  if (a.mmr !== b.mmr) return { sides: a.mmr < b.mmr ? [a, b] : [b, a], why: "mmr" };
  if (a.prevGames !== b.prevGames) return { sides: a.prevGames < b.prevGames ? [a, b] : [b, a], why: "games" };
  return { sides: [a, b], why: "coin" };
}

/** Подсказки у карточек сторон: почему A ходит первой. */
function sideHints(why: OrderWhy, teams: boolean): [string, string] {
  if (why === "games") return ["MMR равный, меньше матчей в прошлых сезонах", "больше матчей в прошлых сезонах"];
  if (why === "coin") return ["MMR и опыт равны — стороны решит жребий", "MMR и опыт равны — стороны решит жребий"];
  return [teams ? "ходит первой: меньше MMR" : "ходит первым: меньше MMR", "больше MMR"];
}

/** Что новый матч сделает с поясом лиги - подсказка организатору до создания матча. */
function beltNote(belt: Belt | null, a: MatchPlayer, b: MatchPlayer, show: boolean): string {
  if (!belt?.reigns.length) return "";
  const ids = [a.id, b.id];
  const holder = belt.holder && ids.includes(belt.holder.userId) ? belt.holder : null;
  if (show) return holder ? "Шоу-матч пояс лиги не разыгрывает" : "";
  if (holder) {
    const other = holder.userId === a.id ? b : a;
    return `Матч за пояс лиги: победит ${other.displayName || other.login} — заберёт пояс, ничья оставит его у ${holderName(holder)}`;
  }
  const leaders = belt.leaders ?? [];
  if (!belt.holder && (!leaders.length || leaders.some((l) => ids.includes(l.userId)))) return "Матч разыграет ничейный пояс лиги: победитель заберёт его";
  return "";
}

/** Выбранная сторона в карточке: имя, состав команды и счёт в сезоне. */
interface Chosen {
  name: string;
  members?: string;
  season: string;
  badges: React.ReactNode;
}

function SideCard({
  title,
  hint,
  chosen,
  tone,
  onClear,
  children,
}: {
  title: string;
  hint: string;
  chosen: Chosen | null;
  tone: "primary" | "cyan";
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
      {chosen ? (
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`flex h-14 w-14 flex-none items-center justify-center font-display text-lg ${avatar} [clip-path:polygon(14%_0,100%_0,86%_100%,0_100%)]`}
          >
            {initials(chosen.name)}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="truncate font-display text-xl uppercase">{chosen.name}</div>
            {chosen.members && <div className="truncate text-sm">{chosen.members}</div>}
            <div className="text-sm text-muted">{chosen.season}</div>
            <div className="flex flex-wrap gap-1.5">{chosen.badges}</div>
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

const DAY_MS = 24 * 60 * 60 * 1000;

/** Завтра в 20:00 по МСК - в формате DateTimePicker. */
function defaultShowTime(): string {
  const tomorrow = toMskInput(new Date(Date.now() + DAY_MS).toISOString());
  return `${tomorrow.slice(0, 10)}T20:00`;
}

/** Новый матч: стороны (игроки 1×1 или команды 2×2), тип игроков и ×2 - и сразу к пикам-банам; шоу-матч - в расписание
    на дату. */
export function NewMatchForm({ liveMatchId = "", belt = null }: { liveMatchId?: string; belt?: Belt | null }) {
  const router = useRouter();
  const [format, setFormat] = React.useState<MatchFormat>(liveMatchId ? "show" : "match");
  const [mode, setMode] = React.useState<TournamentMode>("1x1");
  const [startsAt, setStartsAt] = React.useState(defaultShowTime);
  const [players, setPlayers] = React.useState<MatchPlayer[]>([]);
  const [teams, setTeams] = React.useState<MatchTeam[]>([]);
  const [pool, setPool] = React.useState<Registration[]>([]);
  const [first, setFirst] = React.useState<MatchPlayer | null>(null);
  const [second, setSecond] = React.useState<MatchPlayer | null>(null);
  const [teamSlots, setTeamSlots] = React.useState<[MatchTeam | null, MatchTeam | null]>([null, null]);
  // Новую команду заводят прямо в карточке стороны: name - то, что набрали в поиске.
  const [newTeam, setNewTeam] = React.useState<{ slot: 0 | 1; name: string } | null>(null);
  const [playerType, setPlayerType] = React.useState<PlayerType>("pvp");
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
    api.get<MatchTeam[]>("/match-teams").then(setTeams).catch(() => setErr("Не удалось загрузить команды."));
    api.get<Registration[]>("/registrations/pool").then(setPool).catch(() => setPool([]));
  }, []);

  const teamMode = mode === "2x2";
  const applicants = React.useMemo(() => new Set(pool.map((r) => r.userId)), [pool]);
  const order = first && second ? orderSides(first, second) : null;
  const [sideA, sideB] = order ? order.sides : [first, second];
  const [firstTeam, secondTeam] = teamSlots;
  const teamOrder = firstTeam && secondTeam ? orderSides(firstTeam, secondTeam) : null;
  const [teamA, teamB] = teamOrder ? teamOrder.sides : teamSlots;
  const hints = sideHints((teamMode ? teamOrder : order)?.why ?? "mmr", teamMode);

  const put = (p: MatchPlayer) => {
    if (!first) setFirst(p);
    else if (!second) setSecond(p);
  };

  // Команда из поиска встаёт в слот своей карточки, команда из заявок - в свободный.
  const putTeam = (t: MatchTeam, slot?: 0 | 1) => {
    setTeamSlots(([a, b]) => ((slot ?? (a ? 1 : 0)) === 0 ? [t, b] : [a, t]));
    setNewTeam(null);
  };
  const clearTeam = (t: MatchTeam | null) => setTeamSlots(([a, b]) => [a === t ? null : a, b === t ? null : b]);

  // У пары уже есть команда - берём её; если её завели в другой вкладке, список перечитываем.
  const takeExisting = async (teamKey: string, slot: 0 | 1) => {
    let t = teams.find((x) => x.teamKey === teamKey);
    if (!t) {
      const fresh = await api.get<MatchTeam[]>("/match-teams").catch(() => teams);
      setTeams(fresh);
      t = fresh.find((x) => x.teamKey === teamKey);
    }
    if (t) putTeam(t, slot);
  };

  const addPlayer = (p: MatchPlayer) => setPlayers((xs) => (xs.some((x) => x.id === p.id) ? xs : [...xs, p]));

  const createPlayer = async (nick: string, slot: "first" | "second") => {
    setBusy(true);
    setErr("");
    try {
      const p = await createPlaceholderPlayer(nick, players);
      addPlayer(p);
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
  const sides = teamMode
    ? teamA && teamB
      ? [{ teamKey: teamA.teamKey }, { teamKey: teamB.teamKey }]
      : null
    : sideA && sideB
      ? [{ userId: sideA.id }, { userId: sideB.id }]
      : null;
  const create = async () => {
    if (!sides) return;
    if (show && !startsAt) {
      setErr("Укажите дату и время шоу-матча.");
      return;
    }
    setBusy(true);
    setErr("");
    setLiveId("");
    try {
      const st = await api.post<MatchState>("/matches", {
        mode,
        playerType,
        format,
        rounds: roundCount,
        startsAt: show ? `${startsAt}:00+03:00` : undefined,
        prize: show ? prize.trim() : undefined,
        sides,
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
  const holder = belt?.holder ? players.find((p) => p.id === belt.holder?.userId) : undefined;
  const holderBadge = belt?.holder ? `Носитель пояса${belt.defenses ? ` · ★${belt.defenses}` : ""}` : "";
  // Пояс лиги разыгрывают только матчи 1×1.
  const note = !teamMode && sideA && sideB ? beltNote(belt, sideA, sideB, show) : "";
  const applied = <span className="badge badge-org"><span>Из заявки</span></span>;

  const playerChosen = (p: MatchPlayer | null): Chosen | null =>
    p && {
      name: p.displayName || p.login,
      season: `MMR ${p.mmr} · ${p.isNew ? "новичок сезона" : `${p.wins}–${p.losses} в сезоне`}`,
      badges: (
        <>
          {applicants.has(p.id) && applied}
          {p.priority && <span className="badge badge-champ"><span>Без очереди</span></span>}
          {p.isPlaceholder && <span className="badge badge-official"><span>Без входа</span></span>}
          {p.id === belt?.holder?.userId && <span className="badge badge-champ"><span>{holderBadge}</span></span>}
        </>
      ),
    };
  const teamChosen = (t: MatchTeam | null): Chosen | null =>
    t && {
      name: t.name,
      members: teamMembersLine(t),
      season: teamSeasonLine(t),
      badges: t.members.some((m) => applicants.has(m.userId)) && applied,
    };

  // Команда подаёт заявку, когда её подали оба игрока; если один - команду найдут поиском, она там сверху.
  const inTeams = new Set([firstTeam, secondTeam].flatMap((t) => t?.members.map((m) => m.userId) ?? []));
  const poolTeams = teams.filter((t) => t.members.every((m) => applicants.has(m.userId) && !inTeams.has(m.userId)));
  const nameA = teamMode ? teamA?.name : sideA && (sideA.displayName || sideA.login);
  const nameB = teamMode ? teamB?.name : sideB && (sideB.displayName || sideB.login);

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
          <div className="w-60 space-y-1.5">
            <span className="field-label">Начало (МСК)</span>
            <DateTimePicker value={startsAt} onChange={setStartsAt} />
          </div>
        )}
        <div className="space-y-1.5">
          <span className="field-label">Режим</span>
          <div className="seg">
            {(["1x1", "2x2"] as const).map((m) => (
              <button key={m} type="button" className="seg-btn" aria-pressed={mode === m} onClick={() => setMode(m)}>
                <span>{m === "1x1" ? "1×1" : "2×2"}</span>
              </button>
            ))}
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

      {teamMode ? (
        <div className="flex flex-col gap-4 lg:flex-row">
          {([teamA, teamB] as const).map((t, i) => {
            const slot = i === 0 ? 0 : 1;
            const rival = slot === 0 ? teamB : teamA;
            return (
              <SideCard
                key={slot}
                title={slot === 0 ? "Команда A" : "Команда B"}
                hint={hints[slot]}
                chosen={teamChosen(t)}
                tone={slot === 0 ? "primary" : "cyan"}
                onClear={() => clearTeam(t)}
              >
                {newTeam?.slot === slot ? (
                  <TeamForm
                    idPrefix={`side-${slot}-new-team`}
                    initialName={newTeam.name}
                    players={players}
                    applicants={applicants}
                    hide={new Set(rival?.members.map((m) => m.userId))}
                    onPlayer={addPlayer}
                    onSaved={(team) => {
                      setTeams((xs) => [team, ...xs]);
                      putTeam(team, slot);
                    }}
                    onExisting={(key) => void takeExisting(key, slot)}
                    onCancel={() => setNewTeam(null)}
                  />
                ) : (
                  <TeamPicker
                    inputId={`side-${slot}-team`}
                    teams={teams}
                    applicants={applicants}
                    rival={rival}
                    busy={busy}
                    onPick={(team) => putTeam(team, slot)}
                    onCreate={(name) => setNewTeam({ slot, name })}
                  />
                )}
              </SideCard>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <SideCard
            title="Игрок A"
            hint={hints[0]}
            chosen={playerChosen(sideA)}
            tone="primary"
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
            hint={hints[1]}
            chosen={playerChosen(sideB)}
            tone="cyan"
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
      )}

      {teamMode && poolTeams.length > 0 && (!firstTeam || !secondTeam) && (
        <Panel className="flex flex-wrap items-center gap-2 p-4">
          <span className="field-label mr-1">Заявки</span>
          {poolTeams.map((t) => (
            <button key={t.teamKey} type="button" className="chip transition hover:brightness-125" onClick={() => putTeam(t)}>
              <span>{t.name}</span>
              <span className="font-normal text-muted">{teamMembersLine(t)}</span>
            </button>
          ))}
          <span className="text-xs text-muted">заявку подали оба игрока — нажмите, команда встанет в свободный слот</span>
        </Panel>
      )}

      {!teamMode && !show && belt && holder && (!first || !second) && first?.id !== holder.id && second?.id !== holder.id && (
        <Panel className="flex flex-wrap items-center gap-2 p-4">
          <span className="field-label mr-1">Пояс</span>
          <button type="button" className="chip transition hover:brightness-125" onClick={() => put(holder)}>
            <span>Носитель: {holder.displayName || holder.login}</span>
            <span className="font-normal text-muted">
              ржавчина {belt.rust} из {belt.rustLimit}
            </span>
          </button>
          <span className="text-xs text-muted">нажмите — носитель встанет в свободный слот</span>
        </Panel>
      )}

      {!teamMode && freePool.length > 0 && (!first || !second) && (
        <Panel className="flex flex-wrap items-center gap-2 p-4">
          <span className="field-label mr-1">Заявки</span>
          {freePool.map((r) => {
            const p = players.find((x) => x.id === r.userId);
            if (!p) return null;
            return (
              <button key={r.id} type="button" className="chip transition hover:brightness-125" onClick={() => put(p)}>
                <span>{r.userDisplayName || r.userLogin}</span>
                {r.priority && <span className="font-normal text-gold">без очереди</span>}
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
            {sides ? `${nameA} vs ${nameB}` : teamMode ? "Выберите обе команды" : "Выберите обоих игроков"}
          </div>
          <div className="text-sm text-muted">
            {show ? "Шоу-матч · " : ""}
            {teamMode ? "2×2" : "1×1"} · {PLAYER_TYPES.find(([v]) => v === playerType)?.[1]} · {roundsLabel(roundCount)}
            {show && prize.trim() ? ` · приз: ${prize.trim()}` : ""}
          </div>
          <div className="text-xs text-muted">
            {show
              ? "Появится в расписании; начать его можно из пульта, когда придёт время"
              : `Название соберётся из ${teamMode ? "названий команд" : "ников"}, матч сразу станет текущим`}
          </div>
          {note && <div className="text-xs text-gold">{note}</div>}
          {roundCount === 3 && (
            <div className="text-xs text-muted">
              Пики-баны на три раунда: бан A → бан B → пик A → пик B, карту 3-го раунда выбирает чат
            </div>
          )}
        </div>
        <button type="button" className="btn btn-primary" disabled={!sides || busy || !!createdId} onClick={create}>
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
