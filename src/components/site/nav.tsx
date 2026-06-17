"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { api, apiHref } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { BoltIcon, CloseIcon, LogoutIcon, MenuIcon, TwitchIcon } from "@/components/icons";

const LINKS = [
  { href: "/", label: "Главная" },
  { href: "/schedule", label: "Расписание" },
  { href: "/rating", label: "Рейтинг" },
  { href: "/archive", label: "Архив" },
  { href: "/rules", label: "Правила" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const { user, isOrganizer, refresh } = useAuth();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const links = isOrganizer ? [...LINKS, { href: "/admin", label: "Кабинет" }] : LINKS;

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      /* игнорируем — всё равно обновим состояние */
    }
    await refresh();
    router.refresh();
  }

  const navLinks = (
    <>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="nav-link"
          aria-current={isActive(pathname, l.href) ? "page" : undefined}
        >
          {l.label}
        </Link>
      ))}
    </>
  );

  const cta = user ? (
    <>
      <Link href="/profile" className="flex items-center gap-2 pr-1 transition hover:opacity-80">
        <Avatar name={user.displayName || user.login} src={user.avatarUrl} size="sm" />
        <span className="font-display text-sm uppercase leading-none">{user.displayName || user.login}</span>
      </Link>
      <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
        <LogoutIcon />
        <span>Выйти</span>
      </button>
    </>
  ) : (
    <>
      <Link href="/register" className="btn btn-primary btn-sm">
        <span>Записаться</span>
      </Link>
      <a href={apiHref("/auth/twitch/login")} className="btn btn-twitch btn-sm">
        <TwitchIcon />
        <span>Войти через Twitch</span>
      </a>
    </>
  );

  return (
    <header className="sticky top-0 z-[100] border-b border-[var(--border)] bg-[rgba(9,9,12,0.72)] backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Битва за Респект — на главную">
          <span className="logo-mark">
            <BoltIcon />
          </span>
          <span className="font-display text-lg uppercase leading-none tracking-wide">
            Битва за <span className="text-primary-2">Респект</span>
          </span>
        </Link>

        {/* Десктоп: ссылки + CTA */}
        <nav className="ml-auto hidden items-center gap-6 lg:flex">{navLinks}</nav>
        <div className="hidden items-center gap-3 lg:flex">{cta}</div>

        {/* Мобайл: бургер */}
        <button
          type="button"
          className="ml-auto flex h-10 w-10 items-center justify-center text-fg lg:hidden"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {/* Мобильная выпадашка. Закрываем по клику внутри (включая переходы по ссылкам). */}
      {open && (
        <div className="border-t border-[var(--border)] bg-[rgba(9,9,12,0.96)] backdrop-blur-md lg:hidden">
          <div
            className="mx-auto flex max-w-[1240px] flex-col gap-4 px-6 py-5"
            onClick={() => setOpen(false)}
          >
            <nav className="flex flex-col gap-3">{navLinks}</nav>
            <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">{cta}</div>
          </div>
        </div>
      )}
    </header>
  );
}
