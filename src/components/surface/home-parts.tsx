import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { TelegramIcon, TwitchIcon } from "@/components/icons";
import { STREAM_URL, TELEGRAM_URL, YOUTUBE_URL } from "@/lib/links";
import { isShowMatch, mapImage, matchSides, roundsLabel, stageLabel, totalScore } from "@/lib/match";
import type { LeaderboardRow, MatchState, Matchup, MatchupSide, Season, Tournament, VetoStep } from "@/lib/types";
import { Stripes } from "@/components/surface/stripes";
import { Arrow, ScheduleIcon, SecHead, TagStamps, signed } from "@/components/surface/ui";
import { AnnounceBar, CountUp, FitLine, FlipCountdown, GrowOnView, Parallax, ShortCountdown, Tilt } from "@/components/surface/motion";
import { dayMonth, hhmm, shortDate, splitTitle, weekdayDate, weekdayLong, winrate } from "@/components/surface/fmt";

/** Порядок пиков-банов шоу-матча, если матч ещё не начинали. */
export const SHOW_ORDER: VetoStep[] = [
  { action: "pick", side: "A", round: 1 },
  { action: "pick", side: "B", round: 2 },
  { action: "ban", side: "A" },
  { action: "ban", side: "B" },
  { action: "pick", side: "A", round: 3 },
];

const ACT: Record<VetoStep["action"], string> = { ban: "бан", pick: "пик", rest: "остаток" };

/** Порядок ходов чипами в цветах сторон. */
export function VetoOrder({ steps }: { steps: VetoStep[] }) {
  return (
    <div className="sf-fmt">
      {steps.map((s, i) => (
        <span key={i} style={{ display: "contents" }}>
          <span className={s.side === "A" ? "pa" : s.side === "B" ? "pb" : "pn"}>
            {ACT[s.action]}
            {s.side ? ` ${s.side}` : ""}
          </span>
          {i < steps.length - 1 && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
              <path d="m9 6 6 6-6 6" />
            </svg>
          )}
        </span>
      ))}
    </div>
  );
}

/** Шансы сторон по MMR полосой в цветах сторон. */
export function Odds({ a, b, nameA, nameB, label }: { a: number; b: number; nameA: string; nameB: string; label: string }) {
  return (
    <div className="sf-odds">
      <div className="sf-odds-head">
        <span>
          <b>{a}%</b> {nameA}
        </span>
        <span>{label}</span>
        <span>
          {nameB} <b>{b}%</b>
        </span>
      </div>
      <div className="sf-odds-bar" aria-hidden>
        <i style={{ flexGrow: a, background: "var(--sf-a)" }} />
        <i style={{ flexGrow: b, background: "var(--sf-b)" }} />
      </div>
    </div>
  );
}

/* ---------- герой ---------- */

export function Hero({
  season,
  live,
  show,
  showMatchup,
  showOrder,
  organizer,
}: {
  season?: Season;
  live: MatchState | null;
  show?: Tournament;
  showMatchup: Matchup | null;
  showOrder: VetoStep[];
  organizer: boolean;
}) {
  return (
    <Parallax className="sf-hero sf-night">
      <div className="sf-hero-bg" style={{ backgroundImage: `url(${mapImage("dam")})` }} aria-hidden />
      <Stripes shape="hero" draw />
      <div className="sf-wrap sf-hero-grid">
        <div>
          <p className="sf-eyebrow">{season ? season.name : "Сезон"} · Arc Raiders · эфиры у Дениса Блима</p>
          <h1>
            <span className="ln">
              <span>
                рейд<i>.</i>
              </span>
            </span>
            <span className="ln">
              <span>
                респект<i>.</i>
              </span>
            </span>
          </h1>
          <p className="sf-lead">
            Матчи 1×1 и 2×2 по Arc Raiders в прямом эфире. Пики и баны карт, задания, протоколы и рейтинг по MMR. Выходи на поверхность и забирай
            звание чемпиона.
          </p>
          <div className="sf-hero-actions">
            <Link href="/join" className="sf-btn sf-btn-amber">
              Записаться на матч
            </Link>
            <a className="sf-btn sf-btn-line" href={STREAM_URL} target="_blank" rel="noopener noreferrer">
              <TwitchIcon />
              Смотреть эфир
            </a>
          </div>
          {season && (
            <div className="sf-hero-meta">
              <span>{season.name} с {dayMonth(season.startedAt)}</span>
              <span>Эло K = {season.kFactor}</span>
              <span>Старт {season.startMmr} MMR</span>
            </div>
          )}
        </div>
        <NextCard live={live} show={show} matchup={showMatchup} order={showOrder} organizer={organizer} />
      </div>
    </Parallax>
  );
}

function NextCard({
  live,
  show,
  matchup,
  order,
  organizer,
}: {
  live: MatchState | null;
  show?: Tournament;
  matchup: Matchup | null;
  order: VetoStep[];
  organizer: boolean;
}) {
  if (live) {
    const t = live.tournament;
    const [a, b] = matchSides(live);
    const rounds = t.rounds?.length || t.totalRounds;
    return (
      <aside className="sf-next" aria-labelledby="next-t">
        <div className="sf-tags">
          <span className="live">В эфире</span>
          {isShowMatch(t) && <span className="hot">Шоу-матч</span>}
          <span>{t.mode}</span>
          <span>{roundsLabel(rounds)}</span>
        </div>
        <h2 className="sf-next-title" id="next-t">
          {stageLabel(live.stage, live.currentRound || 1, rounds)}
        </h2>
        <div className="sf-live-score" aria-label="Счёт матча">
          <span className="nm">{a?.name ?? "—"}</span>
          <b>
            {totalScore(live, a?.id)}
            <i>:</i>
            {totalScore(live, b?.id)}
          </b>
          <span className="nm b">{b?.name ?? "—"}</span>
        </div>
        <div className="sf-next-actions">
          <a className="sf-btn sf-btn-amber" href={STREAM_URL} target="_blank" rel="noopener noreferrer">
            <TwitchIcon />
            Смотреть эфир
          </a>
          <Link className="sf-btn sf-btn-ink-line" href={`/tournament/${t.id}`}>
            Страница матча
          </Link>
          {organizer && (
            <Link className="sf-btn sf-btn-ink" href={`/admin/matches/${t.id}`}>
              Открыть пульт
            </Link>
          )}
        </div>
      </aside>
    );
  }

  if (show?.startsAt) {
    const [a, b] = splitTitle(show.title);
    const [sa, sb] = matchup?.sides ?? [];
    return (
      <aside className="sf-next" aria-labelledby="next-t">
        <div className="sf-tags">
          <span className="hot">Шоу-матч</span>
          <span>{show.mode}</span>
          <span>{roundsLabel(show.totalRounds)}</span>
          {show.ratingMultiplier === 2 && <span>рейтинг ×2</span>}
        </div>
        <h2 className="sf-next-title" id="next-t">
          {a} <em>vs</em> {b}
        </h2>
        <p className="sf-next-date">
          {weekdayDate(show.startsAt)} · {hhmm(show.startsAt)} МСК
        </p>
        <FlipCountdown to={show.startsAt} label="До начала шоу-матча" />
        <AnnounceBar from={show.createdAt} to={show.startsAt} />
        <dl className="sf-rows">
          {show.prize && (
            <div>
              <dt>Приз</dt>
              <dd>{show.prize}</dd>
            </div>
          )}
          <div>
            <dt>Карты</dt>
            <dd>{order.map((s) => ACT[s.action]).join(" · ")}</dd>
          </div>
          {sa?.mmr && sb?.mmr ? (
            <div>
              <dt>MMR сторон</dt>
              <dd className="sf-tnum">
                {sa.mmr} · {sb.mmr}
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="sf-next-actions">
          <a className="sf-btn sf-btn-ink" href="#show">
            Подробнее о матче
          </a>
          {organizer && (
            <Link className="sf-btn sf-btn-ink-line" href="/admin/matches">
              Матчи в кабинете
            </Link>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="sf-next" aria-labelledby="next-t">
      <div className="sf-tags">
        <span>Эфиры</span>
      </div>
      <h2 className="sf-next-title" id="next-t">
        Сейчас тихо
      </h2>
      <p className="sf-next-date">Шоу-матч ещё не назначен. Обычные матчи ведущий собирает прямо в эфире — подай заявку, и тебя позовут.</p>
      <div className="sf-next-actions">
        <a className="sf-btn sf-btn-ink" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
          <TelegramIcon />
          Анонсы в Telegram
        </a>
        {organizer && (
          <Link className="sf-btn sf-btn-ink-line" href="/admin/matches">
            Новый матч
          </Link>
        )}
      </div>
    </aside>
  );
}

/* ---------- ближайшие эфиры ---------- */

export function Schedule({ live, shows }: { live: MatchState | null; shows: Tournament[] }) {
  const rows: Array<{ key: string; href: string; cls: string; time: ReactNode; icon: ReactNode; title: string; sub: string; when: string }> = [];
  if (live) {
    const t = live.tournament;
    const [a, b] = matchSides(live);
    rows.push({
      key: "live",
      href: `/tournament/${t.id}`,
      cls: "live",
      time: "в эфире",
      icon: ScheduleIcon.live,
      title: `${a?.name ?? "—"} vs ${b?.name ?? "—"}`,
      sub: `${stageLabel(live.stage, live.currentRound || 1, t.rounds?.length || t.totalRounds)} · ${t.mode}`,
      when: "сейчас",
    });
  }
  shows.slice(0, 3).forEach((s, i) => {
    rows.push({
      key: s.id,
      href: `/tournament/${s.id}`,
      cls: i === 0 ? "hot" : "",
      time: s.startsAt ? i === 0 ? <ShortCountdown to={s.startsAt} /> : `${shortDate(s.startsAt)} · ${hhmm(s.startsAt)}` : "скоро",
      icon: ScheduleIcon.star,
      title: s.title,
      sub: ["Шоу-матч", roundsLabel(s.totalRounds), s.prize ? `приз ${s.prize}` : ""].filter(Boolean).join(" · "),
      when: s.startsAt ? `${weekdayDate(s.startsAt)} · ${hhmm(s.startsAt)}` : "",
    });
  });
  rows.push({
    key: "regular",
    href: "/join",
    cls: "",
    time: "каждый эфир",
    icon: ScheduleIcon.aim,
    title: "Обычные матчи 1×1",
    sub: "Ведущий собирает прямо в эфире · подай заявку",
    when: "по ходу стрима",
  });

  return (
    <section className="sf-sched sf-night sf-grain" aria-labelledby="sched-t">
      <div className="sf-wrap">
        <div className="sf-sched-head">
          <h2 className="sf-h-up" id="sched-t">
            Ближайшие эфиры
          </h2>
          <span className="sf-mono">время московское</span>
          <Link className="sf-more" href="/schedule">
            Расписание <Arrow />
          </Link>
        </div>
        <ul className="sf-sched-list">
          {rows.map((r) => (
            <li key={r.key}>
              <Link className={`sf-srow ${r.cls}`} href={r.href}>
                <span className="sf-srow-time">
                  <i />
                  {r.time}
                </span>
                <span className="sf-srow-ico">{r.icon}</span>
                <span className="sf-srow-main">
                  <b>{r.title}</b>
                  <small>{r.sub}</small>
                </span>
                <span className="sf-srow-when">{r.when}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- шоу-матч ---------- */

function GeneratedPoster({ t }: { t: Tournament }) {
  const [a, b] = splitTitle(t.title);
  return (
    <div className="sf-poster-in">
      <div className="sf-p-stars" />
      <div className="sf-p-sun" />
      <div className="sf-p-orbit" />
      <Stripes shape="poster" />
      <div className="sf-p-dots" />
      <div className="sf-p-top">
        <span>Битва за Респект</span>
        <span>Шоу-матч</span>
      </div>
      <div className="sf-p-names">
        <FitLine>{a}</FitLine>
        <em>vs</em>
        <FitLine>{b || "—"}</FitLine>
      </div>
      <div className="sf-p-specs">
        <span>Пики и баны</span>
        <span>{roundsLabel(t.totalRounds)}</span>
        <span>Бонусные задания</span>
      </div>
      {t.startsAt && (
        <div className="sf-p-date">
          <small>{weekdayLong(t.startsAt)}</small>
          {shortDate(t.startsAt)} · {hhmm(t.startsAt)}
        </div>
      )}
      {t.prize && (
        <div className="sf-p-prize">
          <small>приз</small>
          <b>{t.prize}</b>
        </div>
      )}
      <div className="sf-p-glare" />
    </div>
  );
}

export function ShowSection({ t, matchup, order }: { t: Tournament; matchup: Matchup | null; order: VetoStep[] }) {
  const [a, b] = splitTitle(t.title);
  const [sa, sb] = matchup?.sides ?? [];
  const chance = sa?.winChance != null && sb?.winChance != null ? [sa.winChance, sb.winChance] : null;
  const standing = (s?: MatchupSide) =>
    !s ? "" : s.isNew ? "новичок сезона" : [s.place ? `${s.place} место` : "", `${s.wins}–${s.losses} в сезоне`].filter(Boolean).join(" · ");

  return (
    <section className="sf-sec sf-night" id="show" aria-labelledby="show-t">
      <div className="sf-wrap">
        <SecHead
          id="show-t"
          eyebrow={[t.startsAt ? `${dayMonth(t.startsAt)} · ${hhmm(t.startsAt)} МСК` : "", t.prize ? `приз ${t.prize}` : ""].filter(Boolean).join(" · ")}
          title="шоу-матч"
        />
        <div className="sf-show-grid">
          <Tilt className="sf-poster">
            {t.previewUrl ? (
              <div className="sf-poster-in is-img">
                {/* eslint-disable-next-line @next/next/no-img-element -- постер из хранилища медиа */}
                <img src={t.previewUrl} alt={`Постер шоу-матча ${t.title}`} />
                <div className="sf-p-glare" />
              </div>
            ) : (
              <GeneratedPoster t={t} />
            )}
          </Tilt>
          <div className="sf-show-info">
            {t.startsAt && (
              <div>
                <p className="sf-eyebrow">До начала</p>
                <FlipCountdown to={t.startsAt} label="До начала шоу-матча" />
              </div>
            )}
            <div className="sf-sides">
              {[
                { name: a, side: sa, color: "var(--sf-a)", corner: "синий угол" },
                { name: b, side: sb, color: "var(--sf-b)", corner: "красный угол" },
              ].map((x) => {
                const login = x.side?.players[0]?.login;
                const body = (
                  <>
                    <i style={{ background: x.color }} />
                    <div>
                      <b>{x.name || "—"}</b>
                      <small>{[x.corner, standing(x.side)].filter(Boolean).join(" · ")}</small>
                    </div>
                    {x.side?.mmr ? <span className="mmr">{x.side.mmr}</span> : <span />}
                  </>
                );
                return login && t.mode !== "2x2" ? (
                  <Link key={x.color} className="sf-side-row" href={`/profile/${login}`}>
                    {body}
                  </Link>
                ) : (
                  <div key={x.color} className="sf-side-row">
                    {body}
                  </div>
                );
              })}
            </div>
            {chance && <Odds a={chance[0]} b={chance[1]} nameA={a} nameB={b} label="шансы по MMR" />}
            <div>
              <p className="sf-eyebrow">Порядок выбора карт</p>
              <VetoOrder steps={order} />
            </div>
            <div className="sf-btn-row">
              <a className="sf-btn sf-btn-amber" href={STREAM_URL} target="_blank" rel="noopener noreferrer">
                Смотреть на Twitch
              </a>
              <a className="sf-btn sf-btn-line" href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">
                YouTube
              </a>
              <Link className="sf-btn sf-btn-line" href={`/tournament/${t.id}`}>
                Страница матча
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- бегущая строка результатов ---------- */

export function Ticker({ matches }: { matches: Tournament[] }) {
  const items = matches.filter((m) => (m.score?.length ?? 0) >= 2).slice(0, 16);
  if (items.length < 3) return null;
  const row = (dup: boolean) =>
    items.map((m) => {
      const [x, y] = m.score!;
      return (
        <Link key={(dup ? "d" : "") + m.id} className="sf-tk" href={`/tournament/${m.id}`} tabIndex={dup ? -1 : undefined} aria-hidden={dup || undefined}>
          {x.winner ? <b>{x.name}</b> : x.name} <span className="sc">{x.points}:{y.points}</span> {y.winner ? <b>{y.name}</b> : y.name}
          {m.ratingMultiplier > 1 && <span className="x2">×{m.ratingMultiplier}</span>}
        </Link>
      );
    });
  return (
    <div className="sf-ticker" aria-label="Последние результаты">
      <div className="sf-ticker-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

/* ---------- лидеры ---------- */

export function Leaders({ rows, season }: { rows: LeaderboardRow[]; season?: Season }) {
  if (!rows.length) return null;
  const [c, ...rest] = rows;
  const list = rest.slice(0, 8);
  const max = c.mmr;
  const min = Math.min(...rows.slice(0, 9).map((r) => r.mmr)) - 60;
  const name = (r: LeaderboardRow) => r.displayName || r.login;
  return (
    <section className="sf-sec sf-paper sf-grain" aria-labelledby="lead-t">
      <div className="sf-wrap sf-lead-grid">
        <div>
          <p className="sf-eyebrow">{season ? season.name : "Сезон"} · 1×1 · по MMR</p>
          <h2 className="sf-h-big" id="lead-t">
            таблица лидеров<span className="sf-dot">.</span>
          </h2>
          <div className="sf-champ">
            <span className="sf-champ-rank" aria-hidden>
              1
            </span>
            <div>
              <Link className="sf-champ-name" href={`/profile/${c.login}`}>
                {name(c)}
              </Link>
              <TagStamps tags={c.tags} />
            </div>
            <dl className="sf-champ-stats">
              <div>
                <dt>MMR</dt>
                <dd>
                  <CountUp value={c.mmr} />
                </dd>
              </div>
              <div>
                <dt>Победы — поражения</dt>
                <dd>
                  {c.wins}–{c.losses}
                </dd>
              </div>
              <div>
                <dt>Винрейт</dt>
                <dd>{winrate(c.wins, c.losses)}%</dd>
              </div>
              <div>
                <dt>Матчей</dt>
                <dd>{c.tournaments}</dd>
              </div>
            </dl>
          </div>
        </div>
        <div>
          <GrowOnView as="ol" className="sf-lb">
            {list.map((r, i) => (
              <li key={r.userId || r.login} style={{ "--k": i } as CSSProperties}>
                <span className="r">{i + 2}</span>
                <Link className="n" href={`/profile/${r.login}`}>
                  {name(r)}
                </Link>
                <span className="wlt" title={`${r.wins} побед, ${r.losses} поражений`}>
                  {r.wins}–{r.losses}
                </span>
                <span className="pct">{winrate(r.wins, r.losses)}%</span>
                <span className="mmr">{r.mmr}</span>
                <span className="mmr-bar" aria-hidden>
                  <i style={{ "--w": `${Math.max(4, ((r.mmr - min) / Math.max(1, max - min)) * 100).toFixed(1)}%` } as CSSProperties} />
                </span>
              </li>
            ))}
          </GrowOnView>
          <div className="sf-lead-foot">
            <Link className="sf-more" href="/rating">
              Вся таблица <Arrow />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- призыв ---------- */

export function JoinCta() {
  return (
    <section className="sf-cta" aria-labelledby="cta-t">
      <Stripes shape="cta" />
      <div className="sf-wrap">
        <div className="sf-cta-in">
          <h2 id="cta-t">готов к рейду?</h2>
          <p>Подай заявку, и организатор позовёт тебя на матч в прямом эфире.</p>
          <Link className="sf-btn sf-btn-ink" href="/join">
            Подать заявку
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Изменение MMR стороны строкой: «1352 → 1480 ▲ 128». */
export function MmrMove({ before, after, delta }: { before: number; after: number; delta: number }) {
  return (
    <>
      <span>
        {before} → {after}
      </span>
      <b className={delta >= 0 ? "sf-up" : "sf-down"}>
        {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}
      </b>
    </>
  );
}

export { signed };
