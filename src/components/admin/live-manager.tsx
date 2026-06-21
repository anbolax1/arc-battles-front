"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { Panel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OverlayStage } from "@/components/overlay/overlay-stage";
import { OverlayEditor } from "@/components/admin/overlay-editor";
import { CatalogCombobox } from "@/components/admin/catalog-combobox";
import { DEFAULT_LAYOUT } from "@/components/overlay/default-layout";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { tournamentName } from "@/lib/display";
import { complicationPenalty, taskReward } from "@/lib/format";
import type {
  CatalogComplication,
  CatalogTask,
  LiveState,
  OverlayLayout,
  RoundBonusTask,
  RoundPenalty,
  RoundStarterTask,
  Tournament,
} from "@/lib/types";

/** Счётчик «−  N  +». */
function Stepper({ value, onDelta, busy }: { value: number; onDelta: (d: number) => void; busy: boolean }) {
  return (
    <span className="flex flex-none items-center gap-1.5">
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy || value <= 0} onClick={() => onDelta(-1)} aria-label="убавить">
        <span>−</span>
      </button>
      <span className="w-7 text-center font-display tnum">{value}</span>
      <button type="button" className="btn btn-cyan btn-sm" disabled={busy} onClick={() => onDelta(1)} aria-label="прибавить">
        <span>+</span>
      </button>
    </span>
  );
}

/** Ссылка на оверлей для вставки в OBS + кнопка копирования. */
function OverlayLink() {
  const [url, setUrl] = React.useState("/overlay");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    // origin доступен только на клиенте после монтирования (иначе рассинхрон гидрации).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(`${window.location.origin}/overlay`);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard может быть недоступен */
    }
  };

  return (
    <div className="space-y-1">
      <span className="field-label">Ссылка для OBS (Browser Source)</span>
      <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] py-1 pl-2.5 pr-1">
        <code className="flex-1 truncate text-xs text-[var(--muted)]">{url}</code>
        <button
          type="button"
          onClick={copy}
          aria-label="скопировать ссылку"
          title={copied ? "Скопировано" : "Скопировать ссылку"}
          className={`flex h-7 w-7 flex-none items-center justify-center rounded-md transition-colors ${
            copied
              ? "text-[var(--accent)]"
              : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)]"
          }`}
        >
          {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
        </button>
      </div>
      <details className="mt-1.5 text-xs text-[var(--muted)]">
        <summary className="cursor-pointer select-none hover:text-[var(--fg)]">Как добавить в OBS</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-4 leading-relaxed">
          <li>В OBS, в блоке «Источники», нажмите «+» → «Браузер».</li>
          <li>Создайте новый источник (например «Оверлей турнира») → «ОК».</li>
          <li>В поле «URL-адрес» вставьте ссылку выше (кнопка копирования).</li>
          <li>Ширина — 1920, высота — 1080 (под размер вашей сцены).</li>
          <li>Поставьте галочку «Обновлять браузер, когда сцена становится активной» → «ОК».</li>
          <li>
            Оверлей обновляется сам во время эфира. Если завис — правый клик по источнику → «Обновить».
          </li>
        </ol>
      </details>
    </div>
  );
}

type PerParticipant = Record<string, string>; // participantId -> complicationId

function loadLive(tid: string): { roundNum?: number; comp?: PerParticipant } | null {
  try {
    const raw = localStorage.getItem(`rsp_live_${tid}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveLive(tid: string, data: { roundNum: number; comp: PerParticipant }) {
  try {
    localStorage.setItem(`rsp_live_${tid}`, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function loadLayout(tid: string): OverlayLayout | null {
  try {
    const raw = localStorage.getItem(`rsp_layout_${tid}`);
    const v = raw ? (JSON.parse(raw) as OverlayLayout) : null;
    return v && Array.isArray(v.widgets) ? v : null;
  } catch {
    return null;
  }
}
function saveLayout(tid: string, layout: OverlayLayout) {
  try {
    localStorage.setItem(`rsp_layout_${tid}`, JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

export function LiveManager({
  tournaments,
  complications,
  bonusCatalog,
}: {
  tournaments: Tournament[];
  complications: CatalogComplication[];
  bonusCatalog: CatalogTask[];
}) {
  const [tours, setTours] = React.useState<Tournament[]>(tournaments);
  // По умолчанию показываем турнир, который уже в эфире.
  const initialSel = tournaments.find((t) => t.status === "live")?.id ?? tournaments[0]?.id ?? "";
  const [selId, setSelId] = React.useState(initialSel);
  const [detail, setDetail] = React.useState<Tournament | null>(null);
  const [roundNum, setRoundNum] = React.useState(1);
  const [participantId, setParticipantId] = React.useState("");
  const [compByPart, setCompByPart] = React.useState<PerParticipant>({});
  const [starterTasks, setStarterTasks] = React.useState<RoundStarterTask[]>([]);
  const [penalties, setPenalties] = React.useState<RoundPenalty[]>([]);
  const [bonusTasks, setBonusTasks] = React.useState<RoundBonusTask[]>([]);
  const [bonusPick, setBonusPick] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [layout, setLayout] = React.useState<OverlayLayout>(DEFAULT_LAYOUT);
  const [editing, setEditing] = React.useState(false);
  // Фон превью (геймплей с HUD) — только для превью/редактора, на /overlay не влияет.
  const [previewBg, setPreviewBg] = React.useState<"day" | "night" | "off">("day");
  const bgImage = previewBg === "off" ? null : previewBg === "night" ? "/preview-bg-night.jpg" : "/preview-bg.jpg";

  // детали турнира + восстановление сохранённого состояния (раунд, усложнения по участникам)
  React.useEffect(() => {
    if (!selId) return;
    let active = true;
    (async () => {
      try {
        let t = await api.get<Tournament>(`/tournaments/${selId}`);
        // Авто-создание недостающих раундов (1..totalRounds), чтобы в эфире можно было
        // работать с любым раундом — иначе зачёт/задания на «несозданный» раунд молча не идут.
        const have = new Set((t.rounds ?? []).map((r) => r.number));
        const missing: number[] = [];
        for (let n = 1; n <= (t.totalRounds || 0); n++) if (!have.has(n)) missing.push(n);
        if (missing.length) {
          await Promise.all(missing.map((n) => api.post(`/tournaments/${t.id}/rounds`, { number: n, status: "pending" }).catch(() => {})));
          t = await api.get<Tournament>(`/tournaments/${selId}`);
        }
        if (!active) return;
        setDetail(t);
        setParticipantId(t.participants?.[0]?.id ?? "");
        const saved = loadLive(t.id);
        setRoundNum(saved?.roundNum && saved.roundNum >= 1 ? saved.roundNum : 1);
        setCompByPart(saved?.comp ?? {});
        setLayout(loadLayout(t.id) ?? DEFAULT_LAYOUT);
      } catch {
        if (active) setDetail(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [selId]);

  const participants = detail?.participants ?? [];
  const current = participants.find((p) => p.id === participantId) ?? null;
  const compId = participantId ? compByPart[participantId] ?? "" : "";
  const comp = complications.find((c) => c.id === compId) ?? null;
  const totalRounds = detail?.totalRounds ?? 0;
  const roundId = detail?.rounds?.find((r) => r.number === roundNum)?.id ?? null;

  // персист раунда + усложнений по участникам
  React.useEffect(() => {
    if (detail?.id) saveLive(detail.id, { roundNum, comp: compByPart });
  }, [detail?.id, roundNum, compByPart]);

  // персист раскладки оверлея (на турнир)
  React.useEffect(() => {
    if (detail?.id) saveLayout(detail.id, layout);
  }, [detail?.id, layout]);

  // счётчики/задания турнира
  React.useEffect(() => {
    if (!detail?.id) return;
    let active = true;
    (async () => {
      try {
        const [st, pen, bon] = await Promise.all([
          api.get<RoundStarterTask[]>(`/tournaments/${detail.id}/starter-tasks`),
          api.get<RoundPenalty[]>(`/tournaments/${detail.id}/penalties`),
          api.get<RoundBonusTask[]>(`/tournaments/${detail.id}/bonus-tasks`),
        ]);
        if (!active) return;
        setStarterTasks(st);
        setPenalties(pen);
        setBonusTasks(bon);
      } catch {
        if (active) {
          setStarterTasks([]);
          setPenalties([]);
          setBonusTasks([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [detail?.id]);

  const roundStarterTasks = starterTasks.filter((t) => t.roundId === roundId);
  const roundPenalties = penalties.filter((p) => p.roundId === roundId && p.participantId === participantId);
  // Все бонусные этой стороны — для дедупа в селекте «добавить» (бонусные не повторяются за турнир).
  const myBonusAll = bonusTasks.filter((b) => b.participantId === participantId);
  const myBonusIds = new Set(myBonusAll.map((b) => b.taskId));
  const availableBonus = bonusCatalog.filter((t) => !myBonusIds.has(t.id));
  // Номер = позиция в общем каталоге (как в правилах/эфире), чтобы по чату «усложнение 10»
  // организатор быстро находил нужное в комбобоксе (поиск по номеру или тексту).
  const bonusNum = new Map(bonusCatalog.map((t, i) => [t.id, i + 1]));
  const compItems = complications.map((c, i) => ({ id: c.id, num: i + 1, text: c.text, meta: complicationPenalty(c) }));
  const bonusItems = availableBonus.map((t) => ({ id: t.id, num: bonusNum.get(t.id) ?? 0, text: t.text, meta: taskReward(t) }));
  // В раунде показываем: добавленные в этот раунд (любые) + невыполненные из прошлых раундов (перенос).
  // Зачтённое хотя бы раз в любом раунде дальше не переносится — в следующих раундах его не показываем.
  const myBonus = myBonusAll
    .filter((b) => b.roundNumber === roundNum || (b.times === 0 && b.roundNumber < roundNum))
    .sort((a, b) => (a.times > 0 ? 1 : 0) - (b.times > 0 ? 1 : 0) || a.roundNumber - b.roundNumber);
  const activeBonusCount = myBonus.filter((b) => b.times === 0).length;
  const locked = detail?.status === "finished"; // завершённый турнир — правки закрыты

  // Очки за текущий раунд для стороны pid: старт.задания + бонусы − штрафы этого раунда.
  // База убрана; percent считается от заработанного (старт + fixed-бонусы), как в бэкенд-пересчёте.
  function roundEarnedFor(pid: string): number {
    const eb =
      starterTasks.filter((t) => t.completedBy === pid).reduce((s, t) => s + t.times * t.points, 0) +
      bonusTasks.filter((b) => b.participantId === pid && b.valueType === "fixed").reduce((s, b) => s + b.times * b.points, 0);
    const pf = (p: number) => Math.round((eb * p) / 100);
    const st = starterTasks
      .filter((t) => t.roundId === roundId && t.completedBy === pid)
      .reduce((s, t) => s + t.times * t.points, 0);
    const bn = bonusTasks
      .filter((b) => b.participantId === pid && b.roundNumber === roundNum)
      .reduce((s, b) => s + (b.valueType === "percent" ? b.times * pf(b.points) : b.times * b.points), 0);
    const pn = penalties
      .filter((p) => p.roundId === roundId && p.participantId === pid)
      .reduce((s, p) => s + (p.valueType === "percent" ? p.times * pf(p.penalty) : p.times * p.penalty), 0);
    return st + bn - pn;
  }
  const roundEarned = participantId ? roundEarnedFor(participantId) : 0; // фокусная сторона (мини-блок «Очки»)

  const penaltyRows: Array<{ id: string; text: string; penalty: number; valueType: "fixed" | "percent"; times: number }> =
    roundPenalties.map((p) => ({ id: p.complicationId, text: p.text, penalty: p.penalty, valueType: p.valueType, times: p.times }));
  if (comp && !penaltyRows.some((r) => r.id === comp.id)) {
    penaltyRows.push({ id: comp.id, text: comp.text, penalty: comp.penalty, valueType: comp.valueType, times: 0 });
  }

  // Богатые данные для модульных виджетов (Фаза 3): задания/бонусы фокусной стороны
  // + усложнения ОБЕИХ сторон. Источник — те же данные, что уже грузит «Эфир».
  const liveRoundTasks = roundStarterTasks.map((t) => ({
    id: t.id,
    text: t.text,
    points: t.points,
    completed: t.completedBy === participantId && t.times > 0,
  }));
  const liveBonusTasks = myBonus.map((b) => ({
    text: b.text,
    points: b.points,
    valueType: b.valueType,
    times: b.times,
    who: current?.name ?? "",
  }));
  const liveComplications = participants
    .map((p) => {
      const c = complications.find((x) => x.id === compByPart[p.id]);
      if (!c) return null;
      const times =
        penalties.find((pen) => pen.roundId === roundId && pen.participantId === p.id && pen.complicationId === c.id)?.times ?? 0;
      return { who: p.name, text: c.text, penalty: c.penalty, valueType: c.valueType, times };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  // Порядок сторон в оверлее ФИКСИРОВАН по seed (как добавляли), а не по очкам —
  // иначе команды прыгают местами при изменении счёта. (participants с бэка идут по очкам.)
  const standings = [...participants]
    .sort((a, b) => a.seed - b.seed)
    .map((p) => ({ participantId: p.id, name: p.name, points: p.totalPoints, roundPoints: roundEarnedFor(p.id) }));
  const state: LiveState = {
    tournamentId: detail?.id ?? null,
    tournamentName: detail ? tournamentName(detail) : "",
    status: detail?.status ?? "",
    mode: detail?.mode ?? "",
    currentRound: roundNum,
    totalRounds,
    currentParticipantId: participantId || null,
    currentName: current?.name ?? "",
    currentPoints: current?.totalPoints ?? 0,
    tasks: [],
    complication: comp
      ? {
          who: current?.name ?? "",
          text: comp.text,
          penalty: comp.penalty,
          valueType: comp.valueType,
          times: roundPenalties.find((p) => p.complicationId === comp.id)?.times ?? 0,
        }
      : null,
    standings,
    roundTasks: liveRoundTasks,
    bonusTasks: liveBonusTasks,
    complications: liveComplications,
    layout,
  };

  // авто-отправка состояния в оверлей (OBS + сайт), debounce. Кнопки «Обновить» нет.
  const pushSig = detail ? JSON.stringify(state) : "";
  React.useEffect(() => {
    if (!pushSig) return;
    const body = JSON.parse(pushSig);
    const t = setTimeout(() => {
      void api.put("/overlay/state", body).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [pushSig]);

  async function reloadCounters() {
    if (!detail?.id) return;
    const [t, st, pen, bon] = await Promise.all([
      api.get<Tournament>(`/tournaments/${detail.id}`),
      api.get<RoundStarterTask[]>(`/tournaments/${detail.id}/starter-tasks`),
      api.get<RoundPenalty[]>(`/tournaments/${detail.id}/penalties`),
      api.get<RoundBonusTask[]>(`/tournaments/${detail.id}/bonus-tasks`),
    ]);
    setDetail(t);
    setStarterTasks(st);
    setPenalties(pen);
    setBonusTasks(bon);
  }

  async function goLive() {
    if (!detail) return;
    setBusy(true);
    setMsg("");
    try {
      await api.patch(`/tournaments/${detail.id}`, { status: "live" });
      setDetail({ ...detail, status: "live" });
      setTours((xs) => xs.map((x) => (x.id === detail.id ? { ...x, status: "live" } : x.status === "live" ? { ...x, status: "upcoming" } : x)));
      await syncRounds(roundNum);
      setMsg("Турнир выведен в эфир. Прошлые эфиры переведены в «Скоро».");
    } catch (e) {
      setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось вывести в эфир.");
    } finally {
      setBusy(false);
    }
  }

  // Статусы раундов считаются автоматически от выбранного: текущий — «идёт»,
  // предыдущие — «завершён», следующие — «ожидание». Без ручного завершения.
  async function syncRounds(n: number) {
    const rounds = detail?.rounds ?? [];
    const want = (num: number) => (num < n ? "finished" : num === n ? "live" : "pending");
    const changed = rounds.filter((r) => r.status !== want(r.number));
    if (!changed.length) return;
    await Promise.all(changed.map((r) => api.patch(`/rounds/${r.id}`, { status: want(r.number) })));
    await reloadCounters();
  }

  async function selectRound(n: number) {
    setRoundNum(n);
    if (detail?.status === "live") {
      try {
        await syncRounds(n);
      } catch {
        /* ignore */
      }
    }
  }

  function setComp(cid: string) {
    setCompByPart((m) => ({ ...m, [participantId]: cid }));
  }

  async function adjustTask(asgId: string, delta: number) {
    if (!participantId) return;
    setBusy(true);
    setMsg("");
    try {
      await api.post(`/round-starter-tasks/${asgId}/count`, { participantId, delta });
      await reloadCounters();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось изменить зачёт.");
    } finally {
      setBusy(false);
    }
  }

  async function adjustPenalty(complicationId: string, delta: number) {
    if (!roundId || !participantId) return;
    setBusy(true);
    setMsg("");
    try {
      await api.post(`/rounds/${roundId}/penalties/count`, { participantId, complicationId, delta });
      await reloadCounters();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось изменить штраф.");
    } finally {
      setBusy(false);
    }
  }

  async function addBonus() {
    if (!roundId || !participantId || !bonusPick) return;
    setBusy(true);
    setMsg("");
    try {
      await api.post(`/rounds/${roundId}/bonus-tasks`, { participantId, taskId: bonusPick });
      setBonusPick("");
      await reloadCounters();
    } catch (e) {
      setMsg(e instanceof ApiError ? (e.status === 409 ? "Это бонусное у участника уже есть." : e.body || e.message) : "Не удалось добавить.");
    } finally {
      setBusy(false);
    }
  }

  async function adjustBonus(id: string, delta: number) {
    setBusy(true);
    setMsg("");
    try {
      // roundId — чтобы зачёт «приземлился» на текущий раунд: перенесённое задание
      // засчитывается там, где его фактически зачли, а не где добавили.
      await api.post(`/round-bonus-tasks/${id}/count`, { delta, roundId });
      await reloadCounters();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось изменить зачёт.");
    } finally {
      setBusy(false);
    }
  }

  async function removeBonus(id: string) {
    setBusy(true);
    setMsg("");
    try {
      await api.del(`/round-bonus-tasks/${id}`);
      await reloadCounters();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось убрать.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl">Эфир</h2>
        {tours.length > 0 && (
          <select className="select max-w-xs" value={selId} onChange={(e) => setSelId(e.target.value)}>
            {tours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.status === "live" ? "🔴 " : ""}
                {tournamentName(t)}
              </option>
            ))}
          </select>
        )}
      </div>

      {!tours.length ? (
        <EmptyState title="Нет турниров" hint="Создайте турнир и участников в «Расписании»." />
      ) : !detail ? (
        <Panel className="px-5 py-10 text-center text-muted">Загрузка…</Panel>
      ) : !participants.length ? (
        <EmptyState title="Нет участников" hint="Добавьте участников турнира в «Расписании»." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            {locked && (
              <Panel className="border-l-2 border-danger bg-[rgba(255,107,107,0.1)] p-4 text-sm">
                Турнир <span className="font-semibold">завершён</span> — правки закрыты (очки, задания, штрафы). Чтобы менять, верни его в эфир кнопкой «Вывести в эфир».
              </Panel>
            )}
            <Panel className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-lg uppercase">Что в эфире</h3>
                {detail.status === "live" ? (
                  <span className="pill pill-live">
                    <span className="live-dot" aria-hidden />
                    <span>В эфире</span>
                  </span>
                ) : (
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={goLive}>
                    <span>Вывести в эфир</span>
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="field-label">Раунд</span>
                <div className="seg flex-wrap">
                  {Array.from({ length: Math.max(totalRounds, 1) }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" className="seg-btn" aria-pressed={roundNum === n} disabled={busy} onClick={() => selectRound(n)}>
                      <span>{n}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="field-label" htmlFor="lm-part">Сторона в фокусе</label>
                <select id="lm-part" className="select" value={participantId} onChange={(e) => setParticipantId(e.target.value)}>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.totalPoints} оч.
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="field-label">Усложнение этой стороны (в оверлее)</label>
                <CatalogCombobox
                  items={compItems}
                  value={compId}
                  onChange={setComp}
                  placeholder="№ или текст (напр. из чата «усложнение 10»)"
                  allowNone
                  noneLabel="— без усложнения —"
                />
              </div>
            </Panel>

            <Panel className="space-y-3 p-4">
              <h3 className="font-display text-base uppercase">Очки · {current?.name}</h3>
              <div className="flex gap-2.5">
                <div className="flex-1 rounded-md bg-surface-2 p-3 text-center shadow-[inset_0_0_0_1px_var(--border)]">
                  <div className="text-[0.62rem] uppercase tracking-wide text-muted">За раунд {roundNum}</div>
                  <div className="font-display text-2xl leading-tight tnum text-primary-2">
                    {roundEarned > 0 ? `+${roundEarned}` : roundEarned}
                  </div>
                </div>
                <div className="flex-1 rounded-md bg-surface-2 p-3 text-center shadow-[inset_0_0_0_1px_var(--border)]">
                  <div className="text-[0.62rem] uppercase tracking-wide text-muted">Всего по турниру</div>
                  <div className="font-display text-2xl leading-tight tnum">{current?.totalPoints ?? 0}</div>
                </div>
              </div>
            </Panel>

            <Panel className="space-y-3 p-5">
              <h3 className="font-display text-lg uppercase">Стартовые задания · раунд {roundNum}</h3>
              {roundStarterTasks.length ? (
                <ul className="space-y-2">
                  {roundStarterTasks.map((t) => {
                    const mine = t.completedBy === participantId;
                    const shownTimes = mine ? t.times : 0;
                    return (
                      <li key={t.id} className="flex items-center justify-between gap-3 bg-surface-2 p-2.5 shadow-[inset_0_0_0_1px_var(--border)]">
                        <span className="min-w-0 text-sm">
                          {t.text}
                          <span className="ml-2 text-xs text-muted">+{t.points} × {shownTimes}</span>
                          {t.completedBy && !mine && <span className="ml-2 text-xs text-accent">(другой стороне)</span>}
                        </span>
                        <Stepper value={shownTimes} busy={busy || locked} onDelta={(d) => adjustTask(t.id, d)} />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted">На раунд {roundNum} заданий не назначено (раскидать — в «Расписании»).</p>
              )}
            </Panel>

            <Panel className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg uppercase">Бонусные · {current?.name}</h3>
                <span className="text-xs text-muted">активных: {activeBonusCount}</span>
              </div>
              {myBonus.length ? (
                <ul className="space-y-2">
                  {myBonus.map((b) => {
                    const carried = b.times === 0 && b.roundNumber < roundNum;
                    return (
                      <li key={b.id} className={`flex items-center justify-between gap-3 bg-surface-2 p-2.5 shadow-[inset_0_0_0_1px_var(--border)] ${b.times > 0 ? "opacity-80" : ""}`}>
                        <span className="min-w-0 text-sm">
                          <span className="mr-1 text-muted tnum">{bonusNum.get(b.taskId)}.</span>
                          {b.text}
                          <span className="ml-2 text-xs text-muted">{taskReward({ points: b.points, valueType: b.valueType })} × {b.times}</span>
                          {carried ? (
                            <span className="ml-2 text-xs text-accent">↺ перенос из Р{b.roundNumber}</span>
                          ) : (
                            <span className="ml-2 text-xs text-muted">Р{b.roundNumber}</span>
                          )}
                        </span>
                        <span className="flex flex-none items-center gap-2">
                          <Stepper value={b.times} busy={busy || locked} onDelta={(d) => adjustBonus(b.id, d)} />
                          <button type="button" className="text-muted transition hover:text-danger" disabled={busy} title="Убрать" onClick={() => removeBonus(b.id)}>
                            ✕
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted">У этой стороны пока нет бонусных заданий.</p>
              )}
              <div className="space-y-1.5 border-t border-[var(--border)] pt-3">
                <span className="field-label">Добавить бонусное на раунд {roundNum}</span>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <CatalogCombobox items={bonusItems} value={bonusPick} onChange={setBonusPick} placeholder="№ или текст бонусного" />
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy || locked || !bonusPick} onClick={addBonus}>
                    <span>Добавить</span>
                  </button>
                </div>
              </div>
            </Panel>

            <Panel className="space-y-3 p-5">
              <h3 className="font-display text-lg uppercase">Штрафы · раунд {roundNum}</h3>
              {penaltyRows.length ? (
                <ul className="space-y-2">
                  {penaltyRows.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 bg-surface-2 p-2.5 shadow-[inset_0_0_0_1px_var(--border)]">
                      <span className="min-w-0 text-sm">
                        {p.text}
                        <span className="ml-2 text-xs text-muted">
                          {complicationPenalty({ penalty: p.penalty, valueType: p.valueType })}
                          {p.valueType === "percent" ? " от суммы" : ""} × {p.times}
                        </span>
                      </span>
                      <Stepper value={p.times} busy={busy || locked} onDelta={(d) => adjustPenalty(p.id, d)} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Выбери усложнение этой стороны выше — появится счётчик нарушений.</p>
              )}
            </Panel>

            {msg && <p className="text-sm text-accent">{msg}</p>}
          </div>

          <div className="space-y-3 lg:sticky lg:top-4 self-start">
            <div className="flex items-center justify-between gap-2">
              <span className="field-label">{editing ? "Редактор макета" : "Превью оверлея (обновляется само)"}</span>
              {!editing && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                  <span>✏️ Редактировать макет</span>
                </button>
              )}
            </div>
            {/* Фон превью (геймплей с HUD) — оценить читаемость оверлея поверх игры.
                На сам оверлей в OBS НЕ влияет (там фон прозрачный). */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted">Фон игры в превью:</span>
              <div className="seg">
                {([["day", "День"], ["night", "Ночь"], ["off", "Выкл"]] as const).map(([k, lbl]) => (
                  <button key={k} type="button" className="seg-btn" aria-pressed={previewBg === k} onClick={() => setPreviewBg(k)}>
                    <span>{lbl}</span>
                  </button>
                ))}
              </div>
            </div>
            {editing ? (
              <OverlayEditor key={detail?.id} state={state} layout={layout} onChange={setLayout} onClose={() => setEditing(false)} bgImage={bgImage} tid={detail?.id} />
            ) : (
              <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-black/40">
                <OverlayStage state={state} mode="preview" bgImage={bgImage} />
              </div>
            )}
            <OverlayLink />
          </div>
        </div>
      )}
    </div>
  );
}
