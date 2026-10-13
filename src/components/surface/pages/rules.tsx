import Link from "next/link";
import "./rules.css";
import { getCurrentMatch, getMaps, getMatch, getRules, getSeasons, getTournaments } from "@/lib/queries";
import { Stripes } from "@/components/surface/stripes";
import { HowSection } from "@/components/surface/how-section";
import { RulesCatalog } from "@/components/surface/rules-catalog";

/** Правила в новом дизайне: как устроен матч - тот же разбор, что на главной, ниже справочник заданий. */
export async function SurfaceRules() {
  const [{ tasks, legendary }, maps, finished, match, seasons] = await Promise.all([getRules(), getMaps(), getTournaments("finished"), getCurrentMatch(), getSeasons()]);
  const season = seasons.find((s) => s.status === "active");
  const last = match.last ?? (finished[0] ? await getMatch(finished[0].id) : null);

  return (
    <>
      <section className="sf-page-head sf-night sf-grain rl-top">
        <Stripes shape="corner" className="corner" draw />
        <div className="sf-wrap">
          <p className="sf-eyebrow">Правила{season ? ` · ${season.name}` : ""}</p>
          <h1 className="sf-h-big">
            правила<span className="sf-dot">.</span>
          </h1>
          <p className="sf-lead rl-lead">
            Как устроен матч, за что дают очки и как считается рейтинг. Ниже — все задания, протоколы и легендарные задания с поиском по номеру.
          </p>
          <div className="sf-controls">
            <a className="sf-btn sf-btn-amber" href="#tasks">
              К заданиям
            </a>
            <Link className="sf-btn sf-btn-line" href="/join">
              Участвовать в лиге
            </Link>
          </div>
        </div>
      </section>
      <HowSection maps={maps} finished={finished} last={last} season={season} tone="sf-night-2" />
      {/* Карты в том же порядке, что в прежнем дизайне: по нему нумеруются задания. */}
      <RulesCatalog tasks={tasks} legendary={legendary ?? []} maps={maps} />
    </>
  );
}
