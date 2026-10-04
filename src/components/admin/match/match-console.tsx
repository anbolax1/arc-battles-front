"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, errorText } from "@/lib/api";
import { useOverlayFeed } from "@/lib/ws";
import { matchSides, roundScore, stageLabel, totalScore } from "@/lib/match";
import { Panel } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ArrowLeftIcon, CheckIcon } from "@/components/icons";
import { OverlayStage } from "@/components/overlay/overlay-stage";
import { VetoBoard } from "@/components/admin/match/veto-board";
import { RoundConsole } from "@/components/admin/match/round-console";
import { MatchResult } from "@/components/admin/match/match-result";
import type { CatalogLegendary, MapInfo, MatchState } from "@/lib/types";

type Confirm = "finish" | "early" | "cancel" | null;

const STEPS = ["Стороны", "Пики-баны", "Матч", "Итог"];

function stepIndex(stage: MatchState["stage"]): number {
  if (stage === "veto" || stage === "ready") return 1;
  if (stage === "round") return 2;
  return 3;
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
  const [confirm, setConfirm] = React.useState<Confirm>(null);
  const actions = React.useRef(0);
  const feed = useOverlayFeed();
  const id = st.tournament.id;
  const sides = matchSides(st);
  const [a, b] = sides;
  const total = st.tournament.rounds?.length ?? 2;
  const focusId =
    feed.state?.tournamentId === id ? (feed.state?.currentParticipantId ?? a?.id ?? null) : (a?.id ?? null);

  // Матч могли вести из другой вкладки: при возврате к пульту подтягиваем свежее состояние.
  // Ответ, пришедший после нового действия ведущего, устарел - его отбрасываем.
  const refresh = React.useCallback(async () => {
    const at = actions.current;
    try {
      const next = await api.get<MatchState>(`/tournaments/${id}/match`);
      if (at === actions.current) setSt(next);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setGone(true);
    }
  }, [id]);

  React.useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  async function run(path: string, body?: unknown) {
    actions.current++;
    setBusy(true);
    setErr("");
    try {
      const next = await api.post<MatchState>(path, body);
      setSt(next);
      return next;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setGone(true);
      else {
        setErr(errorText(e));
        void refresh();
      }
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function creditLegendary(legendaryId: string, participantId: string) {
    const next = await run(`/tournaments/${id}/legendary`, { legendaryId, participantId });
    if (next) setLegendary((xs) => xs.map((l) => (l.id === legendaryId ? { ...l, status: "done" } : l)));
  }

  async function cancelMatch() {
    setBusy(true);
    setErr("");
    try {
      await api.post(`/tournaments/${id}/cancel`);
      router.push("/admin/matches");
    } catch (e) {
      setErr(errorText(e));
      setBusy(false);
    }
  }

  const lastRound = st.currentRound >= total;
  const scoreA = totalScore(st, a?.id);
  const scoreB = totalScore(st, b?.id);
  const leader = scoreA === scoreB ? null : scoreA > scoreB ? a : b;
  const pill =
    st.stage === "finished"
      ? ({ status: "ok", label: "Завершён" } as const)
      : st.stage === "round"
        ? ({ status: "live", label: "В эфире" } as const)
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
            <span className="chip"><span>{st.tournament.mode}</span></span>
            <span className="chip"><span>{st.tournament.playerType.toUpperCase()}</span></span>
            {st.tournament.ratingMultiplier === 2 && <span className="chip chip-cyan"><span>рейтинг ×2</span></span>}
            <span>{stageLabel(st.stage, st.currentRound || 1, total)}</span>
          </div>
        </div>
        <StatusPill status={pill.status}>{pill.label}</StatusPill>
      </div>

      <ol className="flex flex-wrap gap-2" aria-label="Шаги матча">
        {STEPS.map((label, i) => {
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

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          {(st.stage === "veto" || st.stage === "ready") && (
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
          )}

          {st.stage === "round" && (
            <>
              <RoundConsole
                st={st}
                sides={sides}
                legendary={legendary}
                focusId={focusId}
                busy={busy}
                onFocus={(pid) => run(`/tournaments/${id}/focus`, { participantId: pid })}
                onMark={(asg, by) => run(`/round-bonus-tasks/${asg}/mark`, { by })}
                onReroll={(asg) => run(`/round-bonus-tasks/${asg}/reroll`)}
                onPoints={(pid, delta, label) => run(`/tournaments/${id}/points`, { participantId: pid, delta, label })}
                onLegendary={creditLegendary}
                onUndo={() => run(`/tournaments/${id}/undo`)}
              />
              <Panel className="flex flex-wrap items-center gap-3 p-4">
                <span className="inline-flex items-center gap-2 text-sm text-muted">
                  <span className={`h-2 w-2 rounded-full ${feed.state ? "bg-ok" : "bg-danger"}`} />
                  {feed.state ? "Оверлей обновляется сам" : "Оверлей не на связи"}
                </span>
                <div className="ml-auto flex flex-wrap gap-2">
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
                </div>
              </Panel>
            </>
          )}

          {(st.stage === "veto" || st.stage === "ready") && (
            <div className="flex justify-end">
              <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setConfirm("cancel")}>
                <span>Отменить матч</span>
              </button>
            </div>
          )}

          {st.stage === "finished" && <MatchResult st={st} sides={sides} />}

          {err && <p className="text-sm text-danger">{err}</p>}
        </div>

        <aside className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="field-label">Оверлей сейчас</span>
            <Link href="/admin/overlay" className="text-xs text-accent hover:underline">
              Редактор оверлея →
            </Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-black/40">
            {feed.state ? (
              <OverlayStage state={feed.state} mode="preview" bgImage="/preview-bg.jpg" />
            ) : (
              <div className="flex aspect-video items-center justify-center text-sm text-muted">Оверлей пуст</div>
            )}
          </div>
          <Link href={`/tournament/${id}`} className="btn btn-ghost btn-sm w-full">
            <span>Публичная страница матча</span>
          </Link>
          {st.stage === "round" && (
            <p className="text-xs text-muted">
              Раунд {st.currentRound}: {roundScore(st, st.currentRound, a?.id)} : {roundScore(st, st.currentRound, b?.id)}
              {leader ? ` · ведёт ${leader.name}` : " · ничья"}
            </p>
          )}
        </aside>
      </div>

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
