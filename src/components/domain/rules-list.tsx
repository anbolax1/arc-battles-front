"use client";

import * as React from "react";
import type { ReactNode } from "react";
import type { CatalogComplication, CatalogTask } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { complicationPenalty, taskReward } from "@/lib/format";

const KIND_LABEL: Record<string, string> = {
  pve: "PvE",
  pvp: "PvP",
  mixed: "Смешанное",
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

export function RulesList({
  tasks,
  complications,
}: {
  tasks: CatalogTask[];
  complications: CatalogComplication[];
}) {
  const [q, setQ] = React.useState("");
  // Номер = позиция в общем списке (тот же порядок, что в кабинете и эфире).
  const numTasks = tasks.map((t, i) => ({ ...t, num: i + 1 }));
  const numComps = complications.map((c, i) => ({ ...c, num: i + 1 }));
  const shownTasks = numTasks.filter((t) => matches(t, q));
  const shownComps = numComps.filter((c) => matches(c, q));

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по номеру или тексту…"
          className="input pl-9"
          aria-label="Поиск заданий и усложнений"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel glow className="p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg uppercase">Бонусные задания</h3>
            <span className="text-xs text-muted">2 задания на раунд</span>
          </div>
          {shownTasks.length ? (
            <ul>
              {shownTasks.map((t) => (
                <CatalogItem
                  key={t.id}
                  num={t.num}
                  text={t.text}
                  pts={taskReward(t)}
                  ptsTone={t.valueType === "percent" ? "pts-orange" : "pts-cyan"}
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
            <EmptyState title={q ? "Ничего не найдено" : "Заданий пока нет"} />
          )}
        </Panel>

        <Panel glow className="p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg uppercase">Усложнения</h3>
            <span className="text-xs text-muted">1 на раунд</span>
          </div>
          {shownComps.length ? (
            <ul>
              {shownComps.map((c) => (
                <CatalogItem
                  key={c.id}
                  num={c.num}
                  text={c.text}
                  pts={complicationPenalty(c)}
                  ptsTone="pts-minus"
                  meta={<SourceTag source={c.source} author={c.author} title={c.title} />}
                />
              ))}
            </ul>
          ) : (
            <EmptyState title={q ? "Ничего не найдено" : "Усложнений пока нет"} />
          )}
        </Panel>
      </div>
    </div>
  );
}
