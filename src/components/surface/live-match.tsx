import Link from "next/link";
import type { CSSProperties } from "react";
import { TwitchIcon, YouTubeIcon } from "@/components/icons";
import { STREAM_URL, YOUTUBE_URL } from "@/lib/links";
import { hasScore, isShowMatch, mapImage, matchSides, roundScore, roundsLabel, stageLabel, totalScore } from "@/lib/match";
import type { MatchState, Matchup, MatchupSide } from "@/lib/types";
import { CountUp } from "@/components/surface/motion";
import { RoundCard } from "@/components/surface/round-card";
import { roundTasks, VetoChips } from "@/components/surface/last-match";
import { Odds } from "@/components/surface/home-parts";

/** Где сторона в сезоне и что стоит на кону; части переносятся целиком. */
function Standing({ s }: { s?: MatchupSide }) {
  if (!s?.mmr) return null;
  const where = [`${s.mmr} MMR`, s.isNew ? "новичок сезона" : s.place ? `#${s.place}` : ""].filter(Boolean).join(" · ");
  return (
    <span className="sf-side-mmr sf-tnum">
      <span>{where}</span>
      {s.winGain ? (
        <span>
          на кону <b className="sf-up">+{s.winGain}</b> / <b className="sf-down">−{s.lossDrop ?? 0}</b>
        </span>
      ) : null}
    </span>
  );
}

/** Матч, который идёт прямо сейчас: обычный или шоу-матч, независимо от анонсов. */
export function LiveMatch({ st, matchup, organizer }: { st: MatchState; matchup: Matchup | null; organizer: boolean }) {
  const t = st.tournament;
  const sides = matchSides(st);
  const [a, b] = sides;
  const rounds = [...(t.rounds ?? [])].sort((x, y) => x.number - y.number);
  const total = rounds.length || t.totalRounds;
  const scored = hasScore(st);
  const sa = totalScore(st, a?.id);
  const sb = totalScore(st, b?.id);
  const info = new Map((matchup?.sides ?? []).map((s) => [s.participantId, s]));
  const ia = a ? info.get(a.id) : undefined;
  const ib = b ? info.get(b.id) : undefined;
  const chance = ia?.winChance != null && ib?.winChance != null ? [ia.winChance, ib.winChance] : null;
  const show = isShowMatch(t);
  const poster = show && t.previewUrl ? t.previewUrl : "";
  const vetoNow = st.stage === "veto" && st.veto.length > 0;
  const withMaps = !vetoNow && rounds.some((r) => r.map);
  const eyebrow = [stageLabel(st.stage, st.currentRound || 1, total), t.mode, roundsLabel(total), t.ratingMultiplier > 1 ? `рейтинг ×${t.ratingMultiplier}` : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="sf-live sf-night" aria-label="Матч в эфире">
      <div className="sf-wrap">
        <div className={`sf-live-grid ${poster ? "has-poster" : ""}`}>
          <div className="sf-live-main">
            <div className="sf-live-head">
              <span className="sf-live-pill">В эфире</span>
              {show && <span className="sf-live-tag">Шоу-матч</span>}
              <p className="sf-eyebrow">{eyebrow}</p>
            </div>
            <div className="sf-board">
              <div className="sf-side">
                <span className="sf-corner" style={{ background: "var(--sf-a)" }} />
                <span className="sf-side-name">{a?.name ?? "—"}</span>
                <Standing s={ia} />
              </div>
              <div className="sf-score" aria-label={scored ? `Счёт ${sa}:${sb}` : "Счёт пока не открыт"}>
                {scored ? (
                  <>
                    <b className={sa >= sb ? "w" : "l"}>
                      <CountUp value={sa} />
                    </b>
                    <i>:</i>
                    <b className={sb >= sa ? "w" : "l"}>
                      <CountUp value={sb} />
                    </b>
                  </>
                ) : (
                  <b className="w">VS</b>
                )}
              </div>
              <div className="sf-side b">
                <span className="sf-corner" style={{ background: "var(--sf-b)" }} />
                <span className="sf-side-name">{b?.name ?? "—"}</span>
                <Standing s={ib} />
              </div>
            </div>
            {vetoNow && <VetoChips veto={st.veto} />}
            {withMaps && (
              <div className="sf-rounds" style={{ "--n": Math.min(rounds.length, 3) } as CSSProperties}>
                {rounds.map((r) => (
                  <RoundCard
                    key={r.id}
                    n={r.number}
                    map={r.map}
                    image={mapImage(r.mapCode)}
                    scoreA={roundScore(st, r.number, a?.id)}
                    scoreB={roundScore(st, r.number, b?.id)}
                    scored={scored && r.status !== "pending"}
                    tasks={roundTasks(st, r.number, sides)}
                    live={r.status === "live"}
                  />
                ))}
              </div>
            )}
            {(chance || t.prize) && (
              <div className="sf-live-foot">
                {chance && <Odds a={chance[0]} b={chance[1]} nameA={a?.name ?? "A"} nameB={b?.name ?? "B"} label="шансы по MMR" />}
                {t.prize && (
                  <span className="sf-prize">
                    <small>приз</small>
                    {t.prize}
                  </span>
                )}
              </div>
            )}
            <div className="sf-btn-row sf-live-actions">
              {organizer && (
                <Link className="sf-btn sf-btn-amber" href={`/admin/matches/${t.id}`}>
                  Открыть пульт
                </Link>
              )}
              <a className={`sf-btn ${organizer ? "sf-btn-line" : "sf-btn-amber"}`} href={STREAM_URL} target="_blank" rel="noopener noreferrer">
                <TwitchIcon />
                Twitch
              </a>
              <a className="sf-btn sf-btn-line" href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">
                <YouTubeIcon />
                YouTube
              </a>
              <Link className="sf-btn sf-btn-line" href={`/tournament/${t.id}`}>
                Страница матча
              </Link>
            </div>
          </div>
          {poster && (
            <div className="sf-live-poster">
              {/* eslint-disable-next-line @next/next/no-img-element -- постер из хранилища медиа */}
              <img src={poster} alt={`Постер шоу-матча ${t.title}`} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Полоса организатора, пока матч не идёт: новый матч одной кнопкой. */
export function OrganizerBar() {
  return (
    <div className="sf-orgbar">
      <div className="sf-wrap sf-orgbar-in">
        <span className="sf-orgbar-txt">
          <i aria-hidden />
          Кабинет организатора · сейчас матч не идёт
        </span>
        <Link className="sf-btn sf-btn-amber sf-btn-sm" href="/admin/matches">
          Новый матч
        </Link>
      </div>
    </div>
  );
}
