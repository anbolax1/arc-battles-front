import Link from "next/link";
import { getHighlights, getPlayer } from "@/lib/queries";
import { HighlightsGrid } from "@/components/domain/highlights-grid";
import { PlayerStatsBlock } from "@/components/domain/player-stats";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead } from "@/components/ui/section-head";
import { roleBadge } from "@/lib/display";
import { fmtDate } from "@/lib/format";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ login: string }>;
}) {
  const { login } = await params;
  const profile = await getPlayer(login);

  if (!profile) {
    return (
      <div className="mx-auto max-w-[1240px] space-y-4 px-6 py-24 text-center">
        <h1 className="text-3xl">Игрок не найден</h1>
        <p className="text-muted">Возможно, такого логина нет или он ещё не заходил на сайт.</p>
        <div className="pt-2">
          <Link href="/rating" className="btn btn-primary">
            <span>К рейтингу</span>
          </Link>
        </div>
      </div>
    );
  }

  const { user, mmrSolo, mmrDuo, wins, tournaments, stats, history } = profile;
  const role = roleBadge(user.role);
  const { items: highlights } = await getHighlights({ userId: user.id, limit: 6 });
  const summary = [
    { label: "MMR 1×1", value: mmrSolo },
    { label: "MMR 2×2", value: mmrDuo },
    { label: "Побед", value: wins },
    { label: "Турниров", value: tournaments },
  ];

  return (
    <div className="mx-auto max-w-[1240px] space-y-8 px-6 py-12 sm:py-16">
      <SectionHead eyebrow="Карточка игрока" title={user.displayName || user.login} />

      {/* Идентичность */}
      <Panel glow className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <Avatar name={user.displayName || user.login} src={user.avatarUrl} size="lg" />
        <div className="space-y-2">
          <h2 className="text-2xl">{user.displayName || user.login}</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>@{user.login}</span>
            {user.embarkId && <span className="tnum">Embark ID: {user.embarkId}</span>}
            <Badge kind={role.kind}>{role.label}</Badge>
          </div>
        </div>
      </Panel>

      {/* Статистика */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <Panel key={s.label} className="p-5">
            <div className="font-display text-3xl tnum text-primary-2">{s.value}</div>
            <div className="text-sm text-muted">{s.label}</div>
          </Panel>
        ))}
      </div>

      {/* Расширенная статистика — когда есть хотя бы один завершённый турнир */}
      {tournaments > 0 && <PlayerStatsBlock stats={stats} />}

      {/* История */}
      <section className="space-y-4">
        <h3 className="text-xl">Последние битвы</h3>
        {history.length ? (
          <div className="space-y-3">
            {history.map((h) => (
              <Link
                key={h.tournamentId}
                href={`/tournament/${h.tournamentId}`}
                className={`panel flex items-center justify-between gap-4 p-4 transition hover:-translate-y-0.5 ${h.win ? "glow-edge" : ""}`}
              >
                <div className="min-w-0">
                  <div className="truncate font-display uppercase">{h.title || h.name}</div>
                  <div className="text-sm text-muted">
                    {h.mode}
                    {h.date ? ` · ${fmtDate(h.date)}` : ""} · {h.name}
                  </div>
                </div>
                <div className="flex flex-none items-center gap-3">
                  <span className="font-display tnum text-primary-2">{h.points}</span>
                  {h.status === "finished" ? (
                    h.win ? (
                      <Badge kind="champ">Победа</Badge>
                    ) : (
                      <StatusPill status="done">Завершён</StatusPill>
                    )
                  ) : (
                    <StatusPill status="soon">Идёт</StatusPill>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Пока нет участий" hint="Здесь появятся турниры игрока." />
        )}
      </section>

      {highlights.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl">Хайлайты игрока</h3>
          <HighlightsGrid items={highlights} />
        </section>
      )}
    </div>
  );
}
