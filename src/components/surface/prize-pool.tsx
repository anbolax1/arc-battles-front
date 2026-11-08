"use client";

import type { CSSProperties } from "react";
import { SteamIcon } from "@/components/icons";
import type { Season } from "@/lib/types";
import { CountUp, GrowOnView } from "@/components/surface/motion";
import { SecHead } from "@/components/surface/ui";
import { dayMonth } from "@/components/surface/fmt";
import "@/components/surface/prize-pool.css";

// Разряды вручную: toLocaleString на сервере и в браузере ставит разные пробелы, и разметка не совпадёт.
export const rub = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₽`;

/** Мест больше этого - суммы в колонках мельче. */
const DENSE_FROM = 6;
/** Самая низкая ступень не ниже этой доли первой: приз в сотню рублей рядом с миллионом не пропадает. */
const MIN_STEP = 0.12;

/** Призы сезона по местам, первое - первым; без призов - пустой список. */
export function seasonPrizePlaces(season?: Season | null): number[] {
  return (season?.prizes?.places ?? []).filter((v) => v > 0);
}

/** Призовой фонд сезона на главной: места ступенями пьедестала, суммы докручиваются при появлении.
    Призы задаёт организатор в настройках сезона; без них блока нет. */
export function PrizePool({ season }: { season?: Season }) {
  const places = seasonPrizePlaces(season);
  if (!season || !places.length) return null;
  const total = season.prizes.pool || places.reduce((s, v) => s + v, 0);
  const top = Math.max(...places);
  const note = season.prizes.note?.trim();
  return (
    <section className="sf-sec sf-night sf-grain pz" aria-labelledby="pz-t">
      <div className="sf-wrap">
        <SecHead
          id="pz-t"
          eyebrow={`${season.number ?? ""} сезон${season.endedAt ? ` · до ${dayMonth(season.endedAt)}` : ""}`.trim()}
          title="призовой фонд"
          action={
            <p className="pz-total">
              <small>всего</small>
              <CountUp value={total} format={rub} />
            </p>
          }
        />
        <GrowOnView
          as="ol"
          className={`pz-steps${places.length >= DENSE_FROM ? " pz-dense" : ""}`}
          style={{ "--n": places.length } as CSSProperties}
        >
          {places.map((v, i) => (
            // Ступени встают с последнего места, первое - последним.
            <li
              key={i}
              className={`pz-step pz-${i + 1}${i >= 3 ? " pz-n" : ""}`}
              style={{ "--h": Math.max(v / top, MIN_STEP), "--k": places.length - 1 - i } as CSSProperties}
            >
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
        {note && (
          <p className="pz-note">
            {/* Значок Steam - только если в подписи речь про Steam. */}
            {/steam/i.test(note) && <SteamIcon />}
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
