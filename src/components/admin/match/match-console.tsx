"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, errorText } from "@/lib/api";
import { useOverlayFeed } from "@/lib/ws";
import { isShowMatch, matchSides, stageLabel, totalScore } from "@/lib/match";
import { Panel } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ArrowLeftIcon, CheckIcon } from "@/components/icons";
import { OverlayStage } from "@/components/overlay/overlay-stage";
import { VetoBoard } from "@/components/admin/match/veto-board";
import { MatchLog, OverlayStatus, RoundConsole } from "@/components/admin/match/round-console";
import { MatchResult } from "@/components/admin/match/match-result";
import { ScheduledPanel } from "@/components/admin/match/scheduled-panel";
import type { CatalogLegendary, LiveState, MapInfo, MatchState } from "@/lib/types";

type Confirm = "finish" | "early" | "cancel" | null;

const STEPS = ["Стороны", "Пики-баны", "Матч", "Итог"];
const SHOW_STEPS = ["Анонс", "Пики-баны", "Матч", "Итог"];

function stepIndex(stage: MatchState["stage"]): number {
  if (stage === "scheduled") return 0;
  if (stage === "veto" || stage === "ready") return 1;
  if (stage === "round") return 2;
  return 3;
}

/** Что сейчас видят зрители; во время раунда связь с оверлеем показана на табло, здесь не повторяем. */
function OverlayPeek({ state, matchId, status, pageLink }: { state: LiveState | null; matchId: string; status: boolean; pageLink: boolean }) {
  return (
    <Panel className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base uppercase">Оверлей сейчас</h3>
        <Link href="/admin/overlay" className="text-xs text-accent hover:underline">
          Редактор оверлея →
        </Link>
      </div>
      {status && <OverlayStatus online={!!state} />}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-black/40">
        {state ? (
          <OverlayStage state={state} mode="preview" bgImage="/preview-bg.jpg" />
        ) : (
          <div className="flex aspect-video items-center justify-center text-sm text-muted">Оверлей пуст</div>
        )}
      </div>
      {pageLink && (
        <Link href={`/tournament/${matchId}`} className="btn btn-ghost btn-sm w-full">
          <span>Публичная страница матча</span>
        </Link>
      )}
    </Panel>
  );
}

/** Матч, который уже идёт в эфире: сервер присылает его id в ответе 409. */
function conflictMatchId(e: unknown): string {
  if (!(e instanceof ApiError) || e.status !== 409) return "";
  try {
    return (JSON.parse(e.body) as { matchId?: string }).matchId ?? "";
  } catch {
    return "";
  }
}

/** Пульт матча: пики-баны, раунды с заданиями обеих сторон и итог на одной странице. */
export function MatchConsole({
  initial,
  maps,
  legendary: initialLegendary,
}: {
  initial: MatchState;
  maps: MapInfo[];
  legendary: CatalogLegendary[];
}) {
  const router = useRouter();
  const [st, setSt] = React.useState(initial);
  const [legendary, setLegendary] = React.useState(initialLegendary);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [gone, setGone] = React.useState(false);
  const [liveId, setLiveId] = React.useState("");
  const [confirm, setConfirm] = React.useState<Confirm>(null);
  const [pending, setPending] = React.useState(0);
  const actions = React.useRef(0);
  const queue = React.useRef<Promise<unknown>>(Promise.resolve());
  const inFlight = React.useRef(new Set<string>());
  const stepping = React.useRef(false);
  const feed = useOverlayFeed();
  const id = st.tournament.id;
  const sides = matchSides(st);
  const [a, b] = sides;
  const total = st.tournament.rounds?.length ?? 2;
  const focusId =
    feed.state?.tournamentId === id ? (feed.state?.currentParticipantId ?? a?.id ?? null) : (a?.id ?? null);

  // Запросы к матчу уходят строго по одному, в порядке нажатий: иначе «+3» и «Следующий раунд»
  // сервер мог бы обработать наоборот, а ответ на старый запрос перетёр бы новый счёт.
  const enqueue = React.useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(task);
    queue.current = next.catch(() => undefined);
    return next;
  }, []);

  // Матч могли вести из другой вкладки: при возврате к пульту подтягиваем свежее состояние.
  // Ответ, пришедший после нового действия ведущего, устарел - его отбрасываем.
  const refresh = React.useCallback(() => {
    const at = actions.current;
    return enqueue(async () => {
      try {
        const next = await api.get<MatchState>(`/tournaments/${id}/match`);
        if (at === actions.current) setSt(next);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) setGone(true);
      }
    });
  }, [id, enqueue]);

  React.useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  function send(path: string, body?: unknown) {
    actions.current++;
    setErr("");
    setLiveId("");
    setPending((n) => n + 1);
    return enqueue(async () => {
      try {
        const next = await api.post<MatchState>(path, body);
        setSt(next);
        return next;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) setGone(true);
        else {
          setErr(errorText(e));
          setLiveId(conflictMatchId(e));
          void refresh();
        }
        return null;
      } finally {
        setPending((n) => n - 1);
      }
    });
  }

  // Ход матча - раз за нажатие: второй «Следующий раунд» перескочил бы раунд. Гасит только свои кнопки.
  async function run(path: string, body?: unknown) {
    if (stepping.current) return null;
    stepping.current = true;
    setBusy(true);
    try {
      return await send(path, body);
    } finally {
      stepping.current = false;
      setBusy(false);
    }
  }

  // Зачёт кнопки не гасит: два нока подряд - это два «+3». Повтор по тому же заданию, пока первый
  // запрос не вернулся, отбрасываем - иначе задание попало бы в журнал дважды.
  async function act(path: string, body?: unknown, key?: string) {
    if (key && inFlight.current.has(key)) return null;
    if (key) inFlight.current.add(key);
    try {
      return await send(path, body);
    } finally {
      if (key) inFlight.current.delete(key);
    }
  }

  async function creditLegendary(legendaryId: string, participantId: string) {
    const next = await act(`/tournaments/${id}/legendary`, { legendaryId, participantId }, `legendary:${legendaryId}`);
    if (next) setLegendary((xs) => xs.map((l) => (l.id === legendaryId ? { ...l, status: "done" } : l)));
  }

  async function cancelMatch() {
    if (stepping.current) return;
    stepping.current = true;
    setBusy(true);
    setErr("");
    try {
      await enqueue(() => api.post(`/tournaments/${id}/cancel`));
      router.push("/admin/matches");
    } catch (e) {
      setErr(errorText(e));
      stepping.current = false;
      setBusy(false);
    }
  }

  const lastRound = st.currentRound >= total;
  const scoreA = totalScore(st, a?.id);
  const scoreB = totalScore(st, b?.id);
  const leader = scoreA === scoreB ? null : scoreA > scoreB ? a : b;
  const show = isShowMatch(st.tournament);
  const pill =
    st.stage === "finished"
      ? ({ status: "ok", label: "Завершён" } as const)
      : st.stage === "round"
        ? ({ status: "live", label: "В эфире" } as const)
        : st.stage === "scheduled"
          ? ({ status: "soon", label: "Запланирован" } as const)
          : ({ status: "soon", label: "Пики-баны" } as const);

  if (gone) {
    return (
      <Panel className="max-w-xl space-y-3 p-6">
        <h2 className="text-2xl">Матча больше нет</h2>
        <p className="text-sm text-muted">Его отменили, возможно, в другой вкладке. Рейтинг из-за него не менялся.</p>
        <Link href="/admin/matches" className="btn btn-primary btn-sm">
          <span>К матчам</span>
        </Link>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Link href="/admin/matches" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-fg">
            <ArrowLeftIcon className="h-4 w-4" /> Матчи
          </Link>
          <h2 className="truncate text-2xl sm:text-3xl">{st.tournament.title}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            {show && <span className="chip chip-cyan"><span>Шоу-матч</span></span>}
            <span className="chip"><span>{st.tournament.mode}</span></span>
            <span className="chip"><span>{st.tournament.playerType.toUpperCase()}</span></span>
            {st.tournament.ratingMultiplier === 2 && <span className="chip chip-cyan"><span>рейтинг ×2</span></span>}
            <span>{stageLabel(st.stage, st.currentRound || 1, total)}</span>
          </div>
        </div>
        <StatusPill status={pill.status}>{pill.label}</StatusPill>
      </div>

      <ol className="flex flex-wrap gap-2" aria-label="Шаги матча">
        {(show ? SHOW_STEPS : STEPS).map((label, i) => {
          const cur = stepIndex(st.stage);
          const done = i < cur;
          return (
            <li
              key={label}
              aria-current={i === cur ? "step" : undefined}
              className={`pill ${i === cur ? "pill-live" : done ? "pill-wait" : "pill-done"}`}
            >
              <span className="inline-flex items-center gap-1.5">
                {done ? <CheckIcon className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {st.stage === "scheduled" && (
        <ScheduledPanel
          st={st}
          sides={sides}
          busy={busy}
          onStart={() => run(`/tournaments/${id}/start`)}
          onReschedule={(iso) => run(`/tournaments/${id}/schedule`, { startsAt: iso })}
          onCancel={() => setConfirm("cancel")}
        />
      )}

      {(st.stage === "veto" || st.stage === "ready") && (
        <>
          <VetoBoard
            st={st}
            maps={maps}
            sides={sides}
            busy={busy}
            onPick={(code) => run(`/tournaments/${id}/veto`, { mapCode: code })}
            onUndo={() => run(`/tournaments/${id}/veto/undo`)}
            onManual={(codes) => run(`/tournaments/${id}/maps`, { maps: codes })}
            onStart={() => run(`/tournaments/${id}/rounds/next`)}
          />
          <div className="flex justify-end">
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirm("cancel")}>
              <span>Отменить матч</span>
            </button>
          </div>
        </>
      )}

      {st.stage === "round" && (
        <RoundConsole
          st={st}
          sides={sides}
          legendary={legendary}
          focusId={focusId}
          online={!!feed.state}
          saving={pending > 0}
          actions={
            <>
              <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirm("cancel")}>
                <span>Отменить матч</span>
              </button>
              {!lastRound && (
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setConfirm("early")}>
                  <span>Завершить досрочно</span>
                </button>
              )}
              {lastRound ? (
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => setConfirm("finish")}>
                  <span>Завершить матч</span>
                </button>
              ) : (
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(`/tournaments/${id}/rounds/next`)}>
                  <span>Следующий раунд →</span>
                </button>
              )}
            </>
          }
          onFocus={(pid) => act(`/tournaments/${id}/focus`, { participantId: pid })}
          onMark={(asg, by) => act(`/round-bonus-tasks/${asg}/mark`, { by }, `task:${asg}`)}
          onReroll={(asg) => act(`/round-bonus-tasks/${asg}/reroll`, undefined, `task:${asg}`)}
          onPoints={(pid, delta, label) => act(`/tournaments/${id}/points`, { participantId: pid, delta, label })}
          onLegendary={creditLegendary}
        />
      )}

      {st.stage === "finished" && <MatchResult st={st} sides={sides} />}

      {st.stage === "round" ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          <MatchLog log={st.log} onUndo={() => act(`/tournaments/${id}/undo`, undefined, "undo")} />
          <OverlayPeek state={feed.state} matchId={id} status={false} pageLink />
        </div>
      ) : (
        <div className="max-w-[440px]">
          <OverlayPeek state={feed.state} matchId={id} status pageLink={st.stage !== "finished"} />
        </div>
      )}

      {/* Кнопки хода матча вверху, а задания внизу: ошибка держится у нижнего края экрана, чтобы её заметили. */}
      {err && (
        <div role="alert" className="sticky bottom-4 z-20">
          <Panel className="flex flex-wrap items-center gap-3 border-[rgba(255,107,107,0.5)] bg-[#241517] px-4 py-3 text-sm text-danger">
            <span className="min-w-0 flex-1">{err}</span>
            {liveId && liveId !== id && (
              <Link href={`/admin/matches/${liveId}`} className="text-accent underline">
                Открыть текущий матч
              </Link>
            )}
            <button type="button" className="text-muted transition hover:text-fg" onClick={() => setErr("")} aria-label="Скрыть ошибку">
              ×
            </button>
          </Panel>
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "cancel" ? "Отменить матч?" : confirm === "early" ? "Завершить досрочно?" : "Завершить матч?"}
        message={
          confirm === "cancel"
            ? "Матч удалится, рейтинг не изменится. Игроки из заявок вернутся в пул."
            : `Счёт ${scoreA} : ${scoreB} — ${leader ? `побеждает ${leader.name}` : "ничья, MMR не меняется"}. MMR посчитается сразу.`
        }
        confirmLabel={confirm === "cancel" ? "Отменить матч" : "Завершить"}
        danger={confirm === "cancel"}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const what = confirm;
          setConfirm(null);
          if (what === "cancel") await cancelMatch();
          else await run(`/tournaments/${id}/finish`);
        }}
      />
    </div>
  );
}
