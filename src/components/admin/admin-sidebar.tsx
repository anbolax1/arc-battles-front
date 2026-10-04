"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/matches", label: "Матчи" },
  { href: "/admin/overlay", label: "Оверлей" },
  { href: "/admin/tasks", label: "Задания и протоколы" },
  { href: "/admin/legendary", label: "Легендарки" },
  { href: "/admin/seasons", label: "Сезоны" },
  { href: "/admin/users", label: "Игроки" },
  { href: "/admin/registrations", label: "Заявки" },
  { href: "/admin/highlights", label: "Хайлайты" },
];

/* Разделы старого пульта (один раунд, протоколы-штрафы) - для правок прошлых матчей. */
const LEGACY = [
  { href: "/admin/schedule", label: "Расписание" },
  { href: "/admin/live", label: "Эфир" },
  { href: "/admin/starter-tasks", label: "Основные задания" },
  { href: "/admin/complications", label: "Протоколы 2 сезона" },
];

const SOON: string[] = [];

export function AdminSidebar() {
  const pathname = usePathname() || "/admin";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="w-full flex-none lg:w-52">
      <nav className="flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="side-link"
            aria-current={isActive(l.href) ? "page" : undefined}
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
            aria-current={isActive(l.href) ? "page" : undefined}
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
