import Link from "next/link";
import type { Belt, BeltReign } from "@/lib/types";
import { getBelt, getSeasons } from "@/lib/queries";
import { Stripes } from "@/components/surface/stripes";
import { shortDate, dayMonth } from "@/components/surface/fmt";
import { plural, W_DAY } from "@/components/surface/season-lib";
import { BeltPicture, BeltStatus } from "@/components/surface/belt-parts";
import { BeltTimeline, type TimelineSeason } from "@/components/surface/belt-timeline";
import { W_CHANGE, W_DEF, W_GAMEDAY, W_HOLDER, W_TIME, holderName, holderStats, reignDays, serverNow, type BeltHolderStats } from "@/components/surface/belt-lib";
import "@/components/surface/belt.css";

function rules(belt: Belt): { title: string; text: string }[] {
  return [
    {
      title: "Один пояс на всю лигу",
      text: "Пояс не привязан к сезону. Рейтинг каждый сезон начинается заново, а пояс остаётся у носителя. Между сезонами часы пояса стоят.",
    },
    {
      title: "Обыграл носителя — пояс твой",
      text: "За пояс идёт любой обычный матч 1×1, где играет носитель. Шоу-матчи и матчи 2×2 пояс не трогают, матч с жетоном ×2 — один матч за пояс. Ничья оставляет пояс у носителя.",
    },
    {
      title: "Каждая защита — звезда",
      text: "Выиграл матч, держа пояс, — на поясе загорается звезда. Звёзды показывают, сколько раз нынешний носитель отбился; у нового носителя счёт начинается с нуля.",
    },
    {
      title: "Пояс ржавеет",
      text: `Игровой день — день, когда в лиге был хотя бы один обычный матч. Если носитель ${belt.rustLimit} ${plural(belt.rustLimit, W_GAMEDAY)} подряд не выходит на обычный матч, пояс выпадает и становится ничьим.`,
    },
    {
      title: "Ничей пояс разыгрывает лидер",
      text: "Ближайший обычный матч лидера таблицы сезона идёт за пояс: выиграл лидер — пояс его, проиграл — пояс у того, кто его обыграл. Пока в сезоне нет матчей, пояс разыгрывает первый матч сезона.",
    },
    {
      title: "Почётный носитель",
      text: `${belt.honorAt} ${plural(belt.honorAt, W_DEF)} за всё время — пожизненный тег «Почётный носитель». Защиты из разных владений поясом складываются.`,
    },
  ];
}

function howShort(r: BeltReign): string {
  if (r.how === "first") return "первый матч лиги";
  if (r.how === "pick") return "подобрал ничей пояс";
  return r.opponent ? `обыграл ${holderName(r.opponent)}` : "обыграл носителя";
}

function Plate({ r, now }: { r: BeltReign; now: number }) {
  const days = reignDays(r, now);
  return (
    <li className={`bl-plate ${r.end ? "" : "now"}`}>
      {r.end === "drop" && <span className="bl-plate-drop">выпал</span>}
      <span className="bl-plate-dates">
        {shortDate(r.from)} — {r.to ? shortDate(r.to) : "сейчас"}
        {r.time > 1 ? ` · ${r.time}-й раз` : ""}
      </span>
      <Link href={`/profile/${r.holder.login}`} className={`bl-plate-name ${holderName(r.holder).length > 9 ? "long" : ""}`}>
        {holderName(r.holder)}
      </Link>
      <span className="bl-plate-meta">
        {days} {plural(days, W_DAY)} · {r.defenses.length} {plural(r.defenses.length, W_DEF)}
      </span>
      <span className="bl-plate-how">{r.end ? howShort(r) : "держит сейчас"}</span>
    </li>
  );
}

function Records({ belt, stats, now }: { belt: Belt; stats: BeltHolderStats[]; now: number }) {
  const runs = [...belt.reigns].sort((a, b) => b.defenses.length - a.defenses.length);
  const best = runs[0];
  const kept = belt.reigns.filter((r) => r.end !== "drop");
  const longest = kept.reduce((a, r) => (reignDays(r, now) > reignDays(a, now) ? r : a), kept[0] ?? belt.reigns[0]);
  const most = Math.max(...stats.map((s) => s.reigns.length));
  const often = stats.filter((s) => s.reigns.length === most).map((s) => holderName(s.player));
  const honor = [...stats].sort((a, b) => b.defenses - a.defenses).slice(0, 5);
  const longestDays = reignDays(longest, now);

  return (
    <div className="bl-records-grid">
      <dl className="bl-records">
        {best && best.defenses.length > 0 && (
          <div>
            <dt>Больше всех защит подряд</dt>
            <dd>
              {best.defenses.length} <small>{plural(best.defenses.length, W_DEF)}</small>
            </dd>
            <p className="bl-rec-who">{holderName(best.holder)}</p>
            <p>
              {dayMonth(best.from)} — {best.to ? dayMonth(best.to) : "сейчас"}: {best.defenses.map((d) => holderName(d.opponent)).join(", ")}
            </p>
          </div>
        )}
        <div>
          <dt>Дольше всех держал, играя</dt>
          <dd>
            {longestDays} <small>{plural(longestDays, W_DAY)}</small>
          </dd>
          <p className="bl-rec-who">{holderName(longest.holder)}</p>
          <p>Не в счёт те, у кого пояс выпал от ржавчины.</p>
        </div>
        <div>
          <dt>Чаще всех брал пояс</dt>
          <dd>
            {most} <small>{plural(most, W_TIME)}</small>
          </dd>
          <p className="bl-rec-who">{often.join(" и ")}</p>
          <p>Пояс возвращается к тем, кто играет часто.</p>
        </div>
      </dl>
      <div className="bl-honor">
        <h3 className="sf-h-up">к почётному носителю</h3>
        <p className="bl-honor-lead">
          {belt.honorAt} {plural(belt.honorAt, W_DEF)} за всё время — и тег навсегда.
        </p>
        <ol className="bl-honor-list">
          {honor.map((s) => (
            <li key={s.player.userId}>
              <Link href={`/profile/${s.player.login}`}>{holderName(s.player)}</Link>
              <span className="bl-honor-bar" aria-hidden>
                <i style={{ width: `${Math.min(100, (s.defenses * 100) / belt.honorAt)}%` }} />
              </span>
              <b>
                {s.defenses} из {belt.honorAt}
              </b>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Пояс лиги: правила, нынешний носитель и вся история с первого матча на сайте. */
export async function SurfaceBelt() {
  const [belt, seasons] = await Promise.all([getBelt(), getSeasons()]);
  const now = serverNow();

  if (!belt) {
    return (
      <section className="sf-page-head sf-night sf-grain">
        <div className="sf-wrap">
          <p className="sf-eyebrow">Пояс лиги</p>
          <h1 className="sf-h-big">
            пояс лиги<span className="sf-dot">.</span>
          </h1>
          <p className="sf-lead bl-lead">Не удалось загрузить пояс. Обнови страницу чуть позже.</p>
        </div>
      </section>
    );
  }

  const stats = holderStats(belt, now);
  const changes = Math.max(0, belt.reigns.length - 1);
  const timeline: TimelineSeason[] = [...seasons]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((s) => ({ label: s.number ? `${s.number} сезон` : s.name, from: s.startedAt, to: s.endedAt ?? undefined }));

  return (
    <>
      <section className="sf-page-head sf-night sf-grain bl-head">
        <Stripes shape="corner" draw className="corner" />
        <div className="sf-wrap">
          <p className="sf-eyebrow">Пояс лиги{belt.reigns.length ? ` · с ${dayMonth(belt.reigns[0].from)} ${new Date(belt.reigns[0].from).getFullYear()}` : ""}</p>
          <h1 className="sf-h-big">
            пояс лиги<span className="sf-dot">.</span>
          </h1>
          <p className="sf-lead bl-lead">
            Пояс всегда у кого-то одного. Его забирают в обычных матчах, и держать его может любой игрок лиги — от новичка до лидера таблицы.
          </p>
          <div className="bl-grid">
            <BeltPicture belt={belt} id="page-belt" />
            <BeltStatus belt={belt} />
          </div>
        </div>
      </section>

      <section className="sf-sec sf-paper sf-grain bl-rules-sec" aria-labelledby="bl-rules-t">
        <div className="sf-wrap">
          <div className="sf-sec-head">
            <div>
              <p className="sf-eyebrow">Как это работает</p>
              <h2 className="sf-h-big" id="bl-rules-t">
                правила<span className="sf-dot">.</span>
              </h2>
            </div>
          </div>
          <ol className="bl-rules">
            {rules(belt).map((r) => (
              <li key={r.title}>
                <h3>{r.title}</h3>
                <p>{r.text}</p>
              </li>
            ))}
          </ol>
          <p className="bl-rules-note">
            Пояс считается сам: его выводят из сыгранных матчей, как нашивки, руками его никто не вписывает. Если матч отменят или поправят, пояс пересчитается.
          </p>
        </div>
      </section>

      {belt.reigns.length > 0 && (
        <section className="sf-sec sf-night-2 sf-grain" aria-labelledby="bl-hist-t">
          <div className="sf-wrap">
            <div className="sf-sec-head">
              <div>
                <p className="sf-eyebrow">
                  {changes} {plural(changes, W_CHANGE)} · {stats.length} {plural(stats.length, W_HOLDER)}
                </p>
                <h2 className="sf-h-big" id="bl-hist-t">
                  история<span className="sf-dot">.</span>
                </h2>
              </div>
              <p className="sf-lead bl-hist-lead">Имя каждого носителя остаётся на табличке. Наведи на отрезок или точку — покажем, кто, когда и с кем.</p>
            </div>
            <BeltTimeline belt={belt} seasons={timeline} now={now} />
            <p className="bl-legend">
              <span>
                <i className="past" />
                держал пояс
              </span>
              <span>
                <i className="now" />
                держит сейчас
              </span>
              <span>
                <i className="vac" />
                пояс ничей
              </span>
              <span>
                <i className="dot" />
                защита
              </span>
              <span>
                <i className="drop" />
                пояс выпал
              </span>
            </p>
            <ol className="bl-plates" aria-label="Носители пояса по порядку">
              {belt.reigns.map((r, i) => (
                <Plate key={r.matchId + i} r={r} now={now} />
              ))}
            </ol>
          </div>
        </section>
      )}

      {stats.length > 0 && (
        <section className="sf-sec sf-paper sf-grain" aria-labelledby="bl-rec-t">
          <div className="sf-wrap">
            <div className="sf-sec-head">
              <div>
                <p className="sf-eyebrow">Рекорды пояса</p>
                <h2 className="sf-h-big" id="bl-rec-t">
                  рекорды<span className="sf-dot">.</span>
                </h2>
              </div>
            </div>
            <Records belt={belt} stats={stats} now={now} />
          </div>
        </section>
      )}
    </>
  );
}
