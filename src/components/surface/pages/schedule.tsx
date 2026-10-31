import Link from "next/link";
import "./schedule.css";
import { getCurrentMatch, getTournaments } from "@/lib/queries";
import { isShowMatch, roundsLabel } from "@/lib/match";
import { TELEGRAM_URL } from "@/lib/links";
import type { Tournament } from "@/lib/types";
import { TelegramIcon } from "@/components/icons";
import { Stripes } from "@/components/surface/stripes";
import { Arrow, SecHead } from "@/components/surface/ui";
import { GeneratedPoster } from "@/components/surface/home-parts";
import { FlipCountdown, ShortCountdown, Tilt } from "@/components/surface/motion";
import { byStartAsc } from "@/components/surface/shell";
import { hhmm, shortDate, splitTitle, weekdayDate, weekdayLong } from "@/components/surface/fmt";

/** Квадратная картинка шоу-матча целиком или лента-заглушка, если картинки нет. */
function Art({ t }: { t: Tournament }) {
  return (
    <span className="sch-art" aria-hidden>
      {t.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- картинка из нашего хранилища медиа
        <img src={t.previewUrl} alt="" loading="lazy" />
      ) : (
        <Stripes shape="poster" />
      )}
    </span>
  );
}

/** Главный шоу-матч страницы: идущий сейчас или ближайший по дате. */
function ShowHero({ t, live }: { t: Tournament; live: boolean }) {
  const [a, b] = splitTitle(t.title);
  const facts = [
    t.startsAt ? { k: weekdayLong(t.startsAt), v: `${shortDate(t.startsAt)} · ${hhmm(t.startsAt)}` } : null,
    { k: "формат", v: `${t.mode} · ${roundsLabel(t.totalRounds)}` },
    t.prize ? { k: "приз", v: t.prize } : null,
  ].filter((f): f is { k: string; v: string } => f !== null);

  return (
    <div className="sch-hero">
      <Tilt className="sf-poster sch-poster">
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
      <div className="sch-hero-info">
        <p className="sch-kicker">
          {live ? (
            <span className="sch-live">
              <i />
              сейчас в эфире
            </span>
          ) : (
            "следующий шоу-матч"
          )}
        </p>
        <h2 className="sch-names">
          <span>{a}</span>
          <em>vs</em>
          <span>{b || "—"}</span>
        </h2>
        <dl className="sch-facts">
          {facts.map((f) => (
            <div key={f.k}>
              <dt>{f.k}</dt>
              <dd>{f.v}</dd>
            </div>
          ))}
        </dl>
        {!live && t.startsAt && (
          <div className="sch-cd">
            <p className="sf-eyebrow">До начала</p>
            <FlipCountdown to={t.startsAt} label="До начала шоу-матча" />
          </div>
        )}
        <div className="sf-controls">
          <Link className="sf-btn sf-btn-amber" href={`/tournament/${t.id}`}>
            {live ? "Смотреть матч" : "Страница матча"}
          </Link>
          <a className="sf-btn sf-btn-line" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
            <TelegramIcon />
            Анонсы в Telegram
          </a>
        </div>
      </div>
    </div>
  );
}

/** Ещё один объявленный шоу-матч. */
function UpcomingShow({ t }: { t: Tournament }) {
  const [a, b] = splitTitle(t.title);
  return (
    <Link className="sch-card" href={`/tournament/${t.id}`}>
      <Art t={t} />
      <span className="sch-card-body">
        <small>{t.startsAt ? `${weekdayDate(t.startsAt)} · ${hhmm(t.startsAt)}` : "дата объявится позже"}</small>
        <b>
          {a} <em>vs</em> {b}
        </b>
        <span className="sch-card-meta">{[roundsLabel(t.totalRounds), t.prize ? `приз ${t.prize}` : ""].filter(Boolean).join(" · ")}</span>
        {t.startsAt && (
          <span className="sch-card-cd">
            <ShortCountdown to={t.startsAt} prefix="через " soon="скоро начало" />
          </span>
        )}
      </span>
    </Link>
  );
}

function PastShow({ t }: { t: Tournament }) {
  const [a, b] = splitTitle(t.title);
  const [sa, sb] = t.score?.length === 2 ? t.score : [];
  const winner = t.score?.find((s) => s.winner);
  const maps = t.roundMaps?.length ? t.roundMaps : t.maps;
  const meta = [t.startsAt ? weekdayDate(t.startsAt) : "", roundsLabel(t.totalRounds), t.prize ? `приз ${t.prize}` : ""];
  return (
    <Link className="sch-card past" href={`/tournament/${t.id}`}>
      <Art t={t} />
      <span className="sch-card-body">
        <small>{meta.filter(Boolean).join(" · ")}</small>
        <b>
          {a} <em>vs</em> {b}
        </b>
        {sa && sb && (sa.points > 0 || sb.points > 0) && (
          <span className="sch-card-score">
            {sa.points}
            <i>:</i>
            {sb.points}
          </span>
        )}
        <span className="sch-card-meta">
          {winner ? `победа ${winner.name}` : "ничья"}
          {maps.length ? ` · ${maps.join(" · ")}` : ""}
        </span>
      </span>
    </Link>
  );
}

/** Шоу-матчи: идущий или ближайший крупным планом, остальные анонсы и сыгранные. Регулярные матчи ведущий
    собирает в эфире - их здесь нет, они лежат в результатах. */
export async function SurfaceSchedule() {
  const [all, match] = await Promise.all([getTournaments(), getCurrentMatch()]);
  const upcoming = all.filter((t) => t.status === "upcoming" && isShowMatch(t)).sort(byStartAsc);
  const past = all.filter((t) => t.status === "finished" && isShowMatch(t)).sort((a, b) => byStartAsc(b, a));
  const liveShow = match.current && isShowMatch(match.current.tournament) ? match.current.tournament : null;
  const hero = liveShow ?? upcoming[0] ?? null;
  const rest = liveShow ? upcoming : upcoming.slice(1);

  return (
    <>
      <section className="sf-page-head sf-night sf-grain sch-top">
        <Stripes shape="corner" className="corner" draw />
        <div className="sf-wrap">
          <p className="sf-eyebrow">Шоу-матчи · время московское</p>
          <h1 className="sf-h-big">
            шоу-матчи<span className="sf-dot">.</span>
          </h1>
          <p className="sf-lead sch-lead">
            Громкие поединки, которые объявляем заранее: пики и баны, несколько раундов, бонусные задания и приз. Обычные матчи ведущий собирает прямо в эфире — их результаты лежат в архиве.
          </p>
          {hero ? (
            <ShowHero t={hero} live={!!liveShow} />
          ) : (
            <div className="sch-empty">
              <p className="sch-kicker">следующий шоу-матч</p>
              <h2 className="sch-names single">
                <span>Пока не назначен</span>
              </h2>
              <p className="sf-lead">Анонс появится здесь и в Telegram, как только ведущий объявит дату.</p>
              <div className="sf-controls">
                <a className="sf-btn sf-btn-amber" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                  <TelegramIcon />
                  Анонсы в Telegram
                </a>
                <Link className="sf-btn sf-btn-line" href="/join">
                  Участвовать в лиге
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {rest.length > 0 && (
        <section className="sf-sec sf-night-2 sf-grain" aria-labelledby="sch-next-t">
          <div className="sf-wrap">
            <SecHead eyebrow="Уже в расписании" title="дальше" id="sch-next-t" />
            <ul className="sch-grid">
              {rest.map((t) => (
                <li key={t.id}>
                  <UpcomingShow t={t} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="sf-sec sf-paper sf-grain" aria-labelledby="sch-past-t">
        <div className="sf-wrap">
          <SecHead
            eyebrow="Были в эфире"
            title="прошедшие шоу-матчи"
            id="sch-past-t"
            action={
              <Link className="sf-more" href="/archive">
                Все результаты <Arrow />
              </Link>
            }
          />
          {past.length ? (
            <ul className="sch-grid">
              {past.map((t) => (
                <li key={t.id}>
                  <PastShow t={t} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="sf-note">Здесь появятся сыгранные шоу-матчи.</p>
          )}
        </div>
      </section>
    </>
  );
}
