"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

/* Разделы, открытые модератору: проверка скриншотов в профилях. Остальное - только организатору. */
const MODERATOR_LINKS = [{ href: "/admin/review", label: "Проверка" }];

const LINKS = [
  { href: "/admin/matches", label: "Матчи" },
  { href: "/admin/review", label: "Проверка" },
  { href: "/admin/news", label: "Новости" },
  { href: "/admin/overlay", label: "Оверлей" },
  { href: "/admin/tasks", label: "Задания и протоколы" },
  { href: "/admin/legendary", label: "Легендарки" },
  { href: "/admin/seasons", label: "Сезоны" },
  { href: "/admin/users", label: "Игроки" },
  { href: "/admin/teams", label: "Команды" },
  { href: "/admin/tags", label: "Теги" },
  { href: "/admin/registrations", label: "Заявки" },
  { href: "/admin/highlights", label: "Хайлайты" },
  { href: "/admin/design", label: "Дизайн сайта" },
];

/* Разделы старого пульта (один раунд, протоколы-штрафы) - для правок прошлых матчей. */
const LEGACY = [
  { href: "/admin/schedule", label: "Расписание" },
  { href: "/admin/live", label: "Эфир" },
  { href: "/admin/starter-tasks", label: "Основные задания" },
  { href: "/admin/complications", label: "Протоколы 2 сезона" },
];

const SOON: string[] = [];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Модератор, открывший раздел организатора по прямой ссылке, видит заглушку вместо его страницы. */
export function AdminGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin";
  const { isSuperadmin } = useAuth();
  if (isSuperadmin || MODERATOR_LINKS.some((l) => isActive(pathname, l.href))) return children;
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <h1 className="text-2xl">Доступно только организатору</h1>
      <p className="max-w-md text-muted">Модератору в кабинете открыта проверка скриншотов.</p>
      <Link href="/admin/review" className="btn btn-primary btn-sm">
        <span>К проверке</span>
      </Link>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname() || "/admin";
  const { isSuperadmin } = useAuth();

  if (!isSuperadmin) {
    return (
      <aside className="w-full flex-none lg:w-52">
        <nav className="flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
          {MODERATOR_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="side-link" aria-current={isActive(pathname, l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="w-full flex-none lg:w-52">
      <nav className="flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="side-link"
            aria-current={isActive(pathname, l.href) ? "page" : undefined}
          >
            {l.label}
          </Link>
        ))}
        <div className="hidden px-3 pt-4 text-[0.62rem] uppercase tracking-wide text-muted lg:block">Старый пульт</div>
        {LEGACY.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="side-link opacity-70"
            aria-current={isActive(pathname, l.href) ? "page" : undefined}
          >
            {l.label}
          </Link>
        ))}
        {SOON.length > 0 && (
          <>
            <div className="hidden px-3 pt-3 text-[0.62rem] uppercase tracking-wide text-muted lg:block">
              Скоро
            </div>
            {SOON.map((x) => (
              <span key={x} className="side-link cursor-not-allowed opacity-40" aria-disabled>
                {x}
              </span>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
