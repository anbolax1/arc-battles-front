import {
  BoltIcon,
  DiscordIcon,
  TelegramIcon,
  TwitchIcon,
  YouTubeIcon,
} from "@/components/icons";

const SOCIALS = [
  { label: "Boosty", href: "https://boosty.to/", Icon: BoltIcon },
  { label: "Discord", href: "https://discord.gg/p5NsqPQMJr", Icon: DiscordIcon },
  { label: "Telegram", href: "https://t.me/", Icon: TelegramIcon },
  { label: "Twitch", href: "https://twitch.tv/", Icon: TwitchIcon },
  { label: "YouTube", href: "https://youtube.com/", Icon: YouTubeIcon },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-[linear-gradient(180deg,transparent,rgba(255,106,26,0.03))]">
      <div className="mx-auto max-w-[1240px] px-6 py-12">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-md space-y-3">
            <div className="flex items-center gap-3">
              <span className="logo-mark">
                <BoltIcon />
              </span>
              <span className="font-display text-lg uppercase leading-none tracking-wide">
                Битва за <span className="text-primary-2">Респект</span>
              </span>
            </div>
            <p className="text-sm text-muted">
              Серия турниров по Arc Raiders в прямом эфире. Ведущий — Денис Блим.
              Заходи в сообщество, регистрируйся и забирай звание Чемпиона.
            </p>
          </div>

          <nav aria-label="Соцсети" className="flex flex-wrap gap-3">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="flex h-11 w-11 items-center justify-center bg-surface-2 text-muted shadow-[inset_0_0_0_1px_var(--border)] transition-[transform,color] hover:-translate-y-0.5 hover:text-fg [clip-path:polygon(16%_0,100%_0,84%_100%,0_100%)]"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-6 text-xs text-muted">
          <span className="font-display uppercase tracking-wider">
            Сделано для сообщества Arc Raiders
          </span>
          <span>© 2026 Битва за Респект · Денис Блим</span>
        </div>
      </div>
    </footer>
  );
}
