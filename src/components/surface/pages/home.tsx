import { getCurrentMatch, getHighlights, getLeaderboard, getMaps, getMatch, getMatchup, getMe, getSeasons, getTournaments } from "@/lib/queries";
import { roleAtLeast } from "@/lib/roles";
import { isShowMatch, matchSides } from "@/lib/match";
import type { MapInfo, MatchState, Tournament } from "@/lib/types";
import { byStartAsc } from "@/components/surface/shell";
import { Hero, JoinCta, Leaders, Schedule, SHOW_ORDER, ShowSection, Ticker } from "@/components/surface/home-parts";
import { LastMatch } from "@/components/surface/last-match";
import { HowItWorks, type HowCalc, type HowExample } from "@/components/surface/how-it-works";
import { SurfaceHighlights } from "@/components/surface/highlights";
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
  const winner = ca.delta > 0 ? ca.delta : cb.delta;
  return { a: ca.before, b: cb.before, nameA: a?.name, nameB: b?.name, date: dayMonth(t.startsAt), mult: t.ratingMultiplier, delta: winner };
}

/** Главная в новом дизайне. */
export async function SurfaceHome() {
  const [match, top, upcoming, finished, hl, me, seasons, maps] = await Promise.all([
    getCurrentMatch(),
    getLeaderboard("1x1"),
    getTournaments("upcoming"),
    getTournaments("finished"),
    getHighlights({ random: true, limit: 4 }),
    getMe(),
    getSeasons(),
    getMaps(),
  ]);
  const season = seasons.find((s) => s.status === "active");
  const shows = upcoming.filter(isShowMatch).sort(byStartAsc);
  const show = shows[0];
  const [showMatchup, showState, lastState] = await Promise.all([
    show ? getMatchup(show.id) : Promise.resolve(null),
    show ? getMatch(show.id) : Promise.resolve(null),
    match.last ? Promise.resolve(match.last) : finished[0] ? getMatch(finished[0].id) : Promise.resolve(null),
  ]);
  const order = showState?.vetoOrder?.length ? showState.vetoOrder : SHOW_ORDER;
  const organizer = !!me && roleAtLeast(me.role, "superadmin");
  const k = season?.kFactor ?? 100;
  const start = season?.startMmr ?? 1000;
  const seasonNo = season?.name.match(/\d+/)?.[0];

  return (
    <>
      <Hero season={season} live={match.current} show={show} showMatchup={showMatchup} showOrder={order} organizer={organizer} />
      <Schedule live={match.current} shows={shows} />
      {show && <ShowSection t={show} matchup={showMatchup} order={order} />}
      {lastState && <LastMatch st={lastState} />}
      <Ticker matches={finished} />
      <Leaders rows={top} season={season} />
      <section className="sf-sec sf-night sf-grain" id="how" aria-labelledby="how-t">
        <div className="sf-wrap">
          <div className="sf-sec-head">
            <div>
              <p className="sf-eyebrow">{seasonNo ? `Формат ${seasonNo} сезона` : "Формат матча"}</p>
              <h2 className="sf-h-big" id="how-t">
                как устроен матч<span className="sf-dot">.</span>
              </h2>
            </div>
          </div>
          <HowItWorks maps={[...maps].sort((x, y) => x.sortOrder - y.sortOrder)} example={pickExample(finished, maps)} k={k} start={start} calc={calcDefaults(lastState, start)} />
        </div>
      </section>
      <SurfaceHighlights items={hl.items} />
      <JoinCta />
    </>
  );
}
