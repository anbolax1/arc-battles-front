import Link from "next/link";
import { BoostyIcon, DiscordIcon, TelegramIcon, TwitchIcon, YouTubeIcon } from "@/components/icons";
import { BOOSTY_URL, STREAM_URL, TELEGRAM_URL, YOUTUBE_URL } from "@/lib/links";
import { Mark } from "@/components/surface/stripes";

/** Сезон для ссылки на его итоги: идущий, а между сезонами - последний. */
export interface FooterSeason {
  number: number;
  active: boolean;
}

function links(season?: FooterSeason | null) {
  return [
    { href: "/schedule", label: "Расписание" },
    { href: "/rating", label: "Рейтинг" },
    ...(season ? [{ href: `/season/${season.number}`, label: season.active ? "Сезон в цифрах" : "Итоги сезона" }] : []),
    { href: "/patches", label: "Нашивки" },
    { href: "/archive", label: "Архив" },
    { href: "/highlights", label: "Хайлайты" },
    { href: "/rules", label: "Правила" },
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
            <b>Битва за Респект</b>
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
          <p>
            © {new Date().getFullYear()} Битва за Респект. Турниры сообщества Arc Raiders в эфире у Дениса Блима. Фанатский турнир, не является
            официальным продуктом Embark Studios.
          </p>
          <p>
            Разработка и поддержка — <Link href="/profile/Istwood">Istwood</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
