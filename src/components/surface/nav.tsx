"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LogoutIcon } from "@/components/icons";
import { Mark } from "@/components/surface/stripes";
import { SfAvatar } from "@/components/surface/ui";
import { ShortCountdown } from "@/components/surface/motion";

const LINKS = [
  { href: "/schedule", label: "Расписание" },
  { href: "/rating", label: "Рейтинг" },
  { href: "/archive", label: "Архив" },
  { href: "/highlights", label: "Хайлайты" },
  { href: "/rules", label: "Правила" },
];

/** Что показать в шапке рядом с кнопкой: идущий матч или отсчёт до шоу-матча. */
export interface NavLive {
  href: string;
  live: boolean;
  startsAt?: string | null;
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SurfaceNav({ live }: { live: NavLive | null }) {
  const { user, isSuperadmin, refresh } = useAuth();
  const pathname = usePathname() || "/";
  const router = useRouter();
  // Меню открыто только на той странице, где его открыли: переход закрывает его сам.
  const [openAt, setOpenAt] = React.useState<string | null>(null);
  const open = openAt === pathname;
  const progress = React.useRef<HTMLDivElement>(null);
  const links = isSuperadmin ? [...LINKS, { href: "/admin", label: "Кабинет" }] : LINKS;

  React.useEffect(() => {
    let tick = false;
    const onScroll = () => {
      if (tick) return;
      tick = true;
      requestAnimationFrame(() => {
        tick = false;
        const h = document.documentElement.scrollHeight - innerHeight;
        progress.current?.style.setProperty("--p", h > 0 ? (scrollY / h).toFixed(4) : "0");
      });
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, [pathname]);

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      /* всё равно обновим состояние */
    }
    await refresh();
    router.refresh();
  }

  const chip = live && (
    <Link href={live.href} className="sf-live-chip">
      <i />
      {live.live ? <span>эфир идёт</span> : live.startsAt ? <ShortCountdown to={live.startsAt} prefix="шоу-матч через " /> : <span>шоу-матч скоро</span>}
    </Link>
  );

  const account = user ? (
    <>
      <Link href="/profile" className="sf-user">
        <SfAvatar name={user.displayName || user.login} src={user.avatarUrl} />
        <span>{user.displayName || user.login}</span>
      </Link>
      <button type="button" className="sf-icon-btn" onClick={logout} aria-label="Выйти" title="Выйти">
        <LogoutIcon />
      </button>
    </>
  ) : (
    <>
      <Link href="/login" className="sf-btn sf-btn-ink-line sf-btn-sm">
        Войти
      </Link>
      <Link href="/join" className="sf-btn sf-btn-amber sf-btn-sm">
        Записаться
      </Link>
    </>
  );

  return (
    <header className="sf-nav">
      <div className="sf-wrap sf-nav-in">
        <Link href="/" className="sf-brand" aria-label="Битва за Респект, на главную">
          <Mark />
          <b>Битва за Респект</b>
        </Link>
        <nav className="sf-links" aria-label="Разделы">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(pathname, l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="sf-nav-cta">
          {chip}
          {account}
        </div>
        <button
          type="button"
          className="sf-burger"
          aria-expanded={open}
          aria-controls="sf-drawer"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setOpenAt(open ? null : pathname)}
        >
          <span />
        </button>
      </div>
      {open && (
        <div className="sf-drawer" id="sf-drawer">
          <Link href="/">Главная</Link>
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
          <div className="sf-drawer-actions">{account}</div>
        </div>
      )}
      <div className="sf-progress" ref={progress} aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </div>
    </header>
  );
}
