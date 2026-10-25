"use client";

import * as React from "react";
import { Panel } from "@/components/ui/card";
import { CheckIcon } from "@/components/icons";
import {
  KNOCK_POINTS,
  loadoutLabel,
  memberScore,
  roundBreakdown,
  roundScore,
  taskDescription,
  taskKindLabel,
  taskTitle,
  teamPlayers,
  totalScore,
  type TeamPlayer,
} from "@/lib/match";
import type { CatalogLegendary, MatchLogEntry, MatchState, Participant, Round, RoundBonusTask } from "@/lib/types";

/** Цвета сторон как на табло: A - оранжевая, B - бирюзовая. */
const SIDE_STYLE = [
  {
    letter: "A",
    text: "text-primary-2",
    edge: "border-t-[var(--primary)]",
    tag: "pts-orange",
    knock: "text-primary-2 [&::before]:bg-[rgba(255,106,26,0.1)] [&::before]:shadow-[inset_0_0_0_1px_rgba(255,106,26,0.55)]",
    raid: "bg-[var(--primary)] text-[#1a0c02]",
    ring: "shadow-[0_0_0_2px_rgba(255,106,26,0.85),0_0_28px_-8px_rgba(255,106,26,0.7)]",
  },
  {
    letter: "B",
    text: "text-accent",
    edge: "border-t-[var(--accent)]",
    tag: "pts-cyan",
    knock: "text-accent [&::before]:bg-[rgba(34,211,238,0.08)] [&::before]:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.55)]",
    raid: "bg-[var(--accent)] text-[#04232a]",
    ring: "shadow-[0_0_0_2px_rgba(34,211,238,0.85),0_0_28px_-8px_rgba(34,211,238,0.6)]",
  },
] as const;

const KIND_STYLE: Record<string, string> = {
  Задание: "bg-[rgba(255,106,26,0.16)] text-primary-2 shadow-[inset_0_0_0_1px_rgba(255,106,26,0.35)]",
  "На карту": "bg-[rgba(34,211,238,0.12)] text-accent shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]",
  Протокол: "bg-[rgba(192,38,211,0.14)] text-[#e070ff] shadow-[inset_0_0_0_1px_rgba(192,38,211,0.34)]",
};

function SideTag({ i }: { i: 0 | 1 }) {
  return (
    <span className={`pts ${SIDE_STYLE[i].tag}`}>
      <span>{SIDE_STYLE[i].letter}</span>
    </span>
  );
}

/** Метка стороны в рейде: её задания и счёт сейчас показывает оверлей. */
function RaidLabel({ i }: { i: 0 | 1 }) {
  return (
    <span className={`inline-flex flex-none items-center gap-2 rounded px-2.5 py-1.5 font-display text-sm uppercase leading-none ${SIDE_STYLE[i].raid}`}>
      <span className="h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden />В рейде
    </span>
  );
}

/** Связь с оверлеем: без неё зрители не видят того, что меняется в пульте. */
export function OverlayStatus({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className={`h-2 w-2 flex-none rounded-full ${online ? "bg-ok" : "bg-danger"}`} aria-hidden />
      {online ? "Оверлей на связи" : "Оверлей не на связи"}
    </span>
  );
}

function RoundCard({
  st,
  r,
  now,
  sides,
  fixing,
  onPick,
}: {
  st: MatchState;
  r: Round;
  now: boolean;
  sides: [Participant | null, Participant | null];
  fixing: boolean;
  /** Выбрать раунд для правки завершённого матча; нет - раунд не выбрать. */
  onPick?: () => void;
}) {
  const [a, b] = sides;
  const cls = `flex w-full items-center justify-between gap-3 rounded-md px-3.5 py-2 text-left ${
    now ? "bg-[rgba(255,106,26,0.12)] shadow-[inset_0_0_0_1px_rgba(255,106,26,0.45)]" : "bg-surface-2 shadow-[inset_0_0_0_1px_var(--border)]"
  }`;
  const body = (
    <>
      <div className="min-w-0">
        <div className={`font-display text-[0.68rem] uppercase ${now ? "text-primary-2" : "text-muted"}`}>
          Раунд {r.number}
          {now ? (fixing ? " · правка" : " · идёт") : r.status === "finished" ? " · сыгран" : fixing ? " · не сыгран" : " · впереди"}
        </div>
        <div className="truncate text-sm">
          {r.map || "—"} <span className="text-xs text-muted">· {loadoutLabel(st.tournament, r.number)}</span>
        </div>
      </div>
      <span className={`flex-none font-display text-lg tnum ${r.status === "pending" ? "text-muted" : ""}`}>
        {r.status === "pending" ? "—" : `${roundScore(st, r.number, a?.id)} : ${roundScore(st, r.number, b?.id)}`}
      </span>
    </>
  );
  return onPick ? (
    <button
      type="button"
      aria-pressed={now}
      onClick={onPick}
      className={`${cls} ${now ? "" : "transition hover:shadow-[inset_0_0_0_1px_rgba(255,106,26,0.45)]"}`}
    >
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Задание стороны: что сделать слева, зачёт справа. Задания соперника не засчитываются. Задание команды 2×2
    общее, но засчитывается один раз - тому игроку, кто его выполнил. */
function TaskRow({
  t,
  players,
  onMark,
  onReroll,
}: {
  t: RoundBonusTask;
  /** Игроки команды 2×2; у стороны из одного игрока - пусто. */
  players: TeamPlayer[];
  onMark: (id: string, by: "owner" | "none", userId?: string) => void;
  /** Нет - задание не перебросить: раунд уже сыгран. */
  onReroll?: (id: string) => void;
}) {
  const kind = taskKindLabel(t);
  const done = !!t.completedBy;
  const desc = taskDescription(t);
  const doneBy = players.find((pl) => pl.userId === t.completedUserId)?.name;
  const markClass =
    "btn btn-sm flex-none text-ok [&::before]:bg-[rgba(52,211,153,0.12)] [&::before]:shadow-[inset_0_0_0_1px_rgba(52,211,153,0.5)]";
  return (
    <div
      className={`flex items-center gap-3 rounded-md px-3 py-2 ${
        done ? "bg-[rgba(52,211,153,0.08)] shadow-[inset_0_0_0_1px_rgba(52,211,153,0.4)]" : "bg-surface-2 shadow-[inset_0_0_0_1px_var(--border)]"
      }`}
    >
      <div className="min-w-0 flex-1">
        {/* Плашка и название - один абзац: длинное название переносится по словам рядом с плашкой, а не уходит под неё целиком. */}
        <p className="text-[0.95rem] font-semibold leading-snug">
          <span className={`badge mr-2 ${KIND_STYLE[kind]}`}>
            <span>
              {kind} · {t.points}
              {t.category === "protocol" ? " · до 15:00" : ""}
            </span>
          </span>
          «{taskTitle(t)}»
        </p>
        {desc && <p className="mt-0.5 text-sm leading-snug text-muted">{desc}</p>}
      </div>
      {done ? (
        <>
          <span className="inline-flex min-w-0 flex-none items-center gap-1.5 text-sm font-semibold text-ok">
            <CheckIcon className="h-4 w-4" />+{t.points}
            {doneBy && <span className="max-w-[7rem] truncate font-normal">· {doneBy}</span>}
          </span>
          <button
            type="button"
            className="min-h-[36px] flex-none px-1 text-sm text-muted underline transition hover:text-fg"
            onClick={() => onMark(t.id, "none")}
          >
            Отменить
          </button>
        </>
      ) : (
        <>
          {players.length ? (
            <div className="flex flex-none flex-col gap-1.5">
              {players.map((pl) => (
                <button
                  key={pl.userId}
                  type="button"
                  className={markClass}
                  onClick={() => onMark(t.id, "owner", pl.userId)}
                  title={`Выполнил ${pl.name}: +${t.points}`}
                  aria-label={`Засчитать «${taskTitle(t)}» игроку ${pl.name}, +${t.points}`}
                >
                  <CheckIcon />
                  <span className="max-w-[6.5rem] truncate">{pl.name}</span>
                </button>
              ))}
            </div>
          ) : (
            // Кнопка узкая, без слова: место в строке отдано названию задания.
            <button
              type="button"
              className={markClass}
              onClick={() => onMark(t.id, "owner")}
              title={`Засчитать: +${t.points}`}
              aria-label={`Засчитать «${taskTitle(t)}», +${t.points}`}
            >
              <CheckIcon />
              <span>+{t.points}</span>
            </button>
          )}
          {onReroll && (
            <button
              type="button"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-surface text-muted transition hover:text-fg"
              onClick={() => onReroll(t.id)}
              title="Перебросить задание"
              aria-label={`Перебросить задание «${taskTitle(t)}»`}
            >
              ↻
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** Ручные очки ведущего без ноков: правка на месте числа. */
function ManualPoints({ value, who, onChange }: { value: number; who?: string; onChange: (delta: number, label: string) => void }) {
  const step =
    "flex h-9 w-9 items-center justify-center rounded-md bg-surface-2 text-lg leading-none text-muted shadow-[inset_0_0_0_1px_var(--border)] transition hover:text-fg disabled:cursor-not-allowed disabled:opacity-30";
  return (
    <span className="flex flex-none items-center gap-1.5" role="group" aria-label={who ? `Ручные очки: ${who}` : "Ручные очки"}>
      <span className="field-label">Ручные</span>
      <button
        type="button"
        className={step}
        disabled={value <= 0}
        onClick={() => onChange(-1, "поправка")}
        title={value > 0 ? "Убрать 1 ручное очко" : "Ручных очков нет - убирать нечего"}
        aria-label="Убрать 1 ручное очко"
      >
        −
      </button>
      <span className={`w-6 text-center font-display text-xl leading-none tnum ${value ? "" : "text-muted"}`}>{value}</span>
      <button type="button" className={step} onClick={() => onChange(1, "ручные очки")} aria-label="Добавить 1 ручное очко">
        +
      </button>
    </span>
  );
}

/** Нок и ручные очки: у стороны 1×1 - её, у команды 2×2 - отдельно у каждого игрока (who - его ник). */
function ScoreRow({
  knocks,
  manual,
  knockClass,
  who,
  onKnock,
  onPoints,
}: {
  knocks: number;
  manual: number;
  knockClass: string;
  who?: string;
  onKnock: (delta: 1 | -1) => void;
  onPoints: (delta: number, label: string) => void;
}) {
  // Промежутки шире обычных - под скос кнопок: иначе угол «Нока» заходит на соседей.
  return (
    <div className="flex items-center gap-3">
      {who && (
        <span className="w-24 flex-none truncate font-display text-sm uppercase" title={who}>
          {who}
        </span>
      )}
      <button
        type="button"
        className="flex h-[42px] w-10 flex-none items-center justify-center rounded-md bg-surface-2 text-lg text-muted shadow-[inset_0_0_0_1px_var(--border)] transition hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
        disabled={knocks <= 0}
        onClick={() => onKnock(-1)}
        title={knocks > 0 ? "Снять ошибочный нок" : "Ноков нет - снимать нечего"}
        aria-label={who ? `Снять нок: ${who}` : "Снять нок"}
      >
        −
      </button>
      <button
        type="button"
        className={`btn min-w-[96px] flex-1 ${knockClass}`}
        onClick={() => onKnock(1)}
        title={`Нок ${who ?? "рейдера"}: +${KNOCK_POINTS} очка`}
      >
        <span>Нок{knocks > 0 ? ` · ${knocks}` : ""}</span>
      </button>
      <ManualPoints value={manual} who={who} onChange={onPoints} />
    </div>
  );
}

function LegendaryPicker({
  available,
  players,
  onPick,
}: {
  available: CatalogLegendary[];
  /** Игроки команды 2×2: легендарка на счету того, кто её выполнил. */
  players: TeamPlayer[];
  onPick: (legendaryId: string, userId?: string) => void;
}) {
  const pick = "btn btn-sm text-gold [&::before]:shadow-[inset_0_0_0_1px_rgba(255,197,61,0.45)]";
  return (
    <div className="space-y-2 rounded-md bg-[rgba(255,197,61,0.06)] p-3 shadow-[inset_0_0_0_1px_rgba(255,197,61,0.25)]">
      <span className="field-label text-gold">Легендарные — +10, один раз навсегда</span>
      {available.length ? (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {available.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2">
              <span className="min-w-[200px] flex-1 text-sm">{l.text}</span>
              {players.length ? (
                players.map((pl) => (
                  <button key={pl.userId} type="button" className={pick} title={`Выполнил ${pl.name}`} onClick={() => onPick(l.id, pl.userId)}>
                    <span className="max-w-[7rem] truncate">{pl.name}</span>
                  </button>
                ))
              ) : (
                <button type="button" className={pick} onClick={() => onPick(l.id)}>
                  <span>Засчитать</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Доступных легендарок не осталось.</p>
      )}
    </div>
  );
}

/** Журнал матча: последние действия ведущего, последнее можно отменить. */
export function MatchLog({ log, onUndo }: { log: MatchLogEntry[]; onUndo: () => void }) {
  return (
    <Panel className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-base uppercase">Журнал матча</h3>
        <button type="button" className="btn btn-ghost btn-sm" disabled={!log.length} onClick={onUndo}>
          <span>↶ Отменить последнее</span>
        </button>
      </div>
      {log.length ? (
        <ol className="space-y-1.5">
          {log.slice(0, 10).map((e) => (
            <li key={e.id} className="flex items-center gap-3 text-sm">
              <span className="chip py-0.5 text-[0.68rem]">Р{e.roundNumber}</span>
              <span className="min-w-0 flex-1">{e.text}</span>
              <span className={`font-display tnum ${e.delta > 0 ? "text-ok" : e.delta < 0 ? "text-danger" : "text-muted"}`}>
                {e.delta > 0 ? `+${e.delta}` : e.delta < 0 ? `−${Math.abs(e.delta)}` : "·"}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">Пока пусто — здесь появятся зачёты, ручные очки и легендарки.</p>
      )}
    </Panel>
  );
}

/** Идущий раунд: табло с ходом матча и панели сторон с очками и заданиями. */
export function RoundConsole({
  st,
  sides,
  legendary,
  focusId,
  online,
  saving,
  actions,
  fix,
  onFocus,
  onMark,
  onReroll,
  onKnock,
  onPoints,
  onLegendary,
}: {
  st: MatchState;
  sides: [Participant | null, Participant | null];
  legendary: CatalogLegendary[];
  focusId: string | null;
  online: boolean;
  /** Есть запросы, на которые сервер ещё не ответил. */
  saving: boolean;
  /** Кнопки хода матча: следующий игрок или раунд, завершение, отмена. */
  actions: React.ReactNode;
  /** Правка завершённого матча: раунд выбирают среди сыгранных, рейда и переброса заданий нет. */
  fix?: { round: number; onRound: (round: number) => void };
  onFocus: (participantId: string) => void;
  /** userId - игрок команды 2×2, которому засчитан зачёт; у стороны из одного игрока его нет. */
  onMark: (id: string, by: "owner" | "none", userId?: string) => void;
  onReroll: (id: string) => void;
  onKnock: (participantId: string, delta: 1 | -1, userId?: string) => void;
  onPoints: (participantId: string, delta: number, label: string, userId?: string) => void;
  onLegendary: (legendaryId: string, participantId: string, userId?: string) => void;
}) {
  const [legFor, setLegFor] = React.useState<string | null>(null);
  const round = fix?.round ?? (st.currentRound || 1);
  const rounds = [...(st.tournament.rounds ?? [])].sort((a, b) => a.number - b.number);
  const [a, b] = sides;
  const available = legendary.filter((l) => l.status === "available");

  return (
    <div className="space-y-3">
      <Panel>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-5 pb-3 pt-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <SideTag i={0} />
            <span className="truncate font-display text-xl uppercase text-primary-2 sm:text-2xl">{a?.name ?? "—"}</span>
          </div>
          <div className="flex items-center gap-3 font-display text-4xl leading-none tnum" aria-label="Счёт матча">
            <span className="text-primary-2">{totalScore(st, a?.id)}</span>
            <span className="text-2xl text-muted">:</span>
            <span className="text-accent">{totalScore(st, b?.id)}</span>
          </div>
          <div className="flex min-w-0 flex-row-reverse items-center gap-2.5">
            <SideTag i={1} />
            <span className="truncate font-display text-xl uppercase text-accent sm:text-2xl">{b?.name ?? "—"}</span>
          </div>
        </div>

        <div className={`grid gap-2 px-5 pb-4 ${rounds.length > 2 ? "md:grid-cols-3" : "sm:grid-cols-2"}`}>
          {rounds.map((r) => (
            <RoundCard
              key={r.id}
              st={st}
              r={r}
              now={r.number === round}
              sides={sides}
              fixing={!!fix}
              onPick={fix && r.status === "finished" ? () => fix.onRound(r.number) : undefined}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[var(--border)] bg-surface-2/50 px-5 py-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {fix ? (
              <span className="text-xs text-muted">Матч завершён: каждая правка сразу пересчитывает победителя, MMR и нашивки</span>
            ) : (
              <OverlayStatus online={online} />
            )}
            {/* Проявляется с задержкой: быстрый ответ сервера её не покажет, и панель не мигает на каждый клик. */}
            <span
              aria-hidden
              className={`text-xs text-muted transition-opacity ${saving ? "opacity-100 delay-500 duration-300" : "opacity-0 duration-0"}`}
            >
              Сохраняем…
            </span>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{actions}</div>
        </div>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-2">
        {sides.map((p, i) => {
          if (!p) return null;
          const side = i === 0 ? 0 : 1;
          const style = SIDE_STYLE[side];
          const tasks = st.tasks.filter((t) => t.roundNumber === round && t.participantId === p.id);
          const done = tasks.filter((t) => t.completedBy === p.id).length;
          const parts = roundBreakdown(st, round, p.id);
          const raiding = !fix && focusId === p.id;
          const players = teamPlayers(p);
          const name = (
            <>
              <SideTag i={side} />
              <span className="truncate font-display text-lg uppercase decoration-2 underline-offset-4 group-hover:underline">{p.name}</span>
            </>
          );
          return (
            <Panel key={p.id} className={`flex flex-col border-t-[3px] transition-shadow ${style.edge} ${raiding ? style.ring : ""}`}>
              <div className="space-y-2.5 px-4 pb-3 pt-3">
                <div className="flex items-center gap-3">
                  {fix ? (
                    <div className="flex min-w-0 items-center gap-2.5">{name}</div>
                  ) : (
                    <button
                      type="button"
                      className="group flex min-w-0 items-center gap-2.5 text-left"
                      aria-pressed={raiding}
                      onClick={() => onFocus(p.id)}
                      title={raiding ? `${p.name} сейчас в рейде` : `Перевести рейд на ${p.name}`}
                    >
                      {name}
                    </button>
                  )}
                  {raiding && <RaidLabel i={side} />}
                  <div className="ml-auto flex flex-none items-baseline gap-2">
                    <span className="field-label">Раунд {round}</span>
                    <span className={`font-display text-3xl leading-none tnum ${style.text}`}>{roundScore(st, round, p.id)}</span>
                  </div>
                </div>
                {players.length ? (
                  players.map((pl) => {
                    const own = memberScore(st, round, p.id, pl.userId);
                    return (
                      <ScoreRow
                        key={pl.userId}
                        who={pl.name}
                        knocks={own.knocks}
                        manual={own.manual}
                        knockClass={style.knock}
                        onKnock={(delta) => onKnock(p.id, delta, pl.userId)}
                        onPoints={(delta, label) => onPoints(p.id, delta, label, pl.userId)}
                      />
                    );
                  })
                ) : (
                  <ScoreRow
                    knocks={parts.knocks}
                    manual={parts.manual}
                    knockClass={style.knock}
                    onKnock={(delta) => onKnock(p.id, delta)}
                    onPoints={(delta, label) => onPoints(p.id, delta, label)}
                  />
                )}
              </div>

              <div className="space-y-2 border-t border-[var(--border)] px-4 pb-4 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="field-label">Задания раунда</span>
                  {tasks.length > 0 && (
                    <span className="text-xs text-muted tnum">
                      выполнено {done} из {tasks.length}
                    </span>
                  )}
                </div>
                {tasks.length ? (
                  tasks.map((t) => <TaskRow key={t.id} t={t} players={players} onMark={onMark} onReroll={fix ? undefined : onReroll} />)
                ) : (
                  <p className="text-sm text-muted">Задания раунда не выданы — пул каталога пуст для этой карты и типа игроков.</p>
                )}
                <button
                  type="button"
                  className="flex min-h-[40px] w-full items-center justify-between gap-3 rounded-md border border-dashed border-[rgba(255,197,61,0.35)] px-3 text-left transition hover:bg-[rgba(255,197,61,0.06)]"
                  aria-expanded={legFor === p.id}
                  onClick={() => setLegFor((x) => (x === p.id ? null : p.id))}
                >
                  <span className="font-display text-xs uppercase text-gold">+ Легендарка +10</span>
                  <span className="text-xs text-muted">один раз за всё время</span>
                </button>
                {legFor === p.id && (
                  <LegendaryPicker
                    available={available}
                    players={players}
                    onPick={(id, userId) => {
                      onLegendary(id, p.id, userId);
                      setLegFor(null);
                    }}
                  />
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
