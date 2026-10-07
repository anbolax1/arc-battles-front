"use client";

import * as React from "react";

export interface RoundTaskView {
  id: string;
  who: string;
  name: string;
  /** own - выполнил владелец, cross - соперник, miss - не выполнено. */
  result: "own" | "cross" | "miss";
  points: number;
  by?: string;
}

/** Раунд последнего матча: карта и счёт, по нажатию раскрываются задания сторон. */
export function RoundCard({
  n,
  map,
  image,
  scoreA,
  scoreB,
  scored,
  tasks,
}: {
  n: number;
  map: string;
  image: string;
  scoreA: number;
  scoreB: number;
  scored: boolean;
  tasks: RoundTaskView[];
}) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const can = tasks.length > 0;
  return (
    <article className={`sf-round ${can ? "can-open" : ""} ${open ? "open" : ""}`} onClick={(e) => can && !(e.target as Element).closest(".sf-round-tasks") && setOpen((o) => !o)}>
      <div className="sf-duo">
        {/* eslint-disable-next-line @next/next/no-img-element -- превью карты */}
        {image && <img src={image} alt="" loading="lazy" />}
      </div>
      <span className="sf-round-score sf-tnum" aria-label={scored ? `Счёт раунда ${scoreA}:${scoreB}` : "Счёт не вёлся"}>
        {scored ? (
          <>
            <span className={scoreA >= scoreB ? "" : "l"}>{scoreA}</span> : <span className={scoreB >= scoreA ? "" : "l"}>{scoreB}</span>
          </>
        ) : (
          "—"
        )}
      </span>
      <div className="sf-round-body">
        <span className="sf-round-n">Раунд {n}</span>
        <span className="sf-round-map">{map || "Карта не указана"}</span>
        {can && (
          <button
            type="button"
            className="sf-round-hint"
            aria-expanded={open}
            aria-controls={id}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
          >
            задания раунда ▾
          </button>
        )}
      </div>
      {can && (
        <div className="sf-round-tasks" id={id}>
          <div>
            <ul>
              {tasks.map((t) => (
                <li key={t.id} className={t.result === "miss" ? "miss" : ""}>
                  <span className="who">{t.who}</span>
                  <span>{t.name}</span>
                  <span className="pts">{t.result === "own" ? `+${t.points}` : t.result === "cross" ? `+1 ${t.by ?? ""}` : "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </article>
  );
}
