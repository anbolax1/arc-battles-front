"use client";

import * as React from "react";
import type { CatalogLegendary, CatalogTask, MapInfo } from "@/lib/types";
import { mapImage } from "@/lib/match";
import { pointsLabel } from "@/lib/format";
import { KIND_LABEL, rulesCatalog } from "@/components/domain/rules-list";
import { SearchGlyph } from "@/components/surface/ui";
import { fullDate } from "@/components/surface/fmt";

/** Подпись источника: задания подписчиков Boosty - с названием и автором, официальные - без подписи. */
function sourceLine(it: { source: string; title?: string; author?: string }): string {
  if (it.source !== "boosty") return "";
  return ["Boosty", it.title, it.author].filter(Boolean).join(" · ");
}

function Item({ num, name, text, points, meta, tone, children }: { num: number; name?: string; text: string; points: number; meta?: string; tone: string; children?: React.ReactNode }) {
  return (
    <li className="rl-item">
      <span className="rl-num">{num}</span>
      <span className="rl-body">
        {name && <b>{name}</b>}
        <span>{text}</span>
        {meta && <small>{meta}</small>}
        {children}
      </span>
      <span className={`rl-pts ${tone}`}>+{pointsLabel(points)}</span>
    </li>
  );
}

/** Справочник заданий в новом дизайне: пул PvP или PvE, поиск по номеру или тексту, протоколы и легендарные задания. */
export function RulesCatalog({ tasks, legendary, maps }: { tasks: CatalogTask[]; legendary: CatalogLegendary[]; maps: MapInfo[] }) {
  const [q, setQ] = React.useState("");
  const [pool, setPool] = React.useState<"pvp" | "pve">("pvp");
  const cat = rulesCatalog(tasks, legendary, maps, pool, q);
  const map = (code: string) => maps.find((m) => m.code === code);
  const nothing = q ? "Ничего не найдено — попробуй номер или другое слово." : "";

  return (
    <section className="sf-sec sf-paper sf-grain rl-cat" id="tasks" aria-labelledby="rl-t">
      <div className="sf-wrap">
        <div className="sf-sec-head">
          <div>
            <p className="sf-eyebrow">Справочник · перед раундом два задания и протокол</p>
            <h2 className="sf-h-big" id="rl-t">
              задания<span className="sf-dot">.</span>
            </h2>
          </div>
          <div className="sf-controls rl-controls">
            <div className="sf-seg" role="tablist" aria-label="Пул заданий">
              {(["pvp", "pve"] as const).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={pool === k} onClick={() => setPool(k)}>
                  {k === "pvp" ? "Задания PvP" : "Задания PvE"}
                </button>
              ))}
            </div>
            <label className="sf-search">
              <SearchGlyph />
              <input type="search" placeholder="Номер или текст" autoComplete="off" aria-label="Поиск заданий и протоколов" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
          </div>
        </div>

        <div className="rl-cols">
          <div>
            {cat.groups.length ? (
              cat.groups.map((g) => {
                const m = g.code ? map(g.code) : undefined;
                return (
                  <div key={g.code || "common"} className="rl-group">
                    <h3 className="rl-group-head">
                      {/* eslint-disable-next-line @next/next/no-img-element -- превью карты */}
                      {m && <img src={mapImage(m.code)} alt="" loading="lazy" />}
                      <span>{m ? m.name : g.code ? g.code : "Общие задания"}</span>
                      <small>{m ? "на карту раунда" : "на любой карте"}</small>
                    </h3>
                    <ul className="rl-list">
                      {g.items.map((t) => (
                        <Item key={t.id} num={t.num} name={t.name} text={t.text} points={t.points} meta={sourceLine(t)} tone="task" />
                      ))}
                    </ul>
                  </div>
                );
              })
            ) : (
              <p className="sf-note">{nothing || "Заданий пока нет."}</p>
            )}
          </div>

          <aside className="rl-side" aria-labelledby="rl-proto">
            <h3 className="sf-h-mid" id="rl-proto">
              протоколы<span className="sf-dot">.</span>
            </h3>
            <p className="rl-sub">Один на раунд · выполнить до 15-й минуты рейда</p>
            {cat.protocols.length ? (
              <ul className="rl-list">
                {cat.protocols.map((c) => (
                  <Item key={c.id} num={c.num} name={c.name} text={c.text} points={c.points} meta={sourceLine(c)} tone="proto" />
                ))}
              </ul>
            ) : (
              <p className="sf-note">{nothing || "Протоколов пока нет."}</p>
            )}
          </aside>
        </div>

        <div className="sf-block" aria-labelledby="rl-leg">
          <h3 className="sf-h-mid" id="rl-leg">
            легендарные задания<span className="sf-dot">.</span>
          </h3>
          <p className="rl-sub">10 баллов · каждое можно выполнить один раз навсегда</p>
          {cat.legendary.length ? (
            <ul className="rl-list rl-legs">
              {cat.legendary.map((l) => {
                const c = l.completion;
                return (
                  <Item key={l.id} num={l.num} text={l.text} points={l.points} meta={[KIND_LABEL[l.kind], sourceLine(l)].filter(Boolean).join(" · ")} tone="leg">
                    {l.status === "done" ? (
                      <em className="rl-done">
                        выполнено{c ? ` · ${[c.nickname, c.map, c.completedAt ? fullDate(c.completedAt) : ""].filter(Boolean).join(" · ")}` : ""}
                      </em>
                    ) : (
                      <em className="rl-open">доступно</em>
                    )}
                  </Item>
                );
              })}
            </ul>
          ) : (
            <p className="sf-note">{nothing || "Легендарных заданий пока нет."}</p>
          )}
        </div>
      </div>
    </section>
  );
}
