import "./news.css";
import Link from "next/link";
import { TelegramIcon } from "@/components/icons";
import { TELEGRAM_URL } from "@/lib/links";
import { getNews } from "@/lib/queries";
import type { News } from "@/lib/types";
import { Stripes } from "@/components/surface/stripes";
import { Arrow, ArrowBack } from "@/components/surface/ui";
import { fullDate } from "@/components/surface/fmt";
import { NewsBody } from "@/components/surface/news-body";
import { newsExcerpt } from "@/components/surface/news-text";
import { BeltArt } from "@/components/surface/belt-art";

const PAGE = 12;

/** «1 новость», «3 новости», «5 новостей». */
function newsWord(n: number): string {
  const a = n % 100;
  const b = n % 10;
  if (a > 10 && a < 20) return "новостей";
  return b === 1 ? "новость" : b >= 2 && b <= 4 ? "новости" : "новостей";
}

function NewsCard({ n, lead }: { n: News; lead: boolean }) {
  const text = newsExcerpt(n.body, lead ? 320 : 180);
  return (
    <Link className={`nw-card ${lead ? "lead" : ""} ${n.imageUrl || n.belt ? "" : "no-art"}`} href={`/news/${n.id}`}>
      {n.imageUrl ? (
        <span className="nw-card-art" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- картинка из нашего хранилища медиа */}
          <img src={n.imageUrl} alt="" loading={lead ? undefined : "lazy"} />
        </span>
      ) : (
        n.belt && (
          <span className="nw-card-art nw-belt" aria-hidden>
            <BeltArt id={`news-${n.id}`} name={n.belt.name} stars={n.belt.stars} vacant={n.belt.vacant} />
          </span>
        )
      )}
      <span className="nw-card-body">
        <time dateTime={n.publishedAt ?? undefined}>{fullDate(n.publishedAt)}</time>
        <b>{n.title}</b>
        {text && <span className="nw-card-text">{text}</span>}
        <span className="sf-more">
          Читать <Arrow />
        </span>
      </span>
    </Link>
  );
}

/** Лента новостей в новом дизайне: свежие сверху, первая на первой странице - крупно. */
export async function SurfaceNews({ page }: { page: number }) {
  const { items, total } = await getNews({ limit: PAGE, offset: (page - 1) * PAGE });
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <section className="sf-page-head sf-night sf-grain nw-top">
        <Stripes shape="corner" className="corner" draw />
        <div className="sf-wrap">
          <p className="sf-eyebrow">Новости{total ? ` · ${total} ${newsWord(total)}` : ""}</p>
          <h1 className="sf-h-big">
            новости<span className="sf-dot">.</span>
          </h1>
          <p className="sf-lead nw-lead">Сезоны, шоу-матчи и всё, что происходит в лиге. Анонсы эфиров — ещё и в Telegram.</p>
          <div className="sf-controls">
            <a className="sf-btn sf-btn-line" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
              <TelegramIcon />
              Анонсы в Telegram
            </a>
          </div>
        </div>
      </section>

      <section className="sf-sec sf-paper sf-grain">
        <div className="sf-wrap">
          {items.length ? (
            <ul className="nw-list">
              {items.map((n, i) => (
                <li key={n.id} className={page === 1 && i === 0 ? "lead" : ""}>
                  <NewsCard n={n} lead={page === 1 && i === 0} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="sf-note">{page > 1 ? "На этой странице новостей нет." : "Новостей пока нет — первые появятся здесь."}</p>
          )}
          {pages > 1 && (
            <nav className="nw-pager" aria-label="Страницы новостей">
              {page > 1 ? (
                <Link className="sf-more" href={page === 2 ? "/news" : `/news?page=${page - 1}`}>
                  <ArrowBack />
                  Новее
                </Link>
              ) : (
                <span />
              )}
              <span className="nw-pager-n">
                {page} из {pages}
              </span>
              {page < pages ? (
                <Link className="sf-more" href={`/news?page=${page + 1}`}>
                  Раньше <Arrow />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      </section>
    </>
  );
}

/** Одна новость. Черновик и запланированную видит только организатор - с пометкой. */
export function SurfaceNewsItem({ n }: { n: News }) {
  const when = n.published
    ? fullDate(n.publishedAt)
    : n.publishedAt
      ? `Выйдет ${fullDate(n.publishedAt)} · видно только организатору`
      : "Черновик · видно только организатору";

  return (
    <>
      <section className="sf-page-head sf-night sf-grain nw-top">
        <Stripes shape="corner" className="corner" draw />
        <div className="sf-wrap">
          <Link className="sf-back" href="/news">
            <ArrowBack />
            Все новости
          </Link>
          <p className="sf-eyebrow">{when}</p>
          <h1 className="nw-title">{n.title}</h1>
        </div>
      </section>

      <section className="sf-sec sf-paper sf-grain nw-article-sec">
        <div className="sf-wrap">
          <article className="nw-article">
            {n.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- картинка из нашего хранилища медиа
              <img className="nw-article-img" src={n.imageUrl} alt="" />
            ) : (
              n.belt && (
                <div className="nw-article-belt" aria-hidden>
                  <BeltArt id={`news-${n.id}`} name={n.belt.name} stars={n.belt.stars} vacant={n.belt.vacant} />
                </div>
              )
            )}
            <NewsBody html={n.body} />
            <Link className="sf-more nw-article-back" href="/news">
              <ArrowBack />
              Все новости
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}
