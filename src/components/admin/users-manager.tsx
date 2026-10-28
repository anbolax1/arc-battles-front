"use client";

import * as React from "react";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/ui/tag-badge";
import { StatusPill } from "@/components/ui/pill";
import { SectionHead } from "@/components/ui/section-head";
import { EmptyState } from "@/components/ui/empty-state";
import { roleBadge } from "@/lib/display";
import { fmtDate } from "@/lib/format";
import { ROLES } from "@/lib/roles";
import type { PlayerProfile, Role, User, UserOverview } from "@/lib/types";

/* Раздел «Пользователи» кабинета. Пагинация (по pageSize), поиск и сортировка —
   серверные (через /users/overview), чтобы не тянуть всех сразу. Клик по строке
   раскрывает историю участия — она грузится лениво из /players/{login} и кешируется. */

type SortKey = "tournaments" | "wins" | "joined" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "tournaments", label: "Матчи" },
  { key: "wins", label: "Победы" },
  { key: "joined", label: "Регистрация" },
  { key: "name", label: "Имя" },
];

function userName(u: UserOverview): string {
  return u.displayName || u.login || "Игрок";
}

/** Что даёт каждая роль - подсказка у выбора роли. */
const ROLE_HINT: Record<Role, string> = {
  user: "Играет матчи, вписывает часы и ноки в профиль, сам сбрасывает рейтинг жетоном.",
  subscriber: "Как игрок, плюс заполняет в профиле блок «любимое».",
  moderator: "Проверяет скриншоты в «Проверке», выдаёт и активирует жетоны на странице игрока.",
  superadmin: "Весь кабинет: матчи, пульт, сезоны и роли.",
};

// Название роли подписчика стоит в профиле и в кабинете одной строкой - как и на сервере.
const MAX_ROLE_NAME = 24;

/** Роль подписчика организатор называет как хочет: например, по уровню подписки на Boosty. */
function SubscriberRoleName({ name, onSaved }: { name: string; onSaved: (name: string) => void }) {
  const [value, setValue] = React.useState(name);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState("");
  const dirty = value.trim() !== name && value.trim().length >= 2;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setBusy(true);
    setNote("");
    try {
      const s = await api.put<{ subscriberRole: string }>("/site/subscriber-role", { name: value });
      onSaved(s.subscriberRole);
      setValue(s.subscriberRole);
      setNote("Сохранено");
    } catch (err) {
      setNote(errorText(err, "Не удалось переименовать."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="panel flex flex-wrap items-end gap-3 p-4">
      <label className="min-w-[14rem] flex-1 space-y-1.5">
        <span className="field-label">Название роли подписчика</span>
        <input
          className="input"
          maxLength={MAX_ROLE_NAME}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setNote("");
          }}
        />
      </label>
      <button type="submit" className="btn btn-cyan btn-sm" disabled={!dirty || busy}>
        <span>{busy ? "Сохраняем…" : "Переименовать"}</span>
      </button>
      <span className="w-full text-xs text-muted">
        {note || "С этой ролью игрок заполняет в профиле блок «любимое». Название видно в кабинете и в профиле."}
      </span>
    </form>
  );
}

// Список номеров страниц с многоточиями: первая, последняя, текущая ±1.
function pageWindow(current: number, totalPages: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  for (let p = 0; p < totalPages; p++) {
    if (p === 0 || p === totalPages - 1 || (p >= current - 1 && p <= current + 1)) {
      out.push(p);
    } else if (out[out.length - 1] !== "…") {
      out.push("…");
    }
  }
  return out;
}

export function UsersManager({
  initialItems,
  initialTotal,
  pageSize,
  subscriberRole,
}: {
  initialItems: UserOverview[];
  initialTotal: number;
  pageSize: number;
  subscriberRole: string;
}) {
  const [subName, setSubName] = React.useState(subscriberRole);
  const [items, setItems] = React.useState<UserOverview[]>(initialItems);
  const [total, setTotal] = React.useState(initialTotal);
  const [page, setPage] = React.useState(0);
  const [sort, setSort] = React.useState<SortKey>("tournaments");
  const [queryInput, setQueryInput] = React.useState("");
  const [query, setQuery] = React.useState(""); // дебаунс-значение, уходит на бэк
  const [loading, setLoading] = React.useState(false);
  const [openId, setOpenId] = React.useState<string | null>(null);
  // Кеш истории участия по userId: грузим лениво при раскрытии строки.
  const [profiles, setProfiles] = React.useState<Record<string, PlayerProfile | "loading" | "error">>({});
  const firstRun = React.useRef(true);

  // Назначение ролей (organizer-only). currentUser — чтобы не дать сменить роль самому себе.
  const { user: currentUser } = useAuth();
  const [roleBusyId, setRoleBusyId] = React.useState<string | null>(null);
  const [roleError, setRoleError] = React.useState<Record<string, string>>({});
  // Активация заглушек: ссылка доступа по userId.
  const [claimBusy, setClaimBusy] = React.useState<string | null>(null);
  const [claimLink, setClaimLink] = React.useState<Record<string, string>>({});

  async function makeClaimLink(u: UserOverview, regenerate = false) {
    setClaimBusy(u.id);
    try {
      const res = await api.post<{ token: string }>(
        `/users/${u.id}/claim-link${regenerate ? "?regenerate=1" : ""}`,
        {},
      );
      setClaimLink((prev) => ({ ...prev, [u.id]: `${window.location.origin}/claim/${res.token}` }));
    } catch {
      /* игнор */
    } finally {
      setClaimBusy(null);
    }
  }

  async function changeRole(u: UserOverview, role: Role) {
    setRoleBusyId(u.id);
    setRoleError((m) => ({ ...m, [u.id]: "" }));
    try {
      const updated = await api.patch<User>(`/users/${u.id}/role`, { role });
      setItems((list) => list.map((it) => (it.id === u.id ? { ...it, role: updated.role } : it)));
    } catch (e) {
      setRoleError((m) => ({ ...m, [u.id]: errorText(e, "Не удалось изменить роль.") }));
    } finally {
      setRoleBusyId(null);
    }
  }

  // Дебаунс поиска → сброс на первую страницу.
  React.useEffect(() => {
    const t = setTimeout(() => {
      setQuery(queryInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [queryInput]);

  // Загрузка страницы при изменении page/sort/query. Первый рендер — данные из пропсов
  // (page 0, сортировка по матчам, без поиска), запрос не шлём.
  React.useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    let active = true;
    setLoading(true);
    const qs = new URLSearchParams({ limit: String(pageSize), offset: String(page * pageSize), sort });
    if (query) qs.set("q", query);
    (async () => {
      try {
        const res = await api.get<{ items: UserOverview[]; total: number }>(`/users/overview?${qs}`);
        if (!active) return;
        setItems(res.items);
        setTotal(res.total);
        setOpenId(null);
      } catch {
        if (active) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [page, sort, query, pageSize]);

  async function toggle(u: UserOverview) {
    const next = openId === u.id ? null : u.id;
    setOpenId(next);
    if (next && !profiles[u.id]) {
      setProfiles((p) => ({ ...p, [u.id]: "loading" }));
      try {
        const prof = await api.get<PlayerProfile>(`/players/${encodeURIComponent(u.login)}`);
        setProfiles((p) => ({ ...p, [u.id]: prof }));
      } catch {
        setProfiles((p) => ({ ...p, [u.id]: "error" }));
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="space-y-6">
      <SectionHead eyebrow="Организатор" title="Пользователи" />
      <SubscriberRoleName name={subName} onSaved={setSubName} />

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs flex-1"
          placeholder="Поиск по имени, логину, Embark ID, email…"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
        />
        <div className="seg">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              className="seg-btn"
              aria-pressed={sort === s.key}
              onClick={() => {
                setSort(s.key);
                setPage(0);
              }}
            >
              <span>{s.label}</span>
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted">
          {total > 0 ? `${from}–${to} из ${total}` : "ничего не найдено"}
        </span>
      </div>

      {items.length ? (
        <div className={`panel overflow-hidden transition ${loading ? "opacity-60" : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Игрок</th>
                  <th className="px-4 py-3">Embark ID</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Регистрация</th>
                  <th className="px-4 py-3 text-right">Матчей</th>
                  <th className="px-4 py-3 text-right">Побед</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => {
                  const role = roleBadge(u.role, subName);
                  const open = openId === u.id;
                  const prof = profiles[u.id];
                  return (
                    <React.Fragment key={u.id}>
                      <tr
                        className="cursor-pointer border-b border-[var(--border)] transition last:border-0 hover:bg-surface-2"
                        onClick={() => toggle(u)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={userName(u)} src={u.avatarUrl} size="sm" />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate font-display uppercase">{userName(u)}</span>
                                {(u.tags ?? []).map((t) => (
                                  <TagBadge
                                    key={t.id}
                                    tag={t}
                                    className={t.visible && !t.hiddenByUser ? "" : "opacity-50"}
                                    title={!t.visible ? "на сайте скрыт" : t.hiddenByUser ? "игрок скрыл в профиле" : undefined}
                                  />
                                ))}
                              </div>
                              <div className="truncate text-xs text-muted">@{u.login}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 tnum text-muted">{u.embarkId || "—"}</td>
                        <td className="px-4 py-3 text-muted">{u.email || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">
                          {/* У заглушки дата создания - это дата импорта, а не регистрации игрока */}
                          {u.isPlaceholder ? (
                            <span className="text-gold" title="Аккаунт создан автоматически: игрок ещё не зарегистрировался и не задал пароль по ссылке">
                              не зарегистрирован
                            </span>
                          ) : u.createdAt ? (
                            fmtDate(u.createdAt)
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tnum">{u.tournaments}</td>
                        <td className="px-4 py-3 text-right tnum">{u.wins}</td>
                      </tr>
                      {open && (
                        <tr className="border-b border-[var(--border)] last:border-0">
                          <td colSpan={7} className="bg-surface-2 px-4 py-4">
                            <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-[var(--border)] pb-4">
                              <span className="text-xs uppercase tracking-wide text-muted">Роль</span>
                              {currentUser?.id === u.id ? (
                                <>
                                  <Badge kind={role.kind}>{role.label}</Badge>
                                  <span className="text-xs text-muted">это вы — вашу роль меняет другой организатор</span>
                                </>
                              ) : (
                                <div className="seg" role="group" aria-label={`Роль ${userName(u)}`} aria-busy={roleBusyId === u.id}>
                                  {ROLES.map((r) => (
                                    <button
                                      key={r}
                                      type="button"
                                      className="seg-btn"
                                      aria-pressed={u.role === r}
                                      disabled={roleBusyId === u.id}
                                      title={ROLE_HINT[r]}
                                      onClick={() => u.role !== r && changeRole(u, r)}
                                    >
                                      <span>{roleBadge(r, subName).label}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                              {roleError[u.id] && <span className="text-sm text-danger">{roleError[u.id]}</span>}
                              <a
                                href={`/profile/${u.login}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost btn-sm ml-auto"
                              >
                                <span>Полная статистика ↗</span>
                              </a>
                            </div>
                            {u.isPlaceholder && (
                              <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-4">
                                <span className="text-xs uppercase tracking-wide text-muted">Доступ игроку</span>
                                <button
                                  type="button"
                                  className="btn btn-cyan btn-sm"
                                  disabled={claimBusy === u.id}
                                  onClick={() => makeClaimLink(u)}
                                >
                                  <span>{claimBusy === u.id ? "…" : claimLink[u.id] ? "Ссылка активна" : "Выдать доступ по ссылке"}</span>
                                </button>
                                {claimLink[u.id] && (
                                  <>
                                    <input
                                      readOnly
                                      value={claimLink[u.id]}
                                      onFocus={(e) => e.currentTarget.select()}
                                      className="input h-8 min-w-0 flex-1 text-xs"
                                    />
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(claimLink[u.id])}>
                                      <span>Копировать</span>
                                    </button>
                                    <button type="button" className="btn btn-ghost btn-sm" disabled={claimBusy === u.id} onClick={() => makeClaimLink(u, true)}>
                                      <span>Новая</span>
                                    </button>
                                  </>
                                )}
                                <span className="w-full text-xs text-muted">
                                  Одноразовая: игрок задаёт пароль и сразу входит. Ссылка действует, пока аккаунт не активирован.
                                </span>
                              </div>
                            )}
                            {prof === undefined || prof === "loading" ? (
                              <p className="text-sm text-muted">Загрузка истории участия…</p>
                            ) : prof === "error" ? (
                              <p className="text-sm text-danger">Не удалось загрузить историю участия.</p>
                            ) : prof.history.length ? (
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                                  <span>MMR 1×1 <b className="text-primary-2 tnum">{prof.mmr1x1.currentMmr}</b></span>
                                  <span>Винрейт <b className="tnum">{prof.mmr1x1.winrate}%</b> ({prof.mmr1x1.wins}–{prof.mmr1x1.losses})</span>
                                  {prof.mmr1x1.place > 0 && <span>Место <b className="tnum">#{prof.mmr1x1.place}</b></span>}
                                  <span>Команд <b className="tnum">{prof.teams.length}</b></span>
                                  {prof.mmr1x1.bestWinStreak > 0 && <span>Вин-стрик <b className="tnum">{prof.mmr1x1.bestWinStreak}</b></span>}
                                </div>
                                <div className="text-xs uppercase tracking-wide text-muted">
                                  Участие в матчах · {prof.history.length}
                                  {u.participations > u.tournaments ? ` · завершённых ${u.tournaments}` : ""}
                                </div>
                                {prof.history.map((h, i) => (
                                  <div
                                    key={`${h.tournamentId}-${i}`}
                                    className={`flex items-center justify-between gap-3 rounded-md bg-surface p-2.5 ${
                                      h.win
                                        ? "shadow-[inset_0_0_0_1px_rgba(255,197,61,0.45)]"
                                        : "shadow-[inset_0_0_0_1px_var(--border)]"
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate font-display text-sm uppercase">{h.title || h.name}</div>
                                      <div className="truncate text-xs text-muted">
                                        {h.mode}
                                        {h.date ? ` · ${fmtDate(h.date)}` : ""} · {h.name}
                                      </div>
                                    </div>
                                    <div className="flex flex-none items-center gap-3">
                                      {h.mmrDelta != null && h.mmrDelta !== 0 && (
                                        <span className={`font-display text-sm tnum ${h.mmrDelta > 0 ? "text-ok" : "text-danger"}`}>
                                          {h.mmrDelta > 0 ? "+" : ""}
                                          {h.mmrDelta} MMR
                                        </span>
                                      )}
                                      {h.status === "finished" ? (
                                        h.win ? (
                                          <Badge kind="champ">Победа</Badge>
                                        ) : (
                                          <StatusPill status="done">Завершён</StatusPill>
                                        )
                                      ) : (
                                        <StatusPill status="soon">Идёт</StatusPill>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted">Пока не участвовал в матчах.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title={query ? "Никого не найдено" : "Пользователей пока нет"}
          hint={query ? "Измени запрос поиска." : "Здесь появятся зарегистрированные пользователи."}
        />
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="seg-btn disabled:cursor-not-allowed disabled:opacity-40"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <span>‹ Назад</span>
          </button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-muted">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className="seg-btn disabled:opacity-40"
                aria-pressed={p === page}
                disabled={loading}
                onClick={() => setPage(p)}
              >
                <span>{p + 1}</span>
              </button>
            ),
          )}
          <button
            type="button"
            className="seg-btn disabled:cursor-not-allowed disabled:opacity-40"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            <span>Вперёд ›</span>
          </button>
        </div>
      )}
    </div>
  );
}
