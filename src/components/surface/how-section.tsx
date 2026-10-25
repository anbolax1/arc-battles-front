import { matchSides } from "@/lib/match";
import type { MapInfo, MatchState, Season, Tournament } from "@/lib/types";
import { HowItWorks, type HowCalc, type HowExample } from "@/components/surface/how-it-works";
import { dayMonth } from "@/components/surface/fmt";

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").trim();

/** Пример для «двух рейдов»: недавний матч из двух карт со счётом. */
function pickExample(finished: Tournament[], maps: MapInfo[]): HowExample | null {
  const code = (name: string) => maps.find((m) => norm(m.name) === norm(name))?.code;
  const m = finished.find((t) => (t.roundMaps?.length ?? 0) === 2 && (t.score?.length ?? 0) === 2 && t.score!.some((s) => s.points > 0));
  if (!m) return null;
  const [x, y] = m.score!;
  return {
    id: m.id,
    a: x.name,
    b: y.name,
    sa: x.points,
    sb: y.points,
    win: x.winner ? 0 : y.winner ? 1 : -1,
    maps: m.roundMaps!.map((name) => ({ name, code: code(name) })),
    date: dayMonth(m.startsAt),
    mult: m.ratingMultiplier,
  };
}

/** Калькулятор по умолчанию - рейтинг сторон перед последним матчем. */
function calcDefaults(st: MatchState | null, start: number): HowCalc {
  const t = st?.tournament;
  const [a, b] = st ? matchSides(st) : [null, null];
  const ca = t?.mmrChanges?.find((c) => c.participantId === a?.id);
  const cb = t?.mmrChanges?.find((c) => c.participantId === b?.id);
  if (!t || !ca || !cb || t.mode === "2x2") return { a: start, b: start };
  return { a: ca.before, b: cb.before };
}

/** Раздел «как устроен матч» по правилам текущего сезона; примеры - из последних сыгранных матчей. */
export function HowSection({
  maps,
  finished,
  last,
  season,
  tone = "sf-night",
}: {
  maps: MapInfo[];
  finished: Tournament[];
  last: MatchState | null;
  season?: Season;
  tone?: "sf-night" | "sf-night-2";
}) {
  const k = season?.kFactor ?? 100;
  const start = season?.startMmr ?? 1000;
  const seasonNo = season?.name.match(/\d+/)?.[0];
  return (
    <section className={`sf-sec ${tone} sf-grain`} id="how" aria-labelledby="how-t">
      <div className="sf-wrap">
        <div className="sf-sec-head">
          <div>
            <p className="sf-eyebrow">{seasonNo ? `Формат ${seasonNo} сезона` : "Формат матча"}</p>
            <h2 className="sf-h-big" id="how-t">
              как устроен матч<span className="sf-dot">.</span>
            </h2>
          </div>
        </div>
        <HowItWorks maps={[...maps].sort((x, y) => x.sortOrder - y.sortOrder)} example={pickExample(finished, maps)} k={k} start={start} calc={calcDefaults(last, start)} />
      </div>
    </section>
  );
}
