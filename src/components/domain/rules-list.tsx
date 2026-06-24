"use client";

import * as React from "react";
import type { ReactNode } from "react";
import type { CatalogComplication, CatalogLegendary, CatalogTask } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtDate, pointsLabel } from "@/lib/format";

const KIND_LABEL: Record<string, string> = {
  pve: "PvE",
  pvp: "PvP",
  pvpve: "PvPvE",
};

/** Фильтр по номеру (точное/префикс) или подстроке текста. */
function matches<T extends { text: string }>(it: T & { num: number }, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return String(it.num) === s || String(it.num).startsWith(s) || it.text.toLowerCase().includes(s);
}

function SourceTag({ source, author, title }: { source: string; author?: string; title?: string }) {
  if (source === "boosty") {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Badge kind="boosty">Boosty</Badge>
        {(title || author) && (
          <span className="text-xs text-muted">
            {title}
            {title && author ? " · " : ""}
            {author}
          </span>
        )}
      </span>
    );
  }
  return <Badge kind="official">official</Badge>;
}

function CatalogItem({
  num,
  text,
  meta,
  pts,
  ptsTone,
}: {
  num: number;
  text: string;
  meta: ReactNode;
  pts: string;
  ptsTone: "pts-cyan" | "pts-orange" | "pts-minus";
}) {
  return (
    <li className="flex items-start gap-3 border-b border-[var(--border)] py-3 last:border-0">
      <span className="mt-0.5 w-7 flex-none text-right font-display text-sm text-muted tnum">{num}</span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm leading-snug">{text}</p>
        <div className="flex flex-wrap items-center gap-2">{meta}</div>
      </div>
      <span className={`pts ${ptsTone} mt-0.5 flex-none`}>
        <span>{pts}</span>
      </span>
    </li>
  );
}

/** Один легендарный контракт: текст, источник, статус и (если выполнен) журнальная запись. */
function LegendaryItem({ num, item }: { num: number; item: CatalogLegendary }) {
  const done = item.status === "done";
  const c = item.completion;
  return (
    <li className="flex items-start gap-3 border-b border-[var(--border)] py-3 last:border-0">
      <span className="mt-0.5 w-7 flex-none text-right font-display text-sm text-muted tnum">{num}</span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm leading-snug">{item.text}</p>
        <div className="flex flex-wrap items-center gap-2">
          {KIND_LABEL[item.kind] && (
            <span className="chip">
              <span>{KIND_LABEL[item.kind]}</span>
            </span>
          )}
          <SourceTag source={item.source} author={item.author} title={item.title} />
          <span className={`pill ${done ? "pill-done" : "pill-ok"}`}>
            <span>{done ? "Выполнен" : "Доступен"}</span>
          </span>
        </div>
        {done && c && (
          <div className="text-xs text-muted">
            {c.nickname}
            {c.map ? ` · ${c.map}` : ""}
            {c.completedAt ? ` · ${fmtDate(c.completedAt)}` : ""}
          </div>
        )}
      </div>
      <span className="pts pts-orange mt-0.5 flex-none">
        <span>+{pointsLabel(item.points)}</span>
      </span>
    </li>
  );
}

export function RulesList({
  tasks,
  complications,
  legendary = [],
}: {
  tasks: CatalogTask[];
  complications: CatalogComplication[];
  legendary?: CatalogLegendary[];
}) {
  const [q, setQ] = React.useState("");
  // Номер = позиция в общем списке (тот же порядок, что в кабинете и эфире).
  const numTasks = tasks.map((t, i) => ({ ...t, num: i + 1 }));
  const numComps = complications.map((c, i) => ({ ...c, num: i + 1 }));
  const numLegendary = legendary.map((l, i) => ({ item: l, num: i + 1, text: l.text }));
  const shownTasks = numTasks.filter((t) => matches(t, q));
  const shownComps = numComps.filter((c) => matches(c, q));
  const shownLegendary = numLegendary.filter((l) => matches(l, q));

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по номеру или тексту…"
          className="input pl-9"
          aria-label="Поиск контрактов и протоколов"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel glow className="p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg uppercase">Контракты</h3>
            <span className="text-xs text-muted">2 контракта на раунд</span>
          </div>
          {shownTasks.length ? (
            <ul>
              {shownTasks.map((t) => (
                <CatalogItem
                  key={t.id}
                  num={t.num}
                  text={t.text}
                  // Контракт даёт фиксированные +2 балла (свой; чужой — +1, см. правила).
                  pts="+2 балла"
                  ptsTone="pts-cyan"
                  meta={
                    <>
                      {KIND_LABEL[t.kind] && (
                        <span className="chip">
                          <span>{KIND_LABEL[t.kind]}</span>
                        </span>
                      )}
                      <SourceTag source={t.source} author={t.author} title={t.title} />
                    </>
                  }
                />
              ))}
            </ul>
          ) : (
            <EmptyState title={q ? "Ничего не найдено" : "Контрактов пока нет"} />
          )}
        </Panel>

        <Panel glow className="p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg uppercase">Протоколы</h3>
            <span className="text-xs text-muted">1 на турнир</span>
          </div>
          {shownComps.length ? (
            <ul>
              {shownComps.map((c) => (
                <CatalogItem
                  key={c.id}
                  num={c.num}
                  text={c.text}
                  // Протокол не влияет на очки: штраф — минуты в рейде за нарушение.
                  pts="−1 минута за нарушение"
                  ptsTone="pts-minus"
                  meta={<SourceTag source={c.source} author={c.author} title={c.title} />}
                />
              ))}
            </ul>
          ) : (
            <EmptyState title={q ? "Ничего не найдено" : "Протоколов пока нет"} />
          )}
        </Panel>
      </div>

      <Panel glow className="p-6">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-lg uppercase">Легендарные контракты</h3>
          <span className="text-xs text-muted">10 баллов · один раз навсегда</span>
        </div>
        {shownLegendary.length ? (
          <ul>
            {shownLegendary.map((l) => (
              <LegendaryItem key={l.item.id} num={l.num} item={l.item} />
            ))}
          </ul>
        ) : (
          <EmptyState title={q ? "Ничего не найдено" : "Легендарных контрактов пока нет"} />
        )}
      </Panel>
    </div>
  );
}
