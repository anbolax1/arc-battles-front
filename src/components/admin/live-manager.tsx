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
import { minutesLabel } from "@/lib/format";
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

/** Награда контракта фиксирована: свой выполненный — +2, контракт противника — +1. */
const CONTRACT_OWN = 2;
const CONTRACT_OPP = 1;

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
  const [participantId, setParticipantId] = React.useState("");
  const [starterTasks, setStarterTasks] = React.useState<RoundStarterTask[]>([]);
  const [penalties, setPenalties] = React.useState<RoundPenalty[]>([]);
  const [bonusTasks, setBonusTasks] = React.useState<RoundBonusTask[]>([]);
  const [bonusPick, setBonusPick] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [layout, setLayout] = React.useState<OverlayLayout>(DEFAULT_LAYOUT);
  // Раскладка оверлея — ОБЩАЯ (одна на сайт, источник правды — сервер/live_state), не per-tournament.
  // Пока не загрузили её с сервера, не пушим состояние, чтобы дефолт не затёр реальную раскладку.
  const [layoutReady, setLayoutReady] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  // Фон превью (геймплей с HUD) — только для превью/редактора, на /overlay не влияет.
  const [previewBg, setPreviewBg] = React.useState<"day" | "night" | "off">("day");
  const bgImage = previewBg === "off" ? null : previewBg === "night" ? "/preview-bg-night.jpg" : "/preview-bg.jpg";

  // детали турнира. Ровно один раунд — авто-создан бэком при создании турнира.
  React.useEffect(() => {
    if (!selId) return;
    let active = true;
    (async () => {
      try {
        const t = await api.get<Tournament>(`/tournaments/${selId}`);
        if (!active) return;
        setDetail(t);
        setParticipantId(t.participants?.[0]?.id ?? "");
      } catch {
        if (active) setDetail(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [selId]);

  // Общая раскладка оверлея грузится с сервера один раз (не зависит от турнира/устройства).
  // Готовность (→ можно пушить состояние) ставим ТОЛЬКО при успешном ответе: при ошибке
  // держим layoutReady=false и ретраим — иначе дефолт затёр бы реальную раскладку на сервере.
  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      api
        .get<OverlayLayout>("/overlay/layout")
        .then((l) => {
          if (!active) return;
          if (l && Array.isArray(l.widgets)) setLayout(l); // пусто {} → оставляем дефолт (первый запуск)
          setLayoutReady(true);
        })
        .catch(() => {
          if (active) timer = setTimeout(load, 3000); // не узнали раскладку — ждём и пробуем снова, не пушим
        });
    };
    load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const participants = detail?.participants ?? [];
  const current = participants.find((p) => p.id === participantId) ?? null;
  // Единственный раунд турнира (один рейд).
  const round = detail?.rounds?.[0] ?? null;
  const roundId = round?.id ?? null;

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
  // Контракты фокусной стороны (владелец = participantId).
  const myContracts = bonusTasks.filter((b) => b.participantId === participantId);
  // Противник (другая сторона) и его контракты — фокусная сторона может выполнить их за +1.
  const opponent = participants.find((p) => p.id !== participantId) ?? null;
  const oppContracts = opponent ? bonusTasks.filter((b) => b.participantId === opponent.id) : [];
  // Протокол фокусной стороны (1 на игрока за турнир).
  const myPenalty = penalties.find((p) => p.participantId === participantId) ?? null;
  const compId = myPenalty?.complicationId ?? "";
  const locked = detail?.status === "finished"; // завершённый турнир — правки закрыты

  // Зачёт основного задания стороной pid: times из done[].
  const doneTimes = (t: RoundStarterTask, pid: string) => t.done.find((d) => d.participantId === pid)?.times ?? 0;

  // Очки контракта: свой выполненный (+2), контракт противника (+1), пусто — 0.
  function contractPoints(b: RoundBonusTask): number {
    if (!b.completedBy) return 0;
    return b.completedBy === b.participantId ? CONTRACT_OWN : CONTRACT_OPP;
  }

  // Очки за раунд для стороны pid: основные (per-side зачёт) + контракты (свой 2 / чужой 1).
  // Протоколы на очки НЕ влияют. База/percent/штрафы убраны.
  function roundEarnedFor(pid: string): number {
    const main = starterTasks
      .filter((t) => t.roundId === roundId)
      .reduce((s, t) => s + doneTimes(t, pid) * t.points, 0);
    const contracts = bonusTasks
      .filter((b) => b.participantId === pid)
      .reduce((s, b) => s + contractPoints(b), 0);
    return main + contracts;
  }
  const roundEarned = participantId ? roundEarnedFor(participantId) : 0; // фокусная сторона (мини-блок «Очки»)

  // Каталог для комбобокса добавления контракта: исключаем уже выданные этой стороне.
  const myContractTaskIds = new Set(myContracts.map((b) => b.taskId));
  const availableContracts = bonusCatalog.filter((t) => !myContractTaskIds.has(t.id));
  const contractNum = new Map(bonusCatalog.map((t, i) => [t.id, i + 1]));
  // Номер протокола = позиция в общем каталоге (для поиска по чату «протокол 10»).
  const compItems = complications.map((c, i) => ({ id: c.id, num: i + 1, text: c.text }));
  const contractItems = availableContracts.map((t) => ({ id: t.id, num: contractNum.get(t.id) ?? 0, text: t.text }));

  // ── Богатые данные для модульных виджетов оверлея ──
  // Основные задания: completed = у фокусной стороны зачтено хотя бы раз.
  const liveRoundTasks = roundStarterTasks.map((t) => ({
    id: t.id,
    text: t.text,
    points: t.points,
    completed: doneTimes(t, participantId) > 0,
  }));
  // Контракты для оверлея: свои (фокусной стороны, +2) + контракты противника (+1, опция в виджете).
  // Подсветка (times>0) — когда ФОКУСНАЯ сторона получила балл: свой выполнен владельцем; чужой украден.
  const liveBonusTasks = [
    ...myContracts.map((b) => ({
      text: b.text,
      points: CONTRACT_OWN,
      valueType: "fixed" as const,
      times: b.completedBy === b.participantId ? 1 : 0,
      who: current?.name ?? "",
      opponent: false,
    })),
    ...oppContracts.map((b) => ({
      text: b.text,
      points: CONTRACT_OPP,
      valueType: "fixed" as const,
      times: b.completedBy === participantId ? 1 : 0,
      who: opponent?.name ?? "",
      opponent: true,
    })),
  ];
  // Протоколы обеих сторон: минуты = число нарушений (на очки не влияют).
  const liveComplications = participants
    .map((p) => {
      const pen = penalties.find((x) => x.participantId === p.id);
      if (!pen) return null;
      const c = complications.find((x) => x.id === pen.complicationId);
      if (!c) return null;
      const t = pen.times;
      // penalty несёт минуты (= нарушения) — виджет показывает плашку «×N»; valueType fixed.
      return { who: p.name, text: c.text, penalty: t, valueType: "fixed" as const, times: t, minutes: t };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  // Порядок сторон в оверлее ФИКСИРОВАН по seed (как добавляли), а не по очкам —
  // иначе команды прыгают местами при изменении счёта. (participants с бэка идут по очкам.)
  const standings = [...participants]
    .sort((a, b) => a.seed - b.seed)
    .map((p) => ({ participantId: p.id, name: p.name, points: p.totalPoints, roundPoints: roundEarnedFor(p.id) }));

  // Протокол фокусной стороны в оверлее (одиночное поле complication).
  const focusComp = myPenalty ? complications.find((c) => c.id === myPenalty.complicationId) ?? null : null;
  const state: LiveState = {
    tournamentId: detail?.id ?? null,
    tournamentName: detail ? tournamentName(detail) : "",
    status: detail?.status ?? "",
    mode: detail?.mode ?? "",
    currentRound: 1,
    totalRounds: 1,
    currentParticipantId: participantId || null,
    currentName: current?.name ?? "",
    currentPoints: current?.totalPoints ?? 0,
    tasks: [],
    complication: focusComp && myPenalty
      ? {
          who: current?.name ?? "",
          text: focusComp.text,
          penalty: myPenalty.times,
          valueType: "fixed",
          times: myPenalty.times,
          minutes: myPenalty.times,
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
    // Не пушим, пока не загрузили общую раскладку с сервера — иначе дефолт затрёт реальную.
    if (!pushSig || !layoutReady) return;
    const body = JSON.parse(pushSig);
    const t = setTimeout(() => {
      void api.put("/overlay/state", body).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [pushSig, layoutReady]);

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
      setMsg("Турнир выведен в эфир. Прошлые эфиры переведены в «Скоро».");
    } catch (e) {
      setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось вывести в эфир.");
    } finally {
      setBusy(false);
    }
  }

  // Выбор протокола фокусной стороны (сохраняется на сервере; '' — снять).
  async function setProtocol(complicationId: string) {
    if (!roundId || !participantId) return;
    setBusy(true);
    setMsg("");
    try {
      await api.post(`/rounds/${roundId}/protocol`, { participantId, complicationId });
      await reloadCounters();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось изменить протокол.");
    } finally {
      setBusy(false);
    }
  }

  // Счётчик нарушений протокола (= минуты штрафа).
  async function adjustViolations(delta: number) {
    if (!roundId || !participantId) return;
    setBusy(true);
    setMsg("");
    try {
      await api.post(`/rounds/${roundId}/protocol/violations`, { participantId, delta });
      await reloadCounters();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось изменить нарушения.");
    } finally {
      setBusy(false);
    }
  }

  // Per-side зачёт основного задания.
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

  // Раздать стороне случайные контракты (по умолчанию 2).
  async function dealContracts() {
    if (!roundId || !participantId) return;
    setBusy(true);
    setMsg("");
    try {
      await api.post(`/rounds/${roundId}/contracts/deal`, { participantId });
      await reloadCounters();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось раздать контракты.");
    } finally {
      setBusy(false);
    }
  }

  // Добавить конкретный контракт стороне вручную.
  async function addContract() {
    if (!roundId || !participantId || !bonusPick) return;
    setBusy(true);
    setMsg("");
    try {
      await api.post(`/rounds/${roundId}/bonus-tasks`, { participantId, taskId: bonusPick });
      setBonusPick("");
      await reloadCounters();
    } catch (e) {
      setMsg(e instanceof ApiError ? (e.status === 409 ? "Этот контракт у участника уже есть." : e.body || e.message) : "Не удалось добавить.");
    } finally {
      setBusy(false);
    }
  }

  // Отметить контракт: свой (+2) / противник (+1) / сброс.
  async function completeContract(id: string, by: "owner" | "opponent" | "none") {
    setBusy(true);
    setMsg("");
    try {
      await api.post(`/round-bonus-tasks/${id}/complete`, { by });
      await reloadCounters();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.body || e.message : "Не удалось изменить контракт.");
    } finally {
      setBusy(false);
    }
  }

  async function removeContract(id: string) {
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
                Турнир <span className="font-semibold">завершён</span> — правки закрыты (очки, задания, контракты). Чтобы менять, верни его в эфир кнопкой «Вывести в эфир».
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

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <span>1 раунд · 1 рейд</span>
                {round?.map ? (
                  <>
                    <span>·</span>
                    <span>{round.map}</span>
                  </>
                ) : null}
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
                <label className="field-label">Протокол этой стороны (в оверлее)</label>
                <CatalogCombobox
                  items={compItems}
                  value={compId}
                  onChange={setProtocol}
                  placeholder="№ или текст (напр. из чата «протокол 10»)"
                  allowNone
                  noneLabel="— без протокола —"
                />
              </div>
            </Panel>

            <Panel className="space-y-3 p-4">
              <h3 className="font-display text-base uppercase">Очки · {current?.name}</h3>
              <div className="flex gap-2.5">
                <div className="flex-1 rounded-md bg-surface-2 p-3 text-center shadow-[inset_0_0_0_1px_var(--border)]">
                  <div className="text-[0.62rem] uppercase tracking-wide text-muted">За раунд</div>
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
              <h3 className="font-display text-lg uppercase">Основные задания</h3>
              {roundStarterTasks.length ? (
                <ul className="space-y-2">
                  {roundStarterTasks.map((t) => {
                    const times = doneTimes(t, participantId);
                    return (
                      <li key={t.id} className="flex items-center justify-between gap-3 bg-surface-2 p-2.5 shadow-[inset_0_0_0_1px_var(--border)]">
                        <span className="min-w-0 text-sm">
                          {t.text}
                          <span className="ml-2 text-xs text-muted">+{t.points} × {times}</span>
                        </span>
                        <Stepper value={times} busy={busy || locked} onDelta={(d) => adjustTask(t.id, d)} />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted">На раунд заданий не назначено (назначить — в «Расписании»).</p>
              )}
            </Panel>

            <Panel className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg uppercase">Контракты · {current?.name}</h3>
                <button type="button" className="btn btn-cyan btn-sm" disabled={busy || locked} onClick={dealContracts}>
                  <span>Раздать 2</span>
                </button>
              </div>
              {myContracts.length ? (
                <ul className="space-y-2">
                  {myContracts.map((b) => {
                    const own = b.completedBy === b.participantId;
                    const opp = !!b.completedBy && !own;
                    return (
                      <li key={b.id} className={`flex flex-wrap items-center justify-between gap-2 bg-surface-2 p-2.5 shadow-[inset_0_0_0_1px_var(--border)] ${b.completedBy ? "opacity-90" : ""}`}>
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="mr-1 text-muted tnum">{contractNum.get(b.taskId)}.</span>
                          {b.text}
                          {own && <span className="ml-2 text-xs text-primary-2">✓ зачтено +{CONTRACT_OWN}</span>}
                          {opp && <span className="ml-2 text-xs text-accent">противник зачёл +{CONTRACT_OPP}</span>}
                        </span>
                        <span className="flex flex-none items-center gap-1.5">
                          {own ? (
                            <button type="button" className="btn btn-sm btn-cyan" aria-pressed={true} title="нажми, чтобы снять зачёт" disabled={busy || locked} onClick={() => completeContract(b.id, "none")}>
                              <span>✓ Зачтено +{CONTRACT_OWN}</span>
                            </button>
                          ) : (
                            <button type="button" className="btn btn-sm btn-cyan" title={opp ? "зачесть владельцу — автоматически снимет балл у противника" : undefined} disabled={busy || locked} onClick={() => completeContract(b.id, "owner")}>
                              <span>{opp ? "Зачесть (снять у против.)" : "Зачесть"}</span>
                            </button>
                          )}
                          <button type="button" className="text-muted transition hover:text-danger" disabled={busy} title="Убрать" onClick={() => removeContract(b.id)}>
                            ✕
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted">У этой стороны пока нет контрактов. Раздай случайные кнопкой «Раздать 2» или добавь вручную ниже.</p>
              )}
              {opponent && oppContracts.length > 0 && (
                <div className="space-y-2 border-t border-[var(--border)] pt-3">
                  <h4 className="font-display text-sm uppercase text-muted">Контракты противника · {opponent.name}</h4>
                  <ul className="space-y-2">
                    {oppContracts.map((b) => {
                      const stolen = b.completedBy === participantId; // фокусная сторона выполнила чужой контракт (+1)
                      const ownerDid = b.completedBy === b.participantId; // владелец выполнил свой → красть нельзя
                      return (
                        <li key={b.id} className={`flex flex-wrap items-center justify-between gap-2 bg-surface-2 p-2.5 shadow-[inset_0_0_0_1px_var(--border)] ${ownerDid ? "opacity-60" : ""}`}>
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="mr-1 text-muted tnum">{contractNum.get(b.taskId)}.</span>
                            {b.text}
                            {stolen && <span className="ml-2 text-xs text-accent">✓ {current?.name} +{CONTRACT_OPP}</span>}
                            {ownerDid && <span className="ml-2 text-xs text-muted">владелец выполнил</span>}
                          </span>
                          <span className="flex flex-none items-center gap-1.5">
                            {!ownerDid &&
                              (stolen ? (
                                <button type="button" className="btn btn-sm btn-cyan" aria-pressed={true} title="нажми, чтобы снять зачёт" disabled={busy || locked} onClick={() => completeContract(b.id, "none")}>
                                  <span>✓ Зачтено +{CONTRACT_OPP}</span>
                                </button>
                              ) : (
                                <button type="button" className="btn btn-sm btn-cyan" disabled={busy || locked} onClick={() => completeContract(b.id, "opponent")}>
                                  <span>Зачесть +{CONTRACT_OPP}</span>
                                </button>
                              ))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-[0.7rem] text-muted">Засчитывается за +{CONTRACT_OPP}, только если владелец сам не выполнил свой контракт. Если владелец выполнит — этот балл отменяется.</p>
                </div>
              )}
              <div className="space-y-1.5 border-t border-[var(--border)] pt-3">
                <span className="field-label">Добавить контракт вручную</span>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <CatalogCombobox items={contractItems} value={bonusPick} onChange={setBonusPick} placeholder="№ или текст контракта" />
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy || locked || !bonusPick} onClick={addContract}>
                    <span>Добавить</span>
                  </button>
                </div>
              </div>
            </Panel>

            <Panel className="space-y-3 p-5">
              <h3 className="font-display text-lg uppercase">Протокол · {current?.name}</h3>
              {myPenalty && focusComp ? (
                <div className="flex items-center justify-between gap-3 bg-surface-2 p-2.5 shadow-[inset_0_0_0_1px_var(--border)]">
                  <span className="min-w-0 text-sm">
                    {focusComp.text}
                    <span className="ml-2 text-xs text-muted">
                      штраф: {minutesLabel(myPenalty.times)} (на очки не влияет)
                    </span>
                  </span>
                  <Stepper value={myPenalty.times} busy={busy || locked} onDelta={adjustViolations} />
                </div>
              ) : (
                <p className="text-sm text-muted">Выбери протокол этой стороны выше — появится счётчик нарушений (минут).</p>
              )}
            </Panel>

            {msg && <p className="text-sm text-accent">{msg}</p>}
          </div>

          <div className="space-y-3 lg:sticky lg:top-4 self-start">
            <div className="flex items-center justify-between gap-2">
              <span className="field-label">{editing ? "Редактор макета" : "Превью оверлея (обновляется само)"}</span>
              {!editing && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={!layoutReady}
                  title={layoutReady ? undefined : "Загружаем раскладку с сервера…"}
                  onClick={() => setEditing(true)}
                >
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
              <OverlayEditor state={state} layout={layout} onChange={setLayout} onClose={() => setEditing(false)} bgImage={bgImage} />
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
