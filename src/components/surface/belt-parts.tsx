import Link from "next/link";
import type { ReactNode } from "react";
import type { Belt, BeltPlayer, BeltReign } from "@/lib/types";
import { BeltArt } from "@/components/surface/belt-art";
import { Arrow } from "@/components/surface/ui";
import { dayMonth } from "@/components/surface/fmt";
import { plural, W_DAY } from "@/components/surface/season-lib";
import { shortDate } from "@/components/surface/fmt";
import {
  W_DEF,
  W_GAMEDAY,
  W_HOLDER,
  W_TIME,
  holderName,
  holderStats,
  holderTag,
  howEnded,
  reignDays,
  rustText,
  serverNow,
  type MatchBeltMark,
} from "@/components/surface/belt-lib";
import "@/components/surface/belt.css";

/** Звёзды защит как на поясе: десять мест, занятые - золотые. */
export function BeltStars({ n, slots = 10 }: { n: number; slots?: number }) {
  return (
    <span className="bl-stars" aria-label={`защит: ${n}`}>
      {Array.from({ length: slots }, (_, i) => (
        <i key={i} className={i < n ? "on" : undefined} />
      ))}
      {n > slots && <b>+{n - slots}</b>}
    </span>
  );
}

/** Пояс рисунком: у ничьего пояса - штамп «пояс выпал». */
export function BeltPicture({ belt, id }: { belt: Belt; id: string }) {
  const vacant = !belt.holder;
  return (
    <div className={`bl-art ${vacant ? "vacant" : ""}`}>
      <BeltArt id={id} name={belt.holder ? holderName(belt.holder) : undefined} stars={belt.defenses} rust={belt.rust / belt.rustLimit} vacant={vacant} />
      {vacant && belt.reigns.length > 0 && <span className="bl-drop">пояс выпал</span>}
    </div>
  );
}

/** Кто держит пояс, сколько у него защит и ржавчины; у ничьего пояса - чей матч его разыграет. */
export function BeltStatus({ belt }: { belt: Belt }) {
  const now = serverNow();
  const cur = belt.reigns[belt.reigns.length - 1];
  const holders = holderStats(belt, now).length;

  if (!cur) {
    return (
      <div className="bl-status">
        <p className="sf-eyebrow">Пояс ещё не разыгран</p>
        <p className="bl-text">Пояс достанется победителю первого матча лиги.</p>
      </div>
    );
  }

  if (!belt.holder) {
    const leaders = belt.leaders ?? [];
    return (
      <div className="bl-status">
        <p className="sf-eyebrow">Пояс ничей{belt.droppedAt ? ` с ${dayMonth(belt.droppedAt)}` : ""}</p>
        <div className="bl-who">
          <span className="bl-name vac">ничей</span>
        </div>
        <p className="bl-text">
          {holderName(cur.holder)} {belt.rustLimit} {plural(belt.rustLimit, W_GAMEDAY)} подряд не выходил на матч, и пояс выпал.{" "}
          {leaders.length ? (
            <>
              Его разыграет ближайший обычный матч лидера таблицы:{" "}
              {leaders.map((l, i) => (
                <span key={l.userId}>
                  {i > 0 && " или "}
                  <Link href={`/profile/${l.login}`}>{holderName(l)}</Link>
                </span>
              ))}
              . Выиграет лидер — пояс его, проиграет — пояс у того, кто его обыграл.
            </>
          ) : (
            "В сезоне ещё нет матчей: пояс разыграет первый матч сезона."
          )}
        </p>
      </div>
    );
  }

  const days = reignDays(cur, now);
  return (
    <div className="bl-status">
      <p className="sf-eyebrow">Носитель · {holderTag(cur)}</p>
      <div className="bl-who">
        <Link className="bl-name" href={`/profile/${belt.holder.login}`}>
          {holderName(belt.holder)}
        </Link>
        <span className="bl-stamp">с {dayMonth(belt.since)}</span>
      </div>
      <dl className="bl-stats">
        <div>
          <dt>держит</dt>
          <dd>{days ? `${days} ${plural(days, W_DAY)}` : "с сегодня"}</dd>
        </div>
        <div>
          <dt>защит</dt>
          <dd>
            {belt.defenses}
            <BeltStars n={belt.defenses} />
          </dd>
        </div>
        <div>
          <dt>
            {plural(holders, W_HOLDER)} с {dayMonth(belt.reigns[0].from)}
          </dt>
          <dd>{holders}</dd>
        </div>
      </dl>
      <div className="bl-rust">
        <p className="bl-rust-h">
          <span>Ржавчина</span>
          <b>
            {belt.rust} из {belt.rustLimit}
          </b>
        </p>
        <span className="bl-meter" aria-hidden>
          {Array.from({ length: belt.rustLimit }, (_, i) => (
            <i key={i} className={i < belt.rust ? (i >= belt.rustLimit - 2 ? "on hot" : "on") : undefined} />
          ))}
        </span>
        <p className="bl-text">{rustText(belt)}</p>
      </div>
    </div>
  );
}

/** Полоса пояса на главной: пояс, носитель и ссылка на правила. */
export function BeltHome({ belt }: { belt: Belt | null }) {
  if (!belt) return null;
  return (
    <section className="sf-sec sf-night-2 sf-grain bl-home" aria-labelledby="belt-t">
      <div className="sf-wrap">
        <div className="sf-sec-head">
          <div>
            <p className="sf-eyebrow">Пояс лиги · переходит в обычных матчах 1×1</p>
            <h2 className="sf-h-big" id="belt-t">
              пояс лиги<span className="sf-dot">.</span>
            </h2>
          </div>
          <Link className="sf-more" href="/belt">
            Правила и история <Arrow />
          </Link>
        </div>
        <div className="bl-grid">
          <BeltPicture belt={belt} id="home-belt" />
          <BeltStatus belt={belt} />
        </div>
      </div>
    </section>
  );
}

/** Пояс в профиле игрока: сколько раз брал, сколько защит и сколько осталось до «Почётного носителя». */
export function BeltProfile({ belt, userId }: { belt: Belt | null; userId: string }) {
  if (!belt) return null;
  const now = serverNow();
  const me = holderStats(belt, now).find((s) => s.player.userId === userId);
  if (!me) return null;
  const last = me.reigns[me.reigns.length - 1];
  const honored = me.defenses >= belt.honorAt;
  const left = belt.honorAt - me.defenses;

  return (
    <section className="sf-block bl-prof" aria-labelledby="bl-prof-t">
      <div className="bl-prof-head">
        <h2 className="sf-h-mid" id="bl-prof-t">
          пояс лиги<span className="sf-dot">.</span>
        </h2>
        <Link className="sf-more" href="/belt">
          Правила и история <Arrow />
        </Link>
      </div>
      <div className="bl-prof-grid">
        <figure className="bl-prof-art">
          <BeltArt
            id={`prof-${userId}`}
            name={holderName(me.player)}
            stars={me.holdsNow ? belt.defenses : me.bestRun}
            rust={me.holdsNow ? belt.rust / belt.rustLimit : 0}
          />
          <figcaption>{me.holdsNow ? "держит пояс сейчас" : `держал пояс до ${shortDate(last.to)}`}</figcaption>
        </figure>
        <div className="bl-prof-body">
          <dl className="bl-prof-stats">
            <div>
              <dt>{plural(me.reigns.length, W_TIME)} брал пояс</dt>
              <dd>{me.reigns.length}</dd>
            </div>
            <div>
              <dt>{plural(me.days, W_DAY)} с поясом</dt>
              <dd>{me.days}</dd>
            </div>
            <div>
              <dt>{plural(me.defenses, W_DEF)} за всё время</dt>
              <dd>{me.defenses}</dd>
            </div>
            <div>
              <dt>рекорд защит подряд</dt>
              <dd>{me.bestRun}</dd>
            </div>
          </dl>
          <ol className="bl-prof-list">
            {me.reigns.map((r) => (
              <li key={r.matchId}>
                <b>{r.time}-й раз</b>
                <span>
                  {shortDate(r.from)} — {r.to ? shortDate(r.to) : "сейчас"} · {r.defenses.length} {plural(r.defenses.length, W_DEF)}
                </span>
                <span>{howEnded(r, belt.rustLimit)}</span>
              </li>
            ))}
          </ol>
          <div className="bl-prof-honor">
            <p className="bl-rust-h">
              <span>{honored ? "Почётный носитель" : "До «Почётного носителя»"}</span>
              <b>
                {Math.min(me.defenses, belt.honorAt)} из {belt.honorAt}
              </b>
            </p>
            <span className="bl-meter gold" aria-hidden>
              {Array.from({ length: belt.honorAt }, (_, i) => (
                <i key={i} className={i < me.defenses ? "on" : undefined} />
              ))}
            </span>
            <p className="bl-prof-note">
              {honored
                ? "Тег «Почётный носитель» остаётся навсегда."
                : `Ещё ${left} ${plural(left, W_DEF)} — и тег «Почётный носитель» навсегда. Защиты из разных владений складываются.`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlayerLink({ p }: { p: BeltPlayer }) {
  return <Link href={`/profile/${p.login}`}>{holderName(p)}</Link>;
}

/** «Берёт пояс уже 2-й раз» или «10-й носитель в истории лиги» - продолжение фразы о новом носителе. */
function newcomerText(r: BeltReign): string {
  return r.time > 1 ? `${holderName(r.holder)} берёт пояс уже ${r.time}-й раз.` : `${holderName(r.holder)} — ${r.newcomer}-й носитель в истории лиги.`;
}

/** Пояс на странице матча: что матч с ним сделал, а у идущего - за что он. other - соперник носителя. */
export function BeltMatch({ mark, belt, id, other }: { mark: MatchBeltMark; belt: Belt; id: string; other: string }) {
  let head = "";
  let text: ReactNode = null;
  let art: { name?: string; stars: number; rust?: number; vacant?: boolean } = { stars: 0 };

  switch (mark.kind) {
    case "first":
    case "take":
    case "pick": {
      const r = mark.reign;
      const p = mark.prev;
      const opp = r.opponent ? <PlayerLink p={r.opponent} /> : "соперника";
      art = { name: holderName(r.holder), stars: 0 };
      if (mark.kind === "first") {
        head = "первый носитель пояса";
        text = (
          <>
            <PlayerLink p={r.holder} /> выиграл первый матч лиги{r.opponent && <> у {opp}</>} и стал первым носителем пояса.
          </>
        );
      } else if (mark.kind === "take") {
        const days = p ? reignDays(p) : 0;
        const n = p?.defenses.length ?? 0;
        head = "пояс сменил хозяина";
        text = (
          <>
            <PlayerLink p={r.holder} /> обыграл носителя {opp} и забрал пояс лиги.
            {p && ` ${holderName(p.holder)} держал пояс ${days} ${plural(days, W_DAY)} и ${n ? `отбился ${n} ${plural(n, W_TIME)}` : "ни разу не отбился"}.`}{" "}
            {newcomerText(r)}
          </>
        );
      } else {
        head = "ничей пояс подобран";
        text = (
          <>
            <PlayerLink p={r.holder} /> обыграл {opp} и подобрал ничей пояс лиги.
            {p?.end === "drop" &&
              p.to &&
              ` Пояс был ничей с ${dayMonth(p.to)}: ${holderName(p.holder)} ${belt.rustLimit} ${plural(belt.rustLimit, W_GAMEDAY)} подряд не выходил на матч.`}{" "}
            {newcomerText(r)}
          </>
        );
      }
      break;
    }
    case "defense": {
      const r = mark.reign;
      const d = r.defenses[mark.n - 1];
      head = `защита №${mark.n}`;
      art = { name: holderName(r.holder), stars: mark.n };
      text = (
        <>
          <PlayerLink p={r.holder} /> отбился от <PlayerLink p={d.opponent} /> и сохранил пояс — это его {mark.n}-я защита подряд. Пояс у него с{" "}
          {dayMonth(r.from)}.
        </>
      );
      break;
    }
    case "draw":
      head = "пояс остался у носителя";
      art = { name: holderName(mark.reign.holder), stars: mark.stars };
      text = (
        <>
          Ничья: пояс остался у <PlayerLink p={mark.reign.holder} />, а ржавчина сошла — счёт игровых дней без матча начался заново.
        </>
      );
      break;
    case "defend":
      head = "матч за пояс";
      art = { name: holderName(mark.holder), stars: mark.defenses, rust: mark.rust / belt.rustLimit };
      text = (
        <>
          <PlayerLink p={mark.holder} /> защищает пояс лиги
          {mark.defenses ? ` — за ним уже ${mark.defenses} ${plural(mark.defenses, W_DEF)} подряд` : " — это его первая защита"}. Победит {other} —
          пояс перейдёт к нему, ничья оставит пояс у носителя.
        </>
      );
      break;
    case "vacant":
      head = "матч за ничей пояс";
      art = { vacant: true, stars: 0 };
      text = !belt.reigns.length
        ? "Пояс ещё не разыгран: победитель этого матча станет первым носителем."
        : mark.leaders.length
          ? "Пояс ничей, и его разыгрывает ближайший обычный матч лидера таблицы сезона — этот. Победитель заберёт пояс, ничья его не разыграет."
          : "Пояс ничей, и в сезоне ещё не было матчей: этот матч его разыграет. Победитель заберёт пояс, ничья — нет.";
      break;
  }

  return (
    <div className="sf-m-block bl-match">
      <div className="bl-match-head">
        <div>
          <p className="sf-eyebrow">Пояс лиги</p>
          <h2 className="sf-h-mid">
            {head}
            <span className="sf-dot">.</span>
          </h2>
        </div>
        <Link className="sf-more" href="/belt">
          Правила и история <Arrow />
        </Link>
      </div>
      <div className="bl-match-grid">
        <figure className="bl-prof-art">
          <BeltArt id={`match-${id}`} name={art.name} stars={art.stars} rust={art.rust ?? 0} vacant={art.vacant} />
        </figure>
        <p className="bl-match-text">{text}</p>
      </div>
    </div>
  );
}
