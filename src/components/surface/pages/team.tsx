import Link from "next/link";
import "./profile.css";
import "./team.css";
import { getMaps, getSeasons, getTeam, getTeamLeaderboard } from "@/lib/queries";
import type { MmrStats, Season, TeamProfile } from "@/lib/types";
import { initials } from "@/lib/format";
import { seasonStats } from "@/lib/mmr-stats";
import { Stripes } from "@/components/surface/stripes";
import { ArrowBack } from "@/components/surface/ui";
import { SurfaceMissing } from "@/components/surface/missing";
import { TeamSeasons } from "@/components/surface/team-seasons";
import { fullDate } from "@/components/surface/fmt";

/** Пропуск команды: оба игрока, название и цифры сезона, в котором команда играла последним. */
function TeamCard({ team, name, season, stats, final }: { team: TeamProfile; name: string; season?: Season; stats: MmrStats; final: boolean }) {
  const { members } = team;
  const no = season?.name.match(/\d+/)?.[0] ?? "0";
  const code = members.map((m) => m.login.toUpperCase().replace(/[^A-Z0-9]/g, "<")).join("<<");
  const fields = [
    { k: "Место 2×2", v: stats.place > 0 ? `#${stats.place}` : "вне рейтинга" },
    { k: final ? "MMR в конце" : "MMR 2×2", v: String(stats.currentMmr) },
    { k: "Пик MMR", v: stats.peakMmr ? String(stats.peakMmr) : "—" },
    { k: "Победы", v: stats.wins + stats.losses ? `${stats.wins} из ${stats.wins + stats.losses} · ${stats.winrate}%` : "нет матчей" },
    { k: "Лучшая серия", v: stats.bestWinStreak ? `${stats.bestWinStreak} подряд` : "—" },
    { k: "Первый матч", v: team.stats.firstMatch ? fullDate(team.stats.firstMatch) : "—" },
  ];
  return (
    <article className="sf-idcard pf-card tm-card" aria-label={`Команда ${name}`}>
      <div className="sf-id-head">
        <span>
          Пропуск команды<span className="sf-hide-sm"> · Speranza</span>
        </span>
        <span className="sf-hide-sm">{season ? `${season.name}${final ? " · итог" : ""}` : "Вне сезона"}</span>
        <Stripes shape="badge" />
      </div>
      <div className="tm-photos">
        {members.map((m) => (
          <Link key={m.userId || m.login} href={`/profile/${m.login}`} className={`sf-id-photo ${m.avatarUrl ? "has-img" : ""}`} aria-label={`Профиль ${m.displayName || m.login}`}>
            {m.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- аватар со стороннего CDN
              <img src={m.avatarUrl} alt="" />
            ) : (
              <b>{initials(m.displayName || m.login)}</b>
            )}
          </Link>
        ))}
      </div>
      <div className="sf-id-body">
        <div>
          <h1 className="sf-id-name tm-name">{name}</h1>
          <p className="tm-roster">
            {members.map((m, i) => (
              <span key={m.userId || m.login}>
                {i > 0 && " & "}
                <Link href={`/profile/${m.login}`}>{m.displayName || m.login}</Link>
              </span>
            ))}
          </p>
        </div>
        <dl className="sf-id-fields">
          {fields.map((f) => (
            <div key={f.k}>
              <dt>{f.k}</dt>
              <dd>{f.v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="sf-id-code" aria-hidden>
        <span>{`RSP<<${code}`}</span>
        <span>{`S${no}<${String(stats.currentMmr).padStart(4, "0")}<${String(stats.place).padStart(2, "0")}`}</span>
      </div>
    </article>
  );
}

/** Команда 2×2 в новом дизайне: пропуск состава, рейтинг по сезонам, карты и соперники. */
export async function SurfaceTeam({ teamKey }: { teamKey: string }) {
  const team = await getTeam(teamKey);
  if (!team) {
    return (
      <SurfaceMissing eyebrow="Команда 2×2" title="команда не найдена" lead="Возможно, эта пара ещё не сыграла ни одного матча 2×2.">
        <Link className="sf-btn sf-btn-amber" href="/rating">
          К таблице лидеров
        </Link>
      </SurfaceMissing>
    );
  }

  const [seasons, maps] = await Promise.all([getSeasons(), getMaps()]);
  const active = seasons.find((s) => s.status === "active");
  const roster = team.members.map((m) => m.displayName || m.login).join(" & ");
  const name = team.name || roster;

  // На пропуске - текущий сезон, а если команда в нём не играла - последний сезон с её матчами и его итог.
  const played = new Set(team.timeline.map((p) => p.season ?? ""));
  const playsNow = !!active && played.has(active.id);
  const season = playsNow ? active : seasons.filter((s) => played.has(s.id)).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  let stats: MmrStats = team.stats;
  if (season) {
    const own = seasonStats(
      team.timeline.filter((p) => p.season === season.id),
      season.startMmr,
    );
    if (playsNow) {
      stats = { ...own, currentMmr: team.stats.currentMmr, place: team.stats.place };
    } else {
      const rows = await getTeamLeaderboard(season.id);
      stats = { ...own, place: rows.findIndex((r) => r.teamKey === team.teamKey) + 1 };
    }
  }

  return (
    <>
      <section className="sf-page-head sf-night sf-grain pf-top">
        <Stripes shape="head" draw />
        <div className="sf-wrap">
          <Link className="sf-back" href="/rating">
            <ArrowBack />
            Таблица лидеров
          </Link>
          <p className="sf-eyebrow">Команда 2×2</p>
          <TeamCard team={team} name={name} season={season} stats={stats} final={!playsNow && !!season} />
          {active && !playsNow && team.timeline.length > 0 && (
            <p className="tm-note">
              В текущем сезоне команда пока не играла{season ? ` — на пропуске итог «${season.name}»` : ""}.
            </p>
          )}
        </div>
      </section>

      <section className="sf-sec sf-paper sf-grain pf-main">
        <div className="sf-wrap">
          {team.timeline.length > 0 ? (
            <TeamSeasons team={team} seasons={seasons} maps={maps.map((m) => ({ code: m.code, name: m.name }))} />
          ) : (
            <p className="sf-note">У команды пока нет сыгранных матчей 2×2 — график и разбор по картам появятся после первого.</p>
          )}
        </div>
      </section>
    </>
  );
}
