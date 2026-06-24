import Link from "next/link";
import { getRules, getTournaments, getLegendary } from "@/lib/queries";
import { SectionHead } from "@/components/ui/section-head";
import { Panel } from "@/components/ui/card";
import { ArrowRightIcon } from "@/components/icons";

export default async function AdminOverview() {
  const [{ tasks, complications }, tournaments, legendary] = await Promise.all([
    getRules(),
    getTournaments(),
    getLegendary(),
  ]);
  const finished = tournaments.filter((t) => t.status === "finished").length;

  const stats = [
    { label: "Турниров", value: tournaments.length },
    { label: "Контрактов", value: tasks.length },
    { label: "Протоколов", value: complications.length },
  ];
  const cards = [
    { href: "/admin/schedule", title: "Расписание", desc: "Турниры, участники, рейд, результат" },
    { href: "/admin/live", title: "Эфир", desc: "MMR, контракты, протоколы, оверлей" },
    { href: "/admin/registrations", title: "Заявки", desc: "Принять или отклонить заявки участников" },
    { href: "/admin/starter-tasks", title: "Основные задания", desc: "Скрытый пул заданий раунда" },
    { href: "/admin/tasks", title: "Контракты", desc: `Каталог контрактов (${tasks.length})` },
    { href: "/admin/complications", title: "Протоколы", desc: `Каталог протоколов (${complications.length})` },
    { href: "/admin/legendary", title: "Легендарные контракты", desc: `Глобальный пул, 10 баллов (${legendary.length})` },
  ];

  return (
    <div className="space-y-8">
      <SectionHead eyebrow="Организатор" title="Кабинет" />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Panel key={s.label} className="p-5">
            <div className="font-display text-3xl tnum text-primary-2">{s.value}</div>
            <div className="text-sm text-muted">{s.label}</div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="panel group flex flex-col gap-2 p-5 transition hover:-translate-y-1"
          >
            <h3 className="font-display text-lg uppercase">{c.title}</h3>
            <p className="text-sm text-muted">{c.desc}</p>
            <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm text-primary-2">
              Открыть <ArrowRightIcon className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>

      <Panel className="p-5">
        <p className="text-sm text-muted">
          Матчи создаёт организатор в «Расписании»; бронирование дат игроками — позже.
          {finished > 0 ? ` Завершённых турниров: ${finished}.` : ""}
        </p>
      </Panel>
    </div>
  );
}
