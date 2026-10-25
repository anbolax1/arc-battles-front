"use client";

import type { CSSProperties } from "react";
import { SteamIcon } from "@/components/icons";
import type { Season } from "@/lib/types";
import { CountUp, GrowOnView } from "@/components/surface/motion";
import { SecHead } from "@/components/surface/ui";
import { dayMonth } from "@/components/surface/fmt";
import "@/components/surface/prize-pool.css";

/** Призовой фонд сезона: рубли за места с первого. Блок виден, только пока идёт этот сезон. */
const PRIZE_SEASON = 4;
const PRIZES = [12000, 9000, 6000, 3000];

// Разряды вручную: toLocaleString на сервере и в браузере ставит разные пробелы, и разметка не совпадёт.
const rub = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0")}\u00a0₽`;

/** Призовой фонд на главной: места ступенями пьедестала, суммы докручиваются при появлении. */
export function PrizePool({ season }: { season?: Season }) {
  if (season?.number !== PRIZE_SEASON) return null;
  const total = PRIZES.reduce((s, v) => s + v, 0);
  return (
    <section className="sf-sec sf-night sf-grain pz" aria-labelledby="pz-t">
      <div className="sf-wrap">
        <SecHead
          id="pz-t"
          eyebrow={`${season.number} сезон${season.endedAt ? ` · до ${dayMonth(season.endedAt)}` : ""}`}
          title="призовой фонд"
          action={
            <p className="pz-total">
              <small>всего</small>
              <CountUp value={total} format={rub} />
            </p>
          }
        />
        <GrowOnView as="ol" className="pz-steps">
          {PRIZES.map((v, i) => (
            // Ступени встают с последнего места, первое - последним.
            <li key={i} className={`pz-step pz-${i + 1}`} style={{ "--h": v / PRIZES[0], "--k": PRIZES.length - 1 - i } as CSSProperties}>
              <p className="pz-place">{i + 1} место</p>
              <p className="pz-amt">
                <CountUp value={v} format={rub} />
              </p>
              <span className="pz-bar" aria-hidden>
                <span className="pz-fill">
                  <b>{i + 1}</b>
                </span>
              </span>
            </li>
          ))}
        </GrowOnView>
        <p className="pz-note">
          <SteamIcon />
          Выплата призовых производится на баланс Steam. Автоматическая конвертация валюты для других стран.
        </p>
      </div>
    </section>
  );
}
