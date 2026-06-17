"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { registrationMatches } from "@/lib/display";
import { fmtDate } from "@/lib/format";
import type { Registration } from "@/lib/types";

const PREVIEW = 30;

/** Общий пул заявок: кто подал раньше — выше. Постановка в турнир — в «Расписании»
    (при добавлении участника); здесь можно только отклонить лишние. */
export function RegistrationsManager() {
  const [regs, setRegs] = React.useState<Registration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [showAll, setShowAll] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.get<Registration[]>("/registrations/pool");
        if (active) setRegs(data);
      } catch {
        if (active) setRegs([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function decline(id: string) {
    setBusyId(id);
    try {
      await api.post(`/registrations/${id}/decide`, { status: "declined" });
      setRegs((xs) => xs.filter((x) => x.id !== id));
    } catch {
      /* оставим как есть */
    } finally {
      setBusyId(null);
    }
  }

  const filtered = regs.filter((r) => registrationMatches(r, query));
  const visible = showAll ? filtered : filtered.slice(0, PREVIEW);
  const hidden = filtered.length - visible.length;
  // позиция в очереди по времени подачи (стабильна при фильтре)
  const posOf = new Map(regs.map((r, i) => [r.id, i + 1]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl">Заявки (пул)</h2>
          <p className="text-sm text-muted">
            Общий список желающих сыграть. Кто подал раньше — выше. Чтобы поставить игрока в турнир,
            открой «Расписание» → нужный турнир → «Из заявок».
          </p>
        </div>
        <span className="whitespace-nowrap text-sm text-muted">Всего: {regs.length}</span>
      </div>

      {!loading && regs.length > 0 && (
        <input
          className="input max-w-md"
          placeholder="Поиск по нику или Embark ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {loading ? (
        <Panel className="px-5 py-10 text-center text-muted">Загрузка…</Panel>
      ) : !regs.length ? (
        <EmptyState title="Заявок нет" hint="Пока никто не подал заявку на участие." />
      ) : !filtered.length ? (
        <Panel className="px-5 py-10 text-center text-muted">Ничего не найдено.</Panel>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Игрок</th>
                <th className="px-4 py-3">Embark ID</th>
                <th className="px-4 py-3">Удобные даты / пожелания</th>
                <th className="px-4 py-3">Подал</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 text-muted tnum">{posOf.get(r.id)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.userDisplayName || r.userLogin} src={r.userAvatarUrl} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate font-display text-sm uppercase">
                          {r.userDisplayName || r.userLogin || "—"}
                        </div>
                        {r.userLogin && <div className="truncate text-xs text-muted">@{r.userLogin}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 tnum">{r.embarkId || "—"}</td>
                  <td className="px-4 py-3 text-muted">{r.note || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted">{fmtDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={busyId === r.id}
                        onClick={() => decline(r.id)}
                      >
                        <span>Отклонить</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hidden > 0 && (
            <button
              type="button"
              className="w-full border-t border-[var(--border)] px-5 py-3 text-center text-xs uppercase tracking-wide text-muted hover:text-fg"
              onClick={() => setShowAll(true)}
            >
              Показать ещё {hidden}
            </button>
          )}
          {showAll && filtered.length > PREVIEW && (
            <button
              type="button"
              className="w-full border-t border-[var(--border)] px-5 py-3 text-center text-xs uppercase tracking-wide text-muted hover:text-fg"
              onClick={() => setShowAll(false)}
            >
              Свернуть
            </button>
          )}
        </div>
      )}
    </div>
  );
}
