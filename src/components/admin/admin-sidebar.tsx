"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Обзор", exact: true },
  { href: "/admin/schedule", label: "Расписание" },
  { href: "/admin/live", label: "Эфир" },
  { href: "/admin/starter-tasks", label: "Стартовые задания" },
  { href: "/admin/tasks", label: "Бонусные задания" },
  { href: "/admin/complications", label: "Усложнения" },
  { href: "/admin/registrations", label: "Заявки" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/highlights", label: "Хайлайты" },
];

const SOON: string[] = [];

export function AdminSidebar() {
  const pathname = usePathname() || "/admin";
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="w-full flex-none lg:w-52">
      <nav className="flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="side-link"
            aria-current={isActive(l.href, l.exact) ? "page" : undefined}
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
