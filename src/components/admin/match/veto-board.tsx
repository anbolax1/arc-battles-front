"use client";

import * as React from "react";
import { Panel } from "@/components/ui/card";
import { mapImage } from "@/lib/match";
import type { MapInfo, MatchState, Participant, VetoAction } from "@/lib/types";

/** Порядок пиков-банов 3 сезона: бан A, бан B, пик A (1-й раунд), бан B, бан A, оставшаяся - 2-й раунд. */
const ORDER: Array<{ action: VetoAction["action"]; side: "A" | "B" | ""; round?: number }> = [
  { action: "ban", side: "A" },
  { action: "ban", side: "B" },
  { action: "pick", side: "A", round: 1 },
  { action: "ban", side: "B" },
  { action: "ban", side: "A" },
  { action: "rest", side: "", round: 2 },
];

function stepLabel(s: (typeof ORDER)[number]): string {
  if (s.action === "ban") return `Бан ${s.side}`;
  if (s.action === "pick") return `Пик ${s.side} · раунд ${s.round}`;
  return `Остаток · раунд ${s.round}`;
}

export function VetoBoard({
  st,
  maps,
  sides,
  busy,
  onPick,
  onUndo,
  onManual,
  onStart,
}: {
  st: MatchState;
  maps: MapInfo[];
  sides: [Participant | null, Participant | null];
  busy: boolean;
  onPick: (code: string) => void;
  onUndo: () => void;
  onManual: (codes: string[]) => void;
  onStart: () => void;
}) {
  const [manual, setManual] = React.useState<string[] | null>(null);
  const turn = st.veto.length;
  const rounds = st.tournament.rounds ?? [];
  const ready = rounds.length > 0 && rounds.every((r) => r.map);
  const vetoDone = turn >= ORDER.length || (ready && turn === 0);
  const cur = vetoDone ? null : ORDER[turn];
  const nameOf = (side: string) => (side === "A" ? sides[0]?.name : side === "B" ? sides[1]?.name : "") || side;
  const byCode = new Map(st.veto.map((v) => [v.mapCode, v]));

  if (manual) {
    return (
      <Panel className="space-y-4 p-5">
        <div className="space-y-1">
          <h3 className="font-display text-lg uppercase">Карты без пиков-банов</h3>
          <p className="text-sm text-muted">Для шоуматча: выберите карту каждого раунда по порядку.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((m) => {
            const idx = manual.indexOf(m.code);
            return (
              <button
                key={m.code}
                type="button"
                onClick={() =>
                  setManual((xs) =>
                    !xs ? xs : idx >= 0 ? xs.filter((c) => c !== m.code) : xs.length < rounds.length ? [...xs, m.code] : xs,
                  )
                }
                className={`relative h-28 overflow-hidden rounded-lg text-left ${idx >= 0 ? "ring-2 ring-[var(--accent)]" : ""}`}
              >
                <MapBg code={m.code} dim={idx < 0} />
                <span className="absolute bottom-2 left-3 font-display text-sm uppercase drop-shadow">{m.name}</span>
                {idx >= 0 && <span className="absolute right-2 top-2 badge badge-glad"><span>Раунд {idx + 1}</span></span>}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setManual(null)}>
            <span>Назад к пикам</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy || manual.length !== rounds.length}
            onClick={() => {
              onManual(manual);
              setManual(null);
            }}
          >
            <span>Сохранить карты</span>
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel className="flex flex-wrap items-center gap-x-8 gap-y-2 p-5" aria-live="polite">
        <div className="space-y-1">
          <span className="field-label">{vetoDone ? "Карты определены" : `Ход ${turn + 1} из ${ORDER.length}`}</span>
          <div
            className={`font-display text-2xl uppercase ${
              vetoDone ? "text-ok" : cur?.action === "ban" ? "text-danger" : "text-accent"
            }`}
          >
            {vetoDone
              ? rounds.map((r) => r.map).join(" · ")
              : `${cur?.action === "ban" ? "Бан" : "Пик"} — ${nameOf(cur?.side ?? "")} (${cur?.side})`}
          </div>
        </div>
        <p className="min-w-0 flex-1 text-sm text-muted">
          {vetoDone
            ? "Задания на эти карты раздадутся сами, когда начнётся раунд."
            : cur?.action === "ban"
              ? "Убирает одну карту из пула."
              : "Выбирает карту 1-го раунда. Последняя оставшаяся карта уйдёт во 2-й раунд."}
        </p>
      </Panel>

      {!(ready && turn === 0) && (
        <ol className="flex flex-wrap gap-2">
          {ORDER.map((s, i) => {
            const done = st.veto[i];
            const now = i === turn && !vetoDone;
            return (
              <li
                key={i}
                className={`min-w-[140px] flex-1 rounded-md px-3 py-2 ${
                  now ? "bg-[rgba(255,106,26,0.12)] shadow-[inset_0_0_0_1px_rgba(255,106,26,0.55)]" : "bg-surface shadow-[inset_0_0_0_1px_var(--border)]"
                }`}
              >
                <div className={`font-display text-[0.68rem] uppercase ${s.action === "ban" ? "text-danger" : "text-accent"}`}>
                  {i + 1} · {stepLabel(s)}
                </div>
                <div className={`text-sm ${done ? "" : "text-muted"}`}>{done?.mapName ?? (now ? "сейчас" : "—")}</div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {maps.map((m) => {
          const v = byCode.get(m.code);
          const round = rounds.find((r) => r.mapCode === m.code)?.number;
          const banned = v?.action === "ban";
          const disabled = busy || vetoDone || !!v;
          return (
            <button
              key={m.code}
              type="button"
              disabled={disabled}
              onClick={() => onPick(m.code)}
              aria-label={v ? `${m.name}: ${banned ? "бан" : `раунд ${round}`}` : `${cur?.action === "ban" ? "Забанить" : "Выбрать"} ${m.name}`}
              className={`group relative h-40 overflow-hidden rounded-lg text-left transition ${
                round ? "ring-2 ring-[var(--accent)]" : ""
              } ${!disabled ? "hover:-translate-y-1" : ""} ${banned ? "opacity-50" : ""}`}
            >
              <MapBg code={m.code} dim={banned} />
              <span
                className={`absolute bottom-10 left-4 right-4 font-display text-lg uppercase drop-shadow ${banned ? "line-through" : ""}`}
              >
                {m.name}
              </span>
              <span className="absolute bottom-3 left-4">
                {banned ? (
                  <span className="badge bg-[rgba(255,107,107,0.85)] text-black">
                    <span>Бан · {nameOf(v?.side ?? "")}</span>
                  </span>
                ) : round ? (
                  <span className="badge bg-[var(--accent)] text-[#06232a]">
                    <span>Раунд {round}{v?.action === "pick" ? ` · пик ${nameOf(v.side)}` : ""}</span>
                  </span>
                ) : !vetoDone ? (
                  <span className="badge bg-black/60 text-fg opacity-80 group-hover:opacity-100">
                    <span>{cur?.action === "ban" ? "Нажмите — бан" : "Нажмите — пик"}</span>
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy || turn === 0} onClick={onUndo}>
          <span>↶ Отменить ход</span>
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setManual([])}>
          <span>Без пиков (шоуматч)</span>
        </button>
        <span className="min-w-0 flex-1 text-xs text-muted">Зрители видят ходы в оверлее сразу (виджет «Пики-баны»).</span>
        <button type="button" className="btn btn-primary" disabled={busy || !ready} onClick={onStart}>
          <span>Начать матч →</span>
        </button>
      </div>
    </div>
  );
}

function MapBg({ code, dim }: { code: string; dim?: boolean }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mapImage(code)} alt="" className={`absolute inset-0 h-full w-full object-cover ${dim ? "grayscale" : ""}`} />
      <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
    </>
  );
}
