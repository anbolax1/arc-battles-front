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

function SourceTag({
  source,
  author,
  title,
}: {
  source: string;
  author?: string;
  title?: string;
}) {
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
  text,
  meta,
  pts,
  ptsTone,
}: {
  text: string;
  meta: ReactNode;
  pts: string;
  ptsTone: "pts-cyan" | "pts-orange" | "pts-minus";
}) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-3 last:border-0">
      <div className="min-w-0 space-y-1.5">
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
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel glow className="p-6">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-lg uppercase">Бонусные задания</h3>
          <span className="text-xs text-muted">2 задания на раунд</span>
        </div>
        {tasks.length ? (
          <ul>
            {tasks.map((t) => (
              <CatalogItem
                key={t.id}
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
          <EmptyState title="Заданий пока нет" />
        )}
      </Panel>

      <Panel glow className="p-6">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-lg uppercase">Усложнения</h3>
          <span className="text-xs text-muted">1 на раунд</span>
        </div>
        {complications.length ? (
          <ul>
            {complications.map((c) => (
              <CatalogItem
                key={c.id}
                text={c.text}
                pts={complicationPenalty(c)}
                ptsTone="pts-minus"
                meta={<SourceTag source={c.source} author={c.author} title={c.title} />}
              />
            ))}
          </ul>
        ) : (
          <EmptyState title="Усложнений пока нет" />
        )}
      </Panel>
    </div>
  );
}
