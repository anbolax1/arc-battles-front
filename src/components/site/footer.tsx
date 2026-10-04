import Link from "next/link";
import { BoltIcon, DiscordIcon, TelegramIcon, TwitchIcon, YouTubeIcon } from "@/components/icons";
import { STREAM_URL, TELEGRAM_URL, YOUTUBE_URL } from "@/lib/links";

const LINKS = [
  { href: "/schedule", label: "Расписание" },
  { href: "/rating", label: "Рейтинг" },
  { href: "/archive", label: "Архив" },
  { href: "/highlights", label: "Хайлайты" },
  { href: "/rules", label: "Правила" },
];

const SOCIALS = [
  { label: "Twitch", href: STREAM_URL, Icon: TwitchIcon, hover: "hover:text-[var(--twitch)]" },
  { label: "YouTube", href: YOUTUBE_URL, Icon: YouTubeIcon, hover: "hover:text-[var(--youtube)]" },
  { label: "Telegram", href: TELEGRAM_URL, Icon: TelegramIcon, hover: "hover:text-[#29a9eb]" },
  { label: "Discord", href: "https://discord.gg/p5NsqPQMJr", Icon: DiscordIcon, hover: "hover:text-[#5865f2]" },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-black/30">
      <div className="mx-auto max-w-[1240px] space-y-4 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-3">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="logo-mark h-7 w-7">
              <BoltIcon />
            </span>
            <span className="font-display text-sm uppercase leading-none tracking-wide">
              Битва за <span className="text-primary-2">Респект</span>
            </span>
          </Link>
          <nav aria-label="Разделы сайта" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="transition hover:text-fg">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div className="max-w-xl space-y-1.5 text-xs leading-relaxed text-muted">
            <p>
              © {new Date().getFullYear()} Битва за Респект. Турниры сообщества Arc Raiders в эфире у Дениса Блима.
              Не является официальным продуктом Embark Studios.
            </p>
            <p>
              Разработка и поддержка by{" "}
              <Link href="/profile/Istwood" className="font-semibold text-primary-2 transition hover:text-fg">
                Istwood
              </Link>
            </p>
          </div>
          <nav aria-label="Соцсети" className="flex items-center gap-4">
            {SOCIALS.map(({ label, href, Icon, hover }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className={`text-muted transition hover:-translate-y-0.5 ${hover}`}
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
