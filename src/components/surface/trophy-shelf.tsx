import type { CSSProperties } from "react";
import Link from "next/link";
import { BannerCloth } from "@/components/surface/banner-cloth";
import { bannerLook } from "@/components/surface/banner-art";
import type { Trophy } from "@/components/surface/trophies";
import "@/components/surface/trophies.css";

/** Знамёна под фермой арены: по одному на каждый вид трофея, под знаменем - сезоны, когда он взят. */
export function TrophyShelf({ trophies }: { trophies: Trophy[] }) {
  if (!trophies.length) return null;
  return (
    <section className="sf-sec sf-night sf-grain" aria-labelledby="tr-title">
      <div className="sf-wrap">
        <p className="sf-eyebrow">Только закрытые сезоны · остаются навсегда</p>
        <h2 className="sf-h-mid" id="tr-title">
          под сводами арены<span className="sf-dot">.</span>
        </h2>
        <div className="tr-arena">
          <span className="tr-beam left" aria-hidden />
          <span className="tr-beam right" aria-hidden />
          <span className="tr-truss" aria-hidden />
          <ul className="tr-list">
            {trophies.map((t, i) => {
              const look = bannerLook(t.code);
              const numbers = t.wins.map((w) => w.number ?? "—").join("·");
              return (
                <li key={t.code} className="tr-banner" style={{ "--cloth": look.cloth, "--cloth2": look.cloth2, "--trim": look.trim } as CSSProperties}>
                  <h3 className="sr-only">
                    {t.name}
                    {t.maps.length ? `: ${t.maps.join(", ")}` : ""}
                  </h3>
                  <span className="tr-straps" aria-hidden />
                  <span className="tr-rod" aria-hidden />
                  <BannerCloth face={{ code: t.code, title: t.name, maps: t.maps, numbers, word: t.wins.length > 1 ? "сезоны" : "сезон" }} index={i} />
                  <ul className="tr-wins">
                    {t.wins.map((w) => {
                      const body = (
                        <>
                          <small>{w.season}</small>
                          <span>
                            <b>{w.result}</b>
                            {w.note && <i>{w.note}</i>}
                          </span>
                        </>
                      );
                      return (
                        <li key={w.seasonId}>
                          {w.number != null ? (
                            <Link href={`/season/${w.number}`} title={`Итоги: ${w.season}`}>
                              {body}
                            </Link>
                          ) : (
                            <div>{body}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
