import Link from "next/link";
import { BoostyIcon, DiscordIcon, TelegramIcon, TwitchIcon, YouTubeIcon } from "@/components/icons";
import { BOOSTY_URL, STREAM_URL, TELEGRAM_URL, YOUTUBE_URL } from "@/lib/links";
import { Mark, Wordmark } from "@/components/surface/stripes";

/** Сезон для ссылки на его итоги: идущий, а между сезонами - последний. */
export interface FooterSeason {
  number: number;
  active: boolean;
}

function links(season?: FooterSeason | null) {
  return [
    { href: "/schedule", label: "Шоу-матчи" },
    { href: "/archive", label: "Результаты" },
    { href: "/rating", label: "Рейтинг" },
    ...(season ? [{ href: `/season/${season.number}`, label: season.active ? "Сезон в цифрах" : "Итоги сезона" }] : []),
    { href: "/patches", label: "Нашивки" },
    { href: "/belt", label: "Пояс лиги" },
    { href: "/rules", label: "Правила" },
    { href: "/highlights", label: "Лучшие моменты" },
  ];
}

const SOCIALS = [
  { label: "Twitch", href: STREAM_URL, Icon: TwitchIcon },
  { label: "YouTube", href: YOUTUBE_URL, Icon: YouTubeIcon },
  { label: "Telegram", href: TELEGRAM_URL, Icon: TelegramIcon },
  { label: "Discord", href: "https://discord.gg/p5NsqPQMJr", Icon: DiscordIcon },
  { label: "Boosty", href: BOOSTY_URL, Icon: BoostyIcon },
];

export function SurfaceFooter({ season }: { season?: FooterSeason | null }) {
  return (
    <footer className="sf-foot">
      <div className="sf-wrap">
        <div className="sf-foot-top">
          <Link href="/" className="sf-brand">
            <Mark />
            <Wordmark />
          </Link>
          <nav className="sf-foot-links" aria-label="Разделы сайта">
            {links(season).map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
          <nav className="sf-socials" aria-label="Соцсети">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
                <Icon />
              </a>
            ))}
          </nav>
        </div>
        <div className="sf-foot-bottom">
          <div className="sf-foot-legal">
            <p>© {new Date().getFullYear()} GOARC.PRO. Все права защищены.</p>
            <p>GOARC.PRO, Лига, Турниры и Шоу-Матчи по ARC Raiders. Автор и организатор проекта: Денис Блим.</p>
            <p>
              Исключительные права на оригинальные материалы проекта принадлежат их законным правообладателям. Копирование, воспроизведение,
              переработка, распространение и повторное использование материалов сайта, оригинальных текстов правил, графических материалов,
              программного кода и базы данных без разрешения соответствующего правообладателя не допускаются, кроме случаев, предусмотренных
              законом.
            </p>
            <p>
              GOARC.PRO является независимым фанатским проектом и не связан с Embark Studios AB. ARC Raiders и связанные с игрой объекты
              интеллектуальной собственности принадлежат их соответствующим правообладателям.
            </p>
          </div>
          <p>
            Разработка и поддержка — <Link href="/profile/Istwood">Istwood</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
