import Link from "next/link";
import "./schedule.css";
import { getCurrentMatch, getTournaments } from "@/lib/queries";
import { isShowMatch, roundsLabel } from "@/lib/match";
import { TELEGRAM_URL } from "@/lib/links";
import type { Tournament } from "@/lib/types";
import { TelegramIcon } from "@/components/icons";
import { Stripes } from "@/components/surface/stripes";
import { Arrow, SecHead } from "@/components/surface/ui";
import { ScheduleRows } from "@/components/surface/home-parts";
import { byStartAsc } from "@/components/surface/shell";
import { splitTitle, weekdayDate } from "@/components/surface/fmt";

function PastShow({ t }: { t: Tournament }) {
  const [a, b] = splitTitle(t.title);
  const [sa, sb] = t.score?.length === 2 ? t.score : [];
  const winner = t.score?.find((s) => s.winner);
  const maps = t.roundMaps?.length ? t.roundMaps : t.maps;
  const meta = [t.startsAt ? weekdayDate(t.startsAt) : "", roundsLabel(t.totalRounds), t.prize ? `приз ${t.prize}` : ""];
  return (
    <Link className="sch-show" href={`/tournament/${t.id}`}>
      <span className="sch-show-art" aria-hidden>
        {t.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- картинка из нашего хранилища медиа
          <img src={t.previewUrl} alt="" loading="lazy" />
        ) : (
          <Stripes shape="poster" />
        )}
      </span>
      <span className="sch-show-body">
        <small>{meta.filter(Boolean).join(" · ")}</small>
        <b>
          {a} <em>vs</em> {b}
        </b>
        {sa && sb && (sa.points > 0 || sb.points > 0) && (
          <span className="sch-show-score">
            {sa.points}
            <i>:</i>
            {sb.points}
          </span>
        )}
        <span className="sch-show-res">
          {winner ? `победа ${winner.name}` : "ничья"}
          {maps.length ? ` · ${maps.join(" · ")}` : ""}
        </span>
      </span>
    </Link>
  );
}

/** Матчи в новом дизайне: идущий матч и анонсы по дате, ниже - сыгранные шоу-матчи. */
export async function SurfaceSchedule() {
  const [all, match] = await Promise.all([getTournaments(), getCurrentMatch()]);
  const upcoming = all.filter((t) => t.status === "upcoming").sort(byStartAsc);
  // Обычные матчи ведущий создаёт прямо в эфире, поэтому в прошлом расписания - только шоу-матчи.
  const past = all.filter((t) => t.status === "finished" && isShowMatch(t)).sort((a, b) => byStartAsc(b, a));

  return (
    <>
      <section className="sf-page-head sf-night sf-grain sch-top">
        <Stripes shape="corner" className="corner" draw />
        <div className="sf-wrap">
          <p className="sf-eyebrow">Матчи · время московское</p>
          <h1 className="sf-h-big">
            матчи<span className="sf-dot">.</span>
          </h1>
          <p className="sf-lead sch-lead">
            Шоу-матчи объявляем заранее. Обычные матчи 1×1 ведущий собирает прямо в эфире — все сыгранные лежат в результатах.
          </p>
          <div className="sf-controls">
            <Link className="sf-btn sf-btn-amber" href="/join">
              Участвовать в лиге
            </Link>
            <a className="sf-btn sf-btn-line" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
              <TelegramIcon />
              Анонсы в Telegram
            </a>
          </div>
          <div className="sch-list">
            <ScheduleRows live={match.current} upcoming={upcoming} />
            {!upcoming.some(isShowMatch) && <p className="sch-none">Шоу-матч пока не назначен — анонс появится здесь и в Telegram.</p>}
          </div>
        </div>
      </section>

      <section className="sf-sec sf-paper sf-grain">
        <div className="sf-wrap">
          <SecHead
            eyebrow="Были в эфире"
            title="прошедшие шоу-матчи"
            action={
              <Link className="sf-more" href="/archive">
                Все результаты <Arrow />
              </Link>
            }
          />
          {past.length ? (
            <ul className="sch-past">
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
