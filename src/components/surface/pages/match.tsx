import "./match.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TwitchIcon, YouTubeIcon } from "@/components/icons";
import { STREAM_URL, YOUTUBE_URL } from "@/lib/links";
import { getHighlights, getMaps, getMatch, getMatchup } from "@/lib/queries";
import {
  CROSS_POINTS,
  hasScore,
  isShowMatch,
  loadoutLabel,
  mapImage,
  matchSides,
  roundBreakdown,
  roundScore,
  roundsLabel,
  stageLabel,
  taskDescription,
  taskKindLabel,
  taskTitle,
  totalScore,
} from "@/lib/match";
import type { HeadToHeadMatch, MatchState, Matchup, MatchupSide, Participant, ParticipantMmr, Round } from "@/lib/types";
import { Stripes } from "@/components/surface/stripes";
import { ArrowBack, TagChips, signed } from "@/components/surface/ui";
import { CountUp, FlipCountdown } from "@/components/surface/motion";
import { MmrMove, Odds, SHOW_ORDER, VetoOrder } from "@/components/surface/home-parts";
import { SurfaceHighlights } from "@/components/surface/highlights";
import { MatchVeto } from "@/components/surface/match-veto";
import { fullDate, hhmm } from "@/components/surface/fmt";

const SIDE_COLOR = ["var(--sf-a)", "var(--sf-b)"] as const;

function raidsTitle(n: number): string {
  return n === 1 ? "один рейд" : n === 2 ? "два рейда" : n === 3 ? "три рейда" : n === 4 ? "четыре рейда" : `${n} рейдов`;
}

/** Ссылка стороны: игрок ведёт в профиль, команда - на свою страницу. */
function sideHref(side: MatchupSide | undefined, solo: boolean): string {
  if (solo) return side?.players[0]?.login ? `/profile/${side.players[0].login}` : "";
  return side?.teamKey ? `/teams/${encodeURIComponent(side.teamKey)}` : "";
}

/* ---------- табло в шапке ---------- */

function BoardSide({
  p,
  i,
  side,
  change,
  solo,
  finished,
  winner,
}: {
  p: Participant | null;
  i: number;
  side?: MatchupSide;
  change?: ParticipantMmr;
  solo: boolean;
  finished: boolean;
  winner: boolean;
}) {
  const players = side?.players ?? [];
  const href = sideHref(side, solo);
  const name = p?.name ?? "—";
  return (
    <div className={`sf-side ${i === 1 ? "b" : ""}`}>
      <span className="sf-corner" style={{ background: SIDE_COLOR[i] }} />
      {href ? (
        <Link className="sf-side-name" href={href}>
          {name}
        </Link>
      ) : (
        <span className="sf-side-name">{name}</span>
      )}
      {solo ? (
        players[0]?.tags?.length ? (
          <div className="sf-side-tags">
            <TagChips tags={players[0].tags} />
          </div>
        ) : null
      ) : players.length ? (
        <div className="sf-side-roster">
          {players.map((pl) => (
            <span key={pl.userId}>
              <Link href={`/profile/${pl.login}`}>{pl.displayName || pl.login}</Link>
              <TagChips tags={pl.tags} />
            </span>
          ))}
        </div>
      ) : null}
      {finished ? (
        change ? (
          <span className="sf-side-mmr sf-tnum">
            <MmrMove {...change} />
          </span>
        ) : p ? (
          <span className="sf-side-line">Рейтинг не менялся</span>
        ) : null
      ) : side?.mmr ? (
        <>
          <span className="sf-side-line sf-tnum">
            MMR <b>{side.mmr}</b>
            {side.place ? ` · ${side.place} место` : ""}
            {side.isNew ? " · новичок сезона" : ` · ${side.wins}–${side.losses} в сезоне`}
          </span>
          {side.winGain ? (
            <span className="sf-side-line sf-tnum">
              на кону <b className="sf-up">+{side.winGain}</b> за победу, <b className="sf-down">−{side.lossDrop}</b> за поражение
            </span>
          ) : null}
        </>
      ) : null}
      {winner && <span className="sf-stamp win">Победа</span>}
    </div>
  );
}

/* ---------- раунды ---------- */

function SideColumn({ st, round, p, other }: { st: MatchState; round: number; p: Participant; other: Participant | null }) {
  const b = roundBreakdown(st, round, p.id);
  const parts = [
    b.tasks && `задания +${b.tasks}`,
    b.cross && `задания соперника +${b.cross}`,
    b.manual && `ноки и ручные ${b.manual > 0 ? "+" : ""}${b.manual}`,
    b.legendary && `легендарка +${b.legendary}`,
  ].filter(Boolean);
  const tasks = st.tasks.filter((x) => x.roundNumber === round && x.participantId === p.id);
  const legendary = st.legendary.filter((l) => l.roundNumber === round && l.participantId === p.id);
  const score = roundScore(st, round, p.id);
  const otherScore = roundScore(st, round, other?.id);
  return (
    <div className="sf-rd-col">
      <h4>
        {p.name}
        <span className={score < otherScore ? "l" : ""}>{score}</span>
      </h4>
      <p className="sf-rd-sum">{parts.length ? parts.join(" · ") : "очков нет"}</p>
      {(tasks.length > 0 || legendary.length > 0) && (
        <ul>
          {tasks.map((x) => {
            const own = x.completedBy === x.participantId;
            const byOpp = !!x.completedBy && !own;
            return (
              <li key={x.id} className={x.completedBy ? "" : "miss"}>
                <span className={`sf-k ${x.category === "protocol" ? "pr" : x.mapCode ? "map" : ""}`}>{taskKindLabel(x)}</span>
                <span>
                  <b>«{taskTitle(x)}»</b>
                  {taskDescription(x) && ` — ${taskDescription(x)}`}
                  {byOpp && <em> Выполнил соперник.</em>}
                </span>
                <span className={`got ${own ? "own" : byOpp ? "cross" : "miss"}`}>{own ? `+${x.points}` : byOpp ? `+${CROSS_POINTS} ему` : "—"}</span>
              </li>
            );
          })}
          {legendary.map((l) => (
            <li key={l.id}>
              <span className="sf-k leg">легендарка</span>
              <span>{l.legendaryText ? <b>«{l.legendaryText}»</b> : "Легендарное задание"}</span>
              <span className="got own">+{l.points ?? 0}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoundArt({ r, many, st, sides, scored }: { r: Round; many: boolean; st: MatchState; sides: [Participant | null, Participant | null]; scored: boolean }) {
  const [a, b] = sides;
  const sa = roundScore(st, r.number, a?.id);
  const sb = roundScore(st, r.number, b?.id);
  return (
    <div className="sf-rd-art">
      <div className="sf-duo">
        {/* eslint-disable-next-line @next/next/no-img-element -- превью карты */}
        {r.mapCode && <img src={mapImage(r.mapCode)} alt="" loading="lazy" />}
      </div>
      {scored && r.status !== "pending" && (
        <span className="sf-round-score sf-tnum" aria-label={`Счёт раунда ${sa}:${sb}`}>
          <span className={sa >= sb ? "" : "l"}>{sa}</span> : <span className={sb >= sa ? "" : "l"}>{sb}</span>
        </span>
      )}
      <span className="sf-round-body">
        <span className="sf-round-n">
          Раунд {r.number}
          {many ? ` · ${loadoutLabel(r.number)}` : ""}
          {r.status === "live" ? " · идёт" : ""}
        </span>
        <span className="sf-round-map">{r.map || "Карта не указана"}</span>
      </span>
    </div>
  );
}

function Rounds({ st, rounds, sides, finished }: { st: MatchState; rounds: Round[]; sides: [Participant | null, Participant | null]; finished: boolean }) {
  const scored = hasScore(st);
  const detailed = st.tasks.length > 0 || scored;
  const many = rounds.length > 1;
  return (
    <div className="sf-m-block">
      <p className="sf-eyebrow">По раундам</p>
      <h2 className="sf-h-mid">
        {raidsTitle(rounds.length)}
        <span className="sf-dot">.</span>
      </h2>
      {detailed ? (
        <>
          <div className="sf-rdetail">
            {rounds.map((r) => (
              <article key={r.id} className="sf-rd">
                <RoundArt r={r} many={many} st={st} sides={sides} scored={scored} />
                {r.status === "pending" ? (
                  <p className="sf-rd-note">{finished ? "Не сыгран: матч завершили досрочно." : "Задания появятся, когда раунд начнётся."}</p>
                ) : (
                  <div className="sf-rd-cols">
                    {sides.map((p, i) => (p ? <SideColumn key={p.id} st={st} round={r.number} p={p} other={sides[1 - i]} /> : null))}
                  </div>
                )}
              </article>
            ))}
          </div>
          {st.tasks.length > 0 && <p className="sf-rd-foot">Справа у задания — сколько очков оно дало. Задание соперника тоже можно выполнить: это +{CROSS_POINTS} тому, кто выполнил.</p>}
        </>
      ) : (
        <>
          <div className="sf-rd-plain">
            {rounds.map((r) => (
              <RoundArt key={r.id} r={r} many={many} st={st} sides={sides} scored={false} />
            ))}
          </div>
          <p className="sf-rd-foot">Счёт этого матча не вёлся: он перенесён из таблицы, известен только победитель.</p>
        </>
      )}
    </div>
  );
}

/* ---------- что дал матч ---------- */

function EloBlock({ a, b, ca, cb, k, mult }: { a: Participant; b: Participant; ca: ParticipantMmr; cb: ParticipantMmr; k?: number; mult: number }) {
  const eA = 1 / (1 + Math.pow(10, (cb.before - ca.before) / 400));
  const pa = Math.round(eA * 100);
  const draw = ca.delta === 0 && cb.delta === 0;
  const winA = ca.delta > 0;
  const eW = winA ? eA : 1 - eA;
  const gain = Math.abs(winA ? ca.delta : cb.delta);
  // Формулу показываем, только если она сходится с начислением: перенесённые матчи могли считаться иначе.
  const formulaOk = !draw && !!k && Math.round(k * (1 - eW)) * mult === gain;
  const e2 = (v: number) => v.toFixed(2).replace(".", ",");
  const formula = formulaOk ? `${mult > 1 ? `${mult} × ` : ""}${k} × (1 − ${e2(eW)}) = ${gain}.` : "";
  const fav = pa > 50 ? a.name : pa < 50 ? b.name : "";
  const cell = (p: Participant, c: ParticipantMmr, isWinner: boolean) => (
    <div>
      <dt>{p.name}</dt>
      <dd className={c.delta > 0 ? "sf-up" : c.delta < 0 ? "sf-down" : ""}>{signed(c.delta)}</dd>
      <p>
        {c.before} → {c.after}.{" "}
        {draw ? "Ничья: рейтинг не менялся." : isWinner ? formula : "Сколько получил победитель, столько потерял проигравший."}
      </p>
    </div>
  );
  return (
    <div className="sf-m-block">
      <p className="sf-eyebrow">Рейтинг сторон{k ? ` · K = ${k}` : ""}</p>
      <h2 className="sf-h-mid">
        что дал матч<span className="sf-dot">.</span>
      </h2>
      <dl className="sf-elo">
        <div>
          <dt>Шансы перед матчем</dt>
          <dd className="sf-tnum">
            {pa}% : {100 - pa}%
          </dd>
          <p>
            {a.name} {ca.before} против {b.name} {cb.before}. {fav ? `Фаворитом был ${fav}.` : "Шансы были равны."}
          </p>
        </div>
        {cell(a, ca, winA)}
        {cell(b, cb, !winA)}
      </dl>
    </div>
  );
}

/* ---------- личные встречи ---------- */

function HeadToHead({ h, a, b }: { h: Matchup["headToHead"]; a: string; b: string }) {
  const label = (m: HeadToHeadMatch) => (m.winner < 0 ? "Ничья" : `Победа ${m.winner === 0 ? a : b}`);
  return (
    <div className="sf-m-block">
      <p className="sf-eyebrow">История пары</p>
      <h2 className="sf-h-mid">
        личные встречи<span className="sf-dot">.</span>
      </h2>
      <div className="sf-h2h">
        <div className="sf-h2h-score">
          <b className="sf-tnum">
            {h.wins[0]} : {h.wins[1]}
          </b>
          <span className="names">
            {a}
            <i>·</i>
            {b}
          </span>
          {h.draws > 0 && <small>ничьих: {h.draws}</small>}
        </div>
        <ul className="sf-hist">
          {h.matches.map((m) => (
            <li key={m.tournamentId}>
              <Link href={`/tournament/${m.tournamentId}`}>
                <span className={`sf-res ${m.winner < 0 ? "c" : m.winner === 0 ? "sa" : "sb"}`}>{m.winner < 0 ? "=" : m.winner === 0 ? "A" : "B"}</span>
                <span>
                  <b>
                    {label(m)}
                    {m.games > 1 ? " ×2" : ""}
                  </b>
                  <small>
                    {fullDate(m.date)} · {m.map || "карта не указана"}
                  </small>
                </span>
                <span />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- страница ---------- */

/** Страница матча в новом дизайне: шапка с табло, пики-баны, раунды, рейтинг и личные встречи. */
export async function SurfaceMatch({ id }: { id: string }) {
  const st = await getMatch(id);
  if (!st) notFound();
  const t = st.tournament;
  const [{ items: highlights }, matchup, maps] = await Promise.all([getHighlights({ tournamentId: id, limit: 4 }), getMatchup(id), getMaps()]);

  const sides = matchSides(st);
  const [a, b] = sides;
  const solo = t.mode !== "2x2";
  const finished = t.status === "finished";
  const live = t.status === "live";
  const upcoming = !finished && !live;
  const show = isShowMatch(t);
  const played = (finished || live) && hasScore(st);
  const rounds = [...(t.rounds ?? [])].sort((x, y) => x.number - y.number);
  const info = new Map((matchup?.sides ?? []).map((s) => [s.participantId, s]));
  const changes = new Map((t.mmrChanges ?? []).map((c) => [c.participantId, c]));
  const ia = a ? info.get(a.id) : undefined;
  const ib = b ? info.get(b.id) : undefined;
  const ca = a ? changes.get(a.id) : undefined;
  const cb = b ? changes.get(b.id) : undefined;
  const chance = ia?.winChance != null && ib?.winChance != null ? [ia.winChance, ib.winChance] : null;
  const sa = totalScore(st, a?.id);
  const sb = totalScore(st, b?.id);
  const mult = t.ratingMultiplier > 1 ? t.ratingMultiplier : 1;
  const title = finished ? "разбор матча" : live ? "матч в эфире" : show ? "шоу-матч" : "матч скоро";
  const order = st.vetoOrder?.length ? st.vetoOrder : show ? SHOW_ORDER : [];
  const allMaps = [...maps].sort((x, y) => x.sortOrder - y.sortOrder).map((m) => ({ code: m.code, name: m.name }));
  const h2h = matchup?.headToHead;
  const hasH2h = !!h2h && h2h.wins[0] + h2h.wins[1] + h2h.draws > 0;
  const showRounds = (finished || live) && rounds.length > 0;
  const showElo = finished && a && b && ca && cb;
  const paper = st.veto.length > 0 || showRounds || showElo || hasH2h;

  const streams = (
    <>
      <a className="sf-btn sf-btn-amber" href={STREAM_URL} target="_blank" rel="noopener noreferrer">
        <TwitchIcon />
        Смотреть эфир
      </a>
      <a className="sf-btn sf-btn-line" href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">
        <YouTubeIcon />
        YouTube
      </a>
    </>
  );

  return (
    <>
      <section className="sf-page-head sf-night sf-grain">
        <Stripes shape="corner" draw className="corner" />
        <div className="sf-wrap">
          <Link className="sf-back" href="/archive">
            <ArrowBack />
            Все матчи
          </Link>
          <div className={t.previewUrl ? "sf-head-art" : ""}>
            <div>
              <div className="sf-mtags">
                {live && <span className="sf-live-pill">В эфире</span>}
                {upcoming && <span className="hot">Скоро</span>}
                {finished && <span className="done">Сыгран</span>}
                {show && <span className="hot">Шоу-матч</span>}
                <span>{t.mode}</span>
                <span>{roundsLabel(rounds.length || t.totalRounds)}</span>
                {mult > 1 && <span>рейтинг ×{mult}</span>}
                {t.playerType && <span>{t.playerType.toUpperCase()}</span>}
              </div>
              <h1 className="sf-h-big">
                {title}
                <span className="sf-dot">.</span>
              </h1>
              <div className="sf-mh-meta">
                {t.startsAt && (
                  <span>
                    {fullDate(t.startsAt)} · {hhmm(t.startsAt)} МСК
                  </span>
                )}
                {live && <span>{stageLabel(st.stage, st.currentRound || 1, rounds.length || t.totalRounds)}</span>}
                {matchup?.season && (
                  <span>
                    В зачёт: <b>{matchup.season.name}</b>
                  </span>
                )}
              </div>
              {(live || (upcoming && show)) && <div className="sf-mh-actions">{streams}</div>}
              {upcoming && !show && (
                <div className="sf-mh-actions">
                  <Link className="sf-btn sf-btn-amber" href="/join">
                    Записаться на матч
                  </Link>
                </div>
              )}
            </div>
            {t.previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- постер из хранилища медиа
              <img src={t.previewUrl} alt={`Анонс шоу-матча ${t.title}`} />
            )}
          </div>

          <div className="sf-mh-board">
            <BoardSide p={a} i={0} side={ia} change={ca} solo={solo} finished={finished} winner={!!a && t.winnerParticipantId === a.id} />
            {played ? (
              <div className="sf-score" aria-label={`Счёт матча ${sa}:${sb}`}>
                <b className={sa >= sb ? "w" : "l"}>
                  <CountUp value={sa} />
                </b>
                <i>:</i>
                <b className={sb >= sa ? "w" : "l"}>
                  <CountUp value={sb} />
                </b>
              </div>
            ) : (
              <div className="sf-score vs">VS</div>
            )}
            <BoardSide p={b} i={1} side={ib} change={cb} solo={solo} finished={finished} winner={!!b && t.winnerParticipantId === b.id} />
          </div>

          {(chance || t.prize) && (
            <div className="sf-mh-extra">
              {chance && <Odds a={chance[0]} b={chance[1]} nameA={a?.name ?? "A"} nameB={b?.name ?? "B"} label={finished ? "шансы перед матчем" : "шансы по MMR"} />}
              {t.prize && (
                <span className="sf-prize">
                  <small>приз</small>
                  {t.prize}
                </span>
              )}
            </div>
          )}
          {upcoming && (t.startsAt || order.length > 0) && (
            <div className="sf-mh-extra">
              {t.startsAt && (
                <div className="sf-mh-cd">
                  <p className="sf-eyebrow">До начала</p>
                  <FlipCountdown to={t.startsAt} label="До начала матча" />
                </div>
              )}
              {order.length > 0 && (
                <div className="sf-mh-order">
                  <p className="sf-eyebrow">Порядок выбора карт</p>
                  <VetoOrder steps={order} />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {paper && (
        <section className="sf-sec sf-paper sf-grain">
          <div className="sf-wrap">
            {st.veto.length > 0 && <MatchVeto maps={allMaps} veto={st.veto} nameA={a?.name ?? "A"} nameB={b?.name ?? "B"} />}
            {showRounds && <Rounds st={st} rounds={rounds} sides={sides} finished={finished} />}
            {showElo && <EloBlock a={a} b={b} ca={ca} cb={cb} k={matchup?.season?.kFactor} mult={mult} />}
            {hasH2h && h2h && <HeadToHead h={h2h} a={a?.name ?? "A"} b={b?.name ?? "B"} />}
          </div>
        </section>
      )}

      <SurfaceHighlights items={highlights} title="хайлайты матча" eyebrow="Клипы с этого матча" />
    </>
  );
}
