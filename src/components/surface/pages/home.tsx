import { getBelt, getCurrentMatch, getHighlights, getLeaderboard, getMaps, getMatch, getMatchup, getMe, getSeasons, getTournaments } from "@/lib/queries";
import { roleAtLeast } from "@/lib/roles";
import { isShowMatch, vetoOrder } from "@/lib/match";
import { byStartAsc } from "@/components/surface/shell";
import { Hero, JoinCta, Leaders, Schedule, ShowSection, Ticker } from "@/components/surface/home-parts";
import { LastMatch } from "@/components/surface/last-match";
import { LiveMatch, OrganizerBar } from "@/components/surface/live-match";
import { HowSection } from "@/components/surface/how-section";
import { SurfaceHighlights } from "@/components/surface/highlights";
import { BeltHome } from "@/components/surface/belt-parts";

/** Главная в новом дизайне. */
export async function SurfaceHome() {
  const [match, top, upcoming, finished, hl, me, seasons, maps, belt] = await Promise.all([
    getCurrentMatch(),
    getLeaderboard("1x1"),
    getTournaments("upcoming"),
    getTournaments("finished"),
    getHighlights({ random: true, limit: 4 }),
    getMe(),
    getSeasons(),
    getMaps(),
    getBelt(),
  ]);
  const season = seasons.find((s) => s.status === "active");
  const shows = upcoming.filter(isShowMatch).sort(byStartAsc);
  const show = shows[0];
  const [showMatchup, showState, lastState, liveMatchup] = await Promise.all([
    show ? getMatchup(show.id) : Promise.resolve(null),
    show ? getMatch(show.id) : Promise.resolve(null),
    match.last ? Promise.resolve(match.last) : finished[0] ? getMatch(finished[0].id) : Promise.resolve(null),
    match.current ? getMatchup(match.current.tournament.id) : Promise.resolve(null),
  ]);
  const order = showState?.vetoOrder?.length ? showState.vetoOrder : vetoOrder(3);
  const organizer = !!me && roleAtLeast(me.role, "superadmin");

  return (
    <>
      {match.current ? <LiveMatch st={match.current} matchup={liveMatchup} organizer={organizer} belt={belt} /> : organizer && <OrganizerBar />}
      <Hero season={season} show={show} showMatchup={showMatchup} showOrder={order} />
      <Schedule live={match.current} shows={shows} />
      <BeltHome belt={belt} />
      {show && <ShowSection t={show} matchup={showMatchup} order={order} />}
      {lastState && <LastMatch st={lastState} />}
      <Ticker matches={finished} />
      <Leaders rows={top} season={season} />
      <HowSection maps={maps} finished={finished} last={lastState} season={season} />
      <SurfaceHighlights items={hl.items} />
      <JoinCta />
    </>
  );
}
