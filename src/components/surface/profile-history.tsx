"use client";

import * as React from "react";
import Link from "next/link";
import type { PlayerHistoryItem } from "@/lib/types";
import { fullDate, matchesWord } from "@/components/surface/fmt";
import { signed } from "@/components/surface/ui";

const FIRST = 8;

/** Матчи игрока (1×1 и 2×2): сначала последние, остальные - по кнопке. */
export function ProfileHistory({ items }: { items: PlayerHistoryItem[] }) {
  const [all, setAll] = React.useState(false);
  if (!items.length) return <p className="sf-note">Здесь появятся матчи игрока.</p>;
  const shown = all ? items : items.slice(0, FIRST);
  return (
    <>
      <ul className="sf-hist">
        {shown.map((h) => {
          const done = h.status === "finished";
          return (
            <li key={h.tournamentId}>
              <Link href={`/tournament/${h.tournamentId}`}>
                <span className={`sf-res ${!done ? "c pf-live" : h.win ? "w" : "l"}`}>{!done ? "идёт" : h.win ? "победа" : "поражение"}</span>
                <span>
                  <b>{(h.title || h.name).replace(/^\[история\]\s*/, "")}</b>
                  <small>
                    {h.mode}
                    {h.date ? ` · ${fullDate(h.date)}` : ""}
                    {h.mode === "2x2" && h.name ? ` · ${h.name}` : ""}
                  </small>
                </span>
                {h.mmrDelta ? <span className={`d ${h.mmrDelta > 0 ? "sf-up" : "sf-down"}`}>{signed(h.mmrDelta)}</span> : <span />}
              </Link>
            </li>
          );
        })}
      </ul>
      {items.length > FIRST && (
        <button type="button" className="sf-more pf-toggle" onClick={() => setAll((v) => !v)} aria-expanded={all}>
          {all ? "Свернуть" : `Показать все ${items.length} ${matchesWord(items.length)}`}
        </button>
      )}
    </>
  );
}
