"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/modal";
import { Panel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TournamentStatusPill } from "@/components/domain/tournament-status-pill";
import { StarterTaskBoard } from "@/components/admin/starter-task-board";
import { DateTimePicker } from "@/components/admin/date-time-picker";
import { UserCombobox, type PickedMember } from "@/components/admin/user-combobox";
import { Avatar } from "@/components/ui/avatar";
import { registrationMatches, tournamentName } from "@/lib/display";
import { fmtDate, fmtTime } from "@/lib/format";
import type { Participant, Registration, Round, Tournament, User } from "@/lib/types";

const STATUSES = [
  { value: "draft", label: "Черновик" },
  { value: "upcoming", label: "Скоро" },
  { value: "live", label: "В эфире" },
  { value: "finished", label: "Завершён" },
];

// ISO-дата → «YYYY-MM-DDTHH:mm» в МСК (формат, который отдаёт/принимает DateTimePicker).
function toMskInput(iso: string): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

export function ScheduleManager({
  tournaments,
  users,
}: {
  tournaments: Tournament[];
  users: User[];
}) {
  const [list, setList] = React.useState<Tournament[]>(tournaments);
  const [selId, setSelId] = React.useState(tournaments[0]?.id ?? "");
  const [detail, setDetail] = React.useState<Tournament | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [addPartOpen, setAddPartOpen] = React.useState(false);
  const [pointsFor, setPointsFor] = React.useState<Participant | null>(null);
  const [addRoundOpen, setAddRoundOpen] = React.useState(false);

  const [cTitle, setCTitle] = React.useState("");
  const [cMode, setCMode] = React.useState<"1x1" | "2x2">("1x1");
  const [cRounds, setCRounds] = React.useState(3);
  const [cStart, setCStart] = React.useState("");

  const [pTeamName, setPTeamName] = React.useState("");
  const [pM1, setPM1] = React.useState<PickedMember>({ name: "" });
  const [pM2, setPM2] = React.useState<PickedMember>({ name: "" });
  const [editPartId, setEditPartId] = React.useState<string | null>(null);
  const [pointsVal, setPointsVal] = React.useState(0);
  const [rNumber, setRNumber] = React.useState(1);
  const [rMap, setRMap] = React.useState("");
  const [editRoundId, setEditRoundId] = React.useState<string | null>(null);

  const [editTourOpen, setEditTourOpen] = React.useState(false);
  const [eTitle, setETitle] = React.useState("");
  const [eStart, setEStart] = React.useState("");

  // детали выбранного турнира (setState только после await — без set-state-in-effect)
  React.useEffect(() => {
    if (!selId) return;
    let active = true;
    (async () => {
      try {
        const t = await api.get<Tournament>(`/tournaments/${selId}`);
        if (active) setDetail(t);
      } catch {
        if (active) setDetail(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [selId]);

  async function reloadDetail() {
    if (!selId) return;
    try {
      setDetail(await api.get<Tournament>(`/tournaments/${selId}`));
      // Сводка (hasSpace/participantCount) живёт только в списочном эндпоинте —
      // обновляем её, иначе бейдж «Есть место» остаётся устаревшим после правок состава.
      const fresh = await api.get<Tournament[]>("/tournaments");
      setList((xs) => xs.map((x) => fresh.find((f) => f.id === x.id) ?? x));
    } catch {
      /* ignore */
    }
  }

  // Пул заявок грузится постранично (бесконечная подгрузка по скроллу), чтобы не тянуть
  // все заявки сразу. pool — уже загруженные, poolTotal — сколько всего pending на бэке.
  const POOL_PAGE = 30;
  const [pool, setPool] = React.useState<Registration[]>([]);
  const [poolTotal, setPoolTotal] = React.useState(0);
  const [poolLoading, setPoolLoading] = React.useState(false);
  const poolBusyRef = React.useRef(false);
  const poolCountRef = React.useRef(0);
  React.useEffect(() => {
    poolCountRef.current = pool.length;
  }, [pool.length]);

  const loadPoolPage = React.useCallback(async (reset: boolean) => {
    if (poolBusyRef.current) return;
    poolBusyRef.current = true;
    setPoolLoading(true);
    try {
      const offset = reset ? 0 : poolCountRef.current;
      const res = await api.get<{ items: Registration[]; total: number }>(
        `/registrations/pool/page?limit=${POOL_PAGE}&offset=${offset}`,
      );
      setPoolTotal(res.total);
      setPool((prev) => {
        if (reset) return res.items;
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...res.items.filter((r) => !seen.has(r.id))];
      });
    } catch {
      /* ignore */
    } finally {
      poolBusyRef.current = false;
      setPoolLoading(false);
    }
  }, []);

  // Перезагрузка после действий (поставили/отклонили): тянем с начала примерно столько же,
  // сколько уже было загружено, чтобы список не «схлопывался» к первой странице.
  const reloadPool = React.useCallback(async () => {
    if (poolBusyRef.current) return;
    poolBusyRef.current = true;
    setPoolLoading(true);
    try {
      const want = Math.max(POOL_PAGE, poolCountRef.current);
      const res = await api.get<{ items: Registration[]; total: number }>(
        `/registrations/pool/page?limit=${want}&offset=0`,
      );
      setPoolTotal(res.total);
      setPool(res.items);
    } catch {
      /* ignore */
    } finally {
      poolBusyRef.current = false;
      setPoolLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPoolPage(true);
  }, [loadPoolPage]);

  // Скролл-контейнер пула: затемнения-подсказки + догрузка при приближении к концу.
  const poolScrollRef = React.useRef<HTMLDivElement>(null);
  const [poolMore, setPoolMore] = React.useState(false);
  const [poolUp, setPoolUp] = React.useState(false);
  const updatePoolEdges = React.useCallback(() => {
    const el = poolScrollRef.current;
    setPoolMore(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    setPoolUp(!!el && el.scrollTop > 4);
  }, []);
  const onPoolScroll = React.useCallback(() => {
    updatePoolEdges();
    const el = poolScrollRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
      if (poolCountRef.current < poolTotal && !poolBusyRef.current) loadPoolPage(false);
    }
  }, [updatePoolEdges, poolTotal, loadPoolPage]);

  const [poolQuery, setPoolQuery] = React.useState(""); // поиск в панели пула
  const [pickQuery, setPickQuery] = React.useState(""); // поиск в чипах модалки

  function select(id: string) {
    if (id === selId) return;
    setDetail(null);
    setSelId(id);
  }

  function openCreate() {
    setCTitle("");
    setCMode("1x1");
    setCRounds(3);
    setCStart("");
    setError("");
    setCreateOpen(true);
  }

  async function createTournament(e: React.FormEvent) {
    e.preventDefault();
    if (!cTitle.trim()) {
      setError("Укажите название.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const t = await api.post<Tournament>("/tournaments", {
        title: cTitle.trim(),
        mode: cMode,
        totalRounds: Number(cRounds) || 3,
        startsAt: cStart ? `${cStart}:00+03:00` : null,
      });
      setList((xs) => [{ ...t, hasSpace: true }, ...xs]);
      setSelId(t.id);
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.body || err.message : "Не удалось создать.");
    } finally {
      setBusy(false);
    }
  }

  async function patchTournament(patch: Record<string, unknown>) {
    if (!detail) return;
    setBusy(true);
    try {
      const t = await api.patch<Tournament>(`/tournaments/${detail.id}`, patch);
      setDetail(t);
      setList((xs) => xs.map((x) => (x.id === t.id ? { ...x, status: t.status } : x)));
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  function openEditTour() {
    if (!detail) return;
    setETitle(detail.title);
    setEStart(detail.startsAt ? toMskInput(detail.startsAt) : "");
    setError("");
    setEditTourOpen(true);
  }

  async function saveTour(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    if (!eTitle.trim()) {
      setError("Укажите название.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const t = await api.patch<Tournament>(`/tournaments/${detail.id}`, {
        title: eTitle.trim(),
        startsAt: eStart ? `${eStart}:00+03:00` : null,
      });
      setDetail(t);
      setList((xs) => xs.map((x) => (x.id === t.id ? { ...x, title: t.title, startsAt: t.startsAt } : x)));
      setEditTourOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.body || err.message : "Не удалось сохранить.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteTournament() {
    if (!detail) return;
    if (!window.confirm(`Удалить турнир «${tournamentName(detail)}» вместе с раундами, участниками и начислениями? Действие необратимо.`)) {
      return;
    }
    setBusy(true);
    try {
      await api.del(`/tournaments/${detail.id}`);
      const rest = list.filter((x) => x.id !== detail.id);
      setList(rest);
      setDetail(null);
      setSelId(rest[0]?.id ?? "");
    } catch (err) {
      window.alert(err instanceof ApiError ? err.body || err.message : "Не удалось удалить турнир.");
    } finally {
      setBusy(false);
    }
  }

  function openAddPart() {
    setEditPartId(null);
    setPickQuery("");
    setPTeamName("");
    setPM1({ name: "" });
    setPM2({ name: "" });
    setError("");
    setAddPartOpen(true);
  }

  function openEditPart(p: Participant) {
    setEditPartId(p.id);
    setPickQuery("");
    setError("");
    if (detail?.mode === "2x2") {
      const ms = Array.isArray(p.members) ? p.members : [];
      setPTeamName(p.name);
      setPM1({ name: ms[0]?.name ?? "", userId: ms[0]?.userId });
      setPM2({ name: ms[1]?.name ?? "", userId: ms[1]?.userId });
    } else {
      setPTeamName("");
      setPM1({ name: p.name, userId: p.userId });
      setPM2({ name: "" });
    }
    setAddPartOpen(true);
  }

  async function submitParticipant(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    const is2x2 = detail.mode === "2x2";
    let body: Record<string, unknown>;
    if (is2x2) {
      const members = [pM1, pM2]
        .filter((m) => m.name.trim())
        .map((m) => ({ name: m.name.trim(), ...(m.userId ? { userId: m.userId } : {}) }));
      if (!members.length) {
        setError("Добавьте хотя бы одного игрока команды.");
        return;
      }
      body = {
        kind: "team",
        name: (pTeamName.trim() || members.map((m) => m.name).join(" & ")),
        userId: null,
        members,
      };
    } else {
      if (!pM1.name.trim()) {
        setError("Укажите игрока.");
        return;
      }
      body = { kind: "player", name: pM1.name.trim(), userId: pM1.userId || null, members: [] };
    }
    setBusy(true);
    setError("");
    try {
      if (editPartId) {
        await api.patch(`/participants/${editPartId}`, body);
      } else {
        await api.post(`/tournaments/${detail.id}/participants`, { ...body, seed: (detail.participants?.length ?? 0) + 1 });
      }
      setAddPartOpen(false);
      await Promise.all([reloadDetail(), reloadPool()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.body || err.message : "Не удалось сохранить.");
    } finally {
      setBusy(false);
    }
  }

  // аккаунты, уже занятые в этом турнире (чтобы не выбрать дважды); без редактируемого участника
  const usedUserIds = React.useMemo(() => {
    const s = new Set<string>();
    for (const p of detail?.participants ?? []) {
      if (p.id === editPartId) continue;
      if (p.userId) s.add(p.userId);
      for (const m of Array.isArray(p.members) ? p.members : []) if (m.userId) s.add(m.userId);
    }
    return s;
  }, [detail?.participants, editPartId]);

  // Заявки пула, ещё не попавшие в этот турнир (по twitch-аккаунту).
  const availablePool = React.useMemo(
    () => pool.filter((r) => !usedUserIds.has(r.userId)),
    [pool, usedUserIds],
  );
  // Позиция в очереди (по времени подачи) — стабильна при фильтрации.
  const poolPos = React.useMemo(() => {
    const m = new Map<string, number>();
    availablePool.forEach((r, i) => m.set(r.id, i + 1));
    return m;
  }, [availablePool]);

  // Во время поиска (в панели или модалке) дозагружаем остаток пула, чтобы искать по всем.
  React.useEffect(() => {
    if ((poolQuery.trim() || pickQuery.trim()) && pool.length < poolTotal && !poolLoading) {
      loadPoolPage(false);
    }
  }, [poolQuery, pickQuery, pool.length, poolTotal, poolLoading, loadPoolPage]);

  // Пересчёт затемнений-подсказок при изменении видимого списка и ресайзе окна.
  React.useEffect(() => {
    updatePoolEdges();
    window.addEventListener("resize", updatePoolEdges);
    return () => window.removeEventListener("resize", updatePoolEdges);
  }, [availablePool.length, poolQuery, updatePoolEdges]);

  function poolName(r: Registration) {
    return r.userDisplayName || r.userLogin || "Игрок";
  }

  // 1×1: поставить игрока из заявки сразу. Заявка автоматически уйдёт из пула (бэк).
  async function addSoloFromPool(r: Registration) {
    if (!detail) return;
    setBusy(true);
    try {
      await api.post(`/tournaments/${detail.id}/participants`, {
        kind: "player",
        name: poolName(r),
        userId: r.userId,
        members: [],
        seed: (detail.participants?.length ?? 0) + 1,
      });
      await Promise.all([reloadDetail(), reloadPool()]);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  // 2×2: открыть форму команды с игроком из заявки в первом слоте.
  function teamFromPool(r: Registration) {
    setEditPartId(null);
    setPickQuery("");
    setPTeamName("");
    setPM1({ name: poolName(r), userId: r.userId });
    setPM2({ name: "" });
    setError("");
    setAddPartOpen(true);
  }

  async function declinePool(r: Registration) {
    setBusy(true);
    try {
      await api.post(`/registrations/${r.id}/decide`, { status: "declined" });
      await reloadPool();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  // В модалке: подставить игрока из заявки в первый свободный слот.
  function pickIntoSlot(r: Registration) {
    const m: PickedMember = { name: poolName(r), userId: r.userId };
    if (detail?.mode === "2x2") {
      if (!pM1.name.trim()) setPM1(m);
      else setPM2(m);
    } else {
      setPM1(m);
    }
  }

  async function removeParticipant(id: string) {
    setBusy(true);
    try {
      await api.del(`/participants/${id}`);
      // заявка игрока могла вернуться в пул — обновляем и список заявок
      await Promise.all([reloadDetail(), reloadPool()]);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  function openPoints(p: Participant) {
    setPointsFor(p);
    setPointsVal(p.totalPoints);
  }

  async function savePoints(e: React.FormEvent) {
    e.preventDefault();
    if (!pointsFor) return;
    setBusy(true);
    try {
      await api.patch(`/participants/${pointsFor.id}`, { totalPoints: Number(pointsVal) || 0 });
      setPointsFor(null);
      await reloadDetail();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  function openAddRound() {
    setEditRoundId(null);
    setRNumber((detail?.rounds?.length ?? 0) + 1);
    setRMap("");
    setError("");
    setAddRoundOpen(true);
  }

  function openEditRound(rd: Round) {
    setEditRoundId(rd.id);
    setRNumber(rd.number);
    setRMap(rd.map ?? "");
    setError("");
    setAddRoundOpen(true);
  }

  async function addRound(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      const payload = { number: Number(rNumber) || 1, map: rMap.trim() };
      if (editRoundId) {
        await api.patch(`/rounds/${editRoundId}`, payload);
      } else {
        await api.post(`/tournaments/${detail.id}/rounds`, payload);
      }
      setAddRoundOpen(false);
      await reloadDetail();
    } catch (err) {
      setError(err instanceof ApiError ? err.body || err.message : "Не удалось.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRound(id: string) {
    if (!window.confirm("Удалить раунд вместе с его начислениями и заданиями?")) return;
    setBusy(true);
    try {
      await api.del(`/rounds/${id}`);
      await reloadDetail();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.body || err.message : "Не удалось удалить раунд.");
    } finally {
      setBusy(false);
    }
  }


  const participants = detail?.participants ?? [];
  const rounds = [...(detail?.rounds ?? [])].sort((a, b) => a.number - b.number);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl">Расписание</h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
          <span>+ Турнир</span>
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="space-y-2">
          {list.length ? (
            list.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => select(t.id)}
                className={cn("panel flex w-full items-center justify-between gap-2 p-3 text-left transition", t.id === selId && "glow-edge")}
              >
                <span className="min-w-0">
                  <span className="block truncate font-display text-sm uppercase">{tournamentName(t)}</span>
                  <span className="text-xs text-muted">
                    {t.mode}
                    {t.startsAt ? ` · ${fmtDate(t.startsAt)}` : ""}
                  </span>
                </span>
                <span className="flex flex-none flex-col items-end gap-1">
                  <TournamentStatusPill status={t.status} />
                  {t.status === "upcoming" && t.hasSpace && (
                    <span className="chip chip-cyan text-[0.6rem]">
                      <span className="dot" />
                      <span>Есть место</span>
                    </span>
                  )}
                </span>
              </button>
            ))
          ) : (
            <EmptyState title="Турниров нет" hint="Создайте первый турнир." />
          )}
        </div>

        <div className="space-y-5">
          {!detail ? (
            <Panel className="px-5 py-10 text-center text-muted">
              {selId ? "Загрузка…" : "Выберите турнир слева или создайте новый."}
            </Panel>
          ) : (
            <>
              <Panel glow className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-xl uppercase">{tournamentName(detail)}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <TournamentStatusPill status={detail.status} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={openEditTour}>
                      <span>Изменить</span>
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={deleteTournament}>
                      <span>Удалить</span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span>{detail.mode}</span>
                  <span>·</span>
                  <span>{detail.totalRounds} раунда</span>
                  {detail.startsAt && (
                    <>
                      <span>·</span>
                      <span>
                        {fmtDate(detail.startsAt)} {fmtTime(detail.startsAt)}
                      </span>
                    </>
                  )}
                  {detail.maps?.length ? (
                    <>
                      <span>·</span>
                      <span>{detail.maps.join(" · ")}</span>
                    </>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <span className="field-label">Статус</span>
                  <div className="seg flex-wrap">
                    {STATUSES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        className="seg-btn"
                        aria-pressed={detail.status === s.value}
                        disabled={busy}
                        onClick={() => patchTournament({ status: s.value })}
                      >
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
                  <h3 className="font-display text-lg uppercase">Участники</h3>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={openAddPart}>
                    <span>+ Участник</span>
                  </button>
                </div>
                {participants.length ? (
                  <table className="w-full text-sm">
                    <tbody>
                      {participants.map((p) => (
                        <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                          <td className="px-4 py-3">
                            <span className="font-display uppercase">{p.name}</span>
                            {detail.winnerParticipantId === p.id && <span className="ml-2 text-xs text-gold">★ победитель</span>}
                            {detail.mode === "2x2" ? (
                              <div className="mt-0.5 text-xs text-muted">
                                {Array.isArray(p.members) && p.members.length ? (
                                  p.members.map((m, i) => (
                                    <span key={i}>
                                      {i ? " · " : ""}
                                      {m.name}
                                      {m.userId ? " ✓" : ""}
                                    </span>
                                  ))
                                ) : (
                                  <span>состав не задан</span>
                                )}
                                {(!Array.isArray(p.members) || p.members.length < 2) && <span className="text-accent"> · нужен 2-й игрок</span>}
                              </div>
                            ) : p.userId ? (
                              <span className="ml-2 text-xs text-muted">аккаунт</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-display tnum text-primary-2">{p.totalPoints}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditPart(p)}>
                                <span>{detail.mode === "2x2" ? "Состав" : "Изм."}</span>
                              </button>
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => openPoints(p)}>
                                <span>Очки</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-cyan btn-sm"
                                disabled={busy}
                                onClick={() => patchTournament({ winnerParticipantId: p.id })}
                              >
                                <span>Победитель</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={busy}
                                onClick={() => removeParticipant(p.id)}
                              >
                                <span>✕</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-5 py-8 text-center text-sm text-muted">Участников нет.</div>
                )}
              </Panel>

              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
                  <div>
                    <h3 className="font-display text-lg uppercase">Раунды и карты</h3>
                    <p className="mt-1 text-xs text-muted">Статус раундов проставляется автоматически по текущему раунду в «Эфире».</p>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={openAddRound}>
                    <span>+ Раунд</span>
                  </button>
                </div>
                {rounds.length ? (
                  <table className="w-full text-sm">
                    <tbody>
                      {rounds.map((r) => (
                        <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                          <td className="px-4 py-3 font-display uppercase">Раунд {r.number}</td>
                          <td className="px-4 py-3 text-muted">{r.map || "—"}</td>
                          <td className="px-4 py-3 text-xs uppercase tracking-wide text-muted">
                            {r.status === "live" ? "Идёт" : r.status === "finished" ? "Завершён" : "Ожидание"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditRound(r)}>
                                <span>Изм.</span>
                              </button>
                              <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => deleteRound(r.id)}>
                                <span>✕</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-5 py-8 text-center text-sm text-muted">Раундов нет.</div>
                )}
              </Panel>

              <Panel className="overflow-hidden">
                <div className="border-b border-[var(--border)] px-5 py-4">
                  <h3 className="font-display text-lg uppercase">Стартовые задания по раундам</h3>
                  <p className="mt-1 text-xs text-muted">
                    Скрытый пул — обычные игроки этих заданий не видят. Раскидай по раундам, зачёт — в «Эфире».
                  </p>
                </div>
                <div className="p-5">
                  <StarterTaskBoard tournamentId={detail.id} rounds={detail.rounds ?? []} />
                </div>
              </Panel>

              <Panel className="overflow-hidden">
                <div className="space-y-3 border-b border-[var(--border)] px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-lg uppercase">Заявки (пул)</h3>
                    <span className="text-xs text-muted">
                      Доступно: {availablePool.length}
                      {poolTotal > pool.length ? ` · загружено ${pool.length}/${poolTotal}` : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    Общий список желающих, кто подал раньше — выше. Поставь в турнир — заявка уйдёт из пула.
                  </p>
                  {poolTotal > 0 && (
                    <input
                      className="input"
                      placeholder="Поиск по нику или Embark ID…"
                      value={poolQuery}
                      onChange={(e) => setPoolQuery(e.target.value)}
                    />
                  )}
                </div>
                {poolTotal === 0 && !poolLoading ? (
                  <div className="px-5 py-8 text-center text-sm text-muted">Заявок в пуле пока нет.</div>
                ) : (
                  <div className="relative">
                    {poolUp && (
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-[var(--surface)] to-transparent" />
                    )}
                    <div
                      ref={poolScrollRef}
                      onScroll={onPoolScroll}
                      className="max-h-[460px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {(() => {
                        const filtered = availablePool.filter((r) => registrationMatches(r, poolQuery));
                        if (!filtered.length) {
                          return (
                            <div className="px-5 py-8 text-center text-sm text-muted">
                              {poolLoading
                                ? "Загрузка…"
                                : poolQuery.trim()
                                  ? "Ничего не найдено."
                                  : "Все из пула уже в этом турнире."}
                            </div>
                          );
                        }
                        return (
                          <ul className="divide-y divide-[var(--border)]">
                            {filtered.map((r) => (
                              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                                <span className="w-5 flex-none text-center font-display text-sm text-muted tnum">{poolPos.get(r.id)}</span>
                                <Avatar name={poolName(r)} src={r.userAvatarUrl} size="sm" />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-display text-sm uppercase">{poolName(r)}</div>
                                  <div className="truncate text-xs text-muted">
                                    {r.embarkId && <span className="tnum">{r.embarkId}</span>}
                                    {r.embarkId && r.note && " · "}
                                    {r.note}
                                  </div>
                                </div>
                                <div className="flex flex-none gap-2">
                                  {detail.mode === "2x2" ? (
                                    <button type="button" className="btn btn-cyan btn-sm" disabled={busy} onClick={() => teamFromPool(r)}>
                                      <span>В команду</span>
                                    </button>
                                  ) : (
                                    <button type="button" className="btn btn-cyan btn-sm" disabled={busy} onClick={() => addSoloFromPool(r)}>
                                      <span>В турнир</span>
                                    </button>
                                  )}
                                  <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => declinePool(r)}>
                                    <span>Отклонить</span>
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                      {pool.length < poolTotal && (
                        <div className="px-5 py-3 text-center text-xs uppercase tracking-wide text-muted">
                          {poolLoading ? "Загрузка…" : "Прокрутите вниз — загрузится ещё"}
                        </div>
                      )}
                    </div>
                    {poolMore && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--surface)] to-transparent" />
                    )}
                  </div>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Создать турнир"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreateOpen(false)}>
              <span>Отмена</span>
            </button>
            <button form="t-create" type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              <span>{busy ? "…" : "Создать"}</span>
            </button>
          </>
        }
      >
        <form id="t-create" className="space-y-4" onSubmit={createTournament}>
          <div className="space-y-1.5">
            <label className="field-label" htmlFor="t-title">Название</label>
            <input id="t-title" className="input" value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="напр. Istwood vs Vey" />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <span className="field-label">Режим</span>
              <div className="seg">
                <button type="button" className="seg-btn" aria-pressed={cMode === "1x1"} onClick={() => setCMode("1x1")}>
                  <span>1×1</span>
                </button>
                <button type="button" className="seg-btn" aria-pressed={cMode === "2x2"} onClick={() => setCMode("2x2")}>
                  <span>2×2</span>
                </button>
              </div>
            </div>
            <div className="w-28 space-y-1.5">
              <label className="field-label" htmlFor="t-rounds">Раундов</label>
              <input id="t-rounds" type="number" min={1} className="input" value={cRounds} onChange={(e) => setCRounds(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="field-label">Дата и время (МСК)</span>
            <DateTimePicker value={cStart} onChange={setCStart} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={editTourOpen}
        onClose={() => setEditTourOpen(false)}
        title="Изменить турнир"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditTourOpen(false)}>
              <span>Отмена</span>
            </button>
            <button form="t-edit" type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              <span>{busy ? "…" : "Сохранить"}</span>
            </button>
          </>
        }
      >
        <form id="t-edit" className="space-y-4" onSubmit={saveTour}>
          <div className="space-y-1.5">
            <label className="field-label" htmlFor="te-title">Название</label>
            <input id="te-title" className="input" value={eTitle} onChange={(e) => setETitle(e.target.value)} placeholder="напр. Istwood vs Vey" />
          </div>
          <div className="space-y-1.5">
            <span className="field-label">Дата и время (МСК)</span>
            <DateTimePicker value={eStart} onChange={setEStart} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={addPartOpen}
        onClose={() => setAddPartOpen(false)}
        title={editPartId ? (detail?.mode === "2x2" ? "Состав команды" : "Изменить игрока") : detail?.mode === "2x2" ? "Добавить команду" : "Добавить игрока"}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddPartOpen(false)}>
              <span>Отмена</span>
            </button>
            <button form="p-add" type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              <span>{busy ? "…" : editPartId ? "Сохранить" : "Добавить"}</span>
            </button>
          </>
        }
      >
        <form id="p-add" className="space-y-4" onSubmit={submitParticipant}>
          {(() => {
            const picked = new Set([pM1.userId, pM2.userId].filter(Boolean) as string[]);
            const modalPool = availablePool.filter((r) => !picked.has(r.userId));
            if (!modalPool.length) return null;
            const filtered = modalPool.filter((r) => registrationMatches(r, pickQuery));
            const visible = filtered.slice(0, 12);
            return (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="field-label">Из заявок</span>
                  <span className="text-xs text-muted">{modalPool.length}</span>
                </div>
                {modalPool.length > 8 && (
                  <input
                    className="input"
                    placeholder="Поиск по нику или Embark ID…"
                    value={pickQuery}
                    onChange={(e) => setPickQuery(e.target.value)}
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  {visible.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="chip hover:shadow-[inset_0_0_0_1px_var(--primary)]"
                      title={`${r.embarkId || ""}${r.note ? ` · ${r.note}` : ""}`}
                      onClick={() => pickIntoSlot(r)}
                    >
                      <span>{poolName(r)}</span>
                    </button>
                  ))}
                  {!filtered.length && <span className="text-xs text-muted">Ничего не найдено.</span>}
                </div>
                {filtered.length > visible.length && (
                  <p className="text-xs text-muted">…и ещё {filtered.length - visible.length}. Уточни поиск.</p>
                )}
              </div>
            );
          })()}
          {detail?.mode === "2x2" ? (
            <>
              <div className="space-y-1.5">
                <label className="field-label" htmlFor="p-team">Название команды (необязательно)</label>
                <input id="p-team" className="input" value={pTeamName} onChange={(e) => setPTeamName(e.target.value)} placeholder="авто из ников: «Ник1 & Ник2»" />
              </div>
              <div className="space-y-1.5">
                <label className="field-label">Игрок 1</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <UserCombobox users={users} exclude={new Set([...usedUserIds, ...(pM2.userId ? [pM2.userId] : [])])} value={pM1} onChange={setPM1} />
                  </div>
                  {pM1.name.trim() && (
                    <button type="button" className="btn btn-ghost btn-sm flex-none" title="убрать игрока" onClick={() => setPM1({ name: "" })}>
                      <span>✕</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="field-label">Игрок 2 <span className="text-muted">— можно добавить позже</span></label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <UserCombobox users={users} exclude={new Set([...usedUserIds, ...(pM1.userId ? [pM1.userId] : [])])} value={pM2} onChange={setPM2} />
                  </div>
                  {pM2.name.trim() && (
                    <button type="button" className="btn btn-ghost btn-sm flex-none" title="убрать игрока" onClick={() => setPM2({ name: "" })}>
                      <span>✕</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <label className="field-label">Игрок</label>
              <UserCombobox users={users} exclude={usedUserIds} value={pM1} onChange={setPM1} />
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!pointsFor}
        onClose={() => setPointsFor(null)}
        title={`Очки — ${pointsFor?.name ?? ""}`}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPointsFor(null)}>
              <span>Отмена</span>
            </button>
            <button form="p-points" type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              <span>{busy ? "…" : "Сохранить"}</span>
            </button>
          </>
        }
      >
        <form id="p-points" className="space-y-2" onSubmit={savePoints}>
          <label className="field-label" htmlFor="pp">Всего очков в турнире</label>
          <input id="pp" type="number" className="input" value={pointsVal} onChange={(e) => setPointsVal(Number(e.target.value))} />
          <p className="text-xs text-muted">
            Ручная правка. В «Эфире» (шаг 3) очки считаются по раундам и перезапишут это значение.
          </p>
        </form>
      </Modal>

      <Modal
        open={addRoundOpen}
        onClose={() => setAddRoundOpen(false)}
        title={editRoundId ? "Изменить раунд" : "Добавить раунд"}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddRoundOpen(false)}>
              <span>Отмена</span>
            </button>
            <button form="r-add" type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              <span>{busy ? "…" : editRoundId ? "Сохранить" : "Добавить"}</span>
            </button>
          </>
        }
      >
        <form id="r-add" className="space-y-4" onSubmit={addRound}>
          <div className="flex gap-4">
            <div className="w-24 space-y-1.5">
              <label className="field-label" htmlFor="r-num">Номер</label>
              <input id="r-num" type="number" min={1} className="input" value={rNumber} onChange={(e) => setRNumber(Number(e.target.value))} />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="field-label" htmlFor="r-map">Карта</label>
              <input id="r-map" className="input" value={rMap} onChange={(e) => setRMap(e.target.value)} placeholder="Космопорт" />
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
