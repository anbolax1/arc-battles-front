"use client";

import * as React from "react";
import type { LeaderboardRow } from "@/lib/types";
import { LeaderboardTable } from "./leaderboard-table";

/** Переключатель рейтинга 1×1 / 2×2 (клиентский — состояние таба + клавиши). */
export function RatingTabs({ solo, duo }: { solo: LeaderboardRow[]; duo: LeaderboardRow[] }) {
  const [tab, setTab] = React.useState<"1x1" | "2x2">("1x1");

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setTab((t) => (t === "1x1" ? "2x2" : "1x1"));
    }
  }

  return (
    <div className="space-y-5">
      <div className="tabs" role="tablist" aria-label="Режим рейтинга" onKeyDown={onKey}>
        <button
          type="button"
          role="tab"
          id="tab-1x1"
          aria-selected={tab === "1x1"}
          aria-controls="panel-1x1"
          tabIndex={tab === "1x1" ? 0 : -1}
          className="tab"
          onClick={() => setTab("1x1")}
        >
          <span>Одиночный 1×1</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-2x2"
          aria-selected={tab === "2x2"}
          aria-controls="panel-2x2"
          tabIndex={tab === "2x2" ? 0 : -1}
          className="tab"
          onClick={() => setTab("2x2")}
        >
          <span>Составы 2×2</span>
        </button>
      </div>

      <div role="tabpanel" id="panel-1x1" aria-labelledby="tab-1x1" hidden={tab !== "1x1"}>
        <LeaderboardTable rows={solo} kind="1x1" />
      </div>
      <div role="tabpanel" id="panel-2x2" aria-labelledby="tab-2x2" hidden={tab !== "2x2"}>
        <LeaderboardTable rows={duo} kind="2x2" />
      </div>
    </div>
  );
}
