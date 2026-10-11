import Link from "next/link";
import "./profile.css";
import "./team.css";
import { getMaps, getSeasons, getTeam } from "@/lib/queries";
import type { MmrPoint, Season, TeamProfile } from "@/lib/types";
import { initials } from "@/lib/format";
import { Stripes } from "@/components/surface/stripes";
import { ArrowBack } from "@/components/surface/ui";
import { SurfaceMissing } from "@/components/surface/missing";
import { ProfileChart, type ChartSegment } from "@/components/surface/profile-chart";
import { ChartLegend, MapsAndRivals } from "@/components/surface/profile-seasons";
import { fullDate } from "@/components/surface/fmt";

/** Отрезки графика по сезонам: у каждого сезона свой стартовый MMR. */
function segmentsBySeason(timeline: MmrPoint[], seasons: Season[]): ChartSegment[] {
  const groups = new Map<string, MmrPoint[]>();
  for (const p of timeline) groups.set(p.season ?? "", [...(groups.get(p.season ?? "") ?? []), p]);
  return [...groups.entries()].map(([id, points]) => {
    const s = seasons.find((x) => x.id === id);
    return { label: s?.name ?? "Вне сезонов", start: s?.startMmr ?? 1000, points };
  });
}

/** Пропуск команды: оба игрока, название и главные цифры. */
function TeamCard({ team, name, season }: { team: TeamProfile; name: string; season?: Season }) {
  const { members, stats } = team;
  const no = season?.name.match(/\d+/)?.[0] ?? "0";
  const code = members.map((m) => m.login.toUpperCase().replace(/[^A-Z0-9]/g, "<")).join("<<");
  const fields = [
    { k: "Место 2×2", v: stats.place > 0 ? `#${stats.place}` : "вне рейтинга" },
    { k: "MMR 2×2", v: String(stats.currentMmr) },
    { k: "Пик MMR", v: stats.peakMmr ? String(stats.peakMmr) : "—" },
    { k: "Победы", v: stats.games ? `${stats.wins} из ${stats.games} · ${stats.winrate}%` : "нет матчей" },
    { k: "Лучшая серия", v: stats.bestWinStreak ? `${stats.bestWinStreak} подряд` : "—" },
    { k: "Первый матч", v: stats.firstMatch ? fullDate(stats.firstMatch) : "—" },
  ];
  return (
    <article className="sf-idcard pf-card tm-card" aria-label={`Команда ${name}`}>
      <div className="sf-id-head">
        <span>
          Пропуск команды<span className="sf-hide-sm"> · Speranza</span>
        </span>
        <span className="sf-hide-sm">{season?.name ?? "Вне сезона"}</span>
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
  const { stats } = team;
  const segments = segmentsBySeason(team.timeline, seasons);
  const streak =
    stats.currentStreakLen > 0 && stats.currentStreakKind
      ? { v: String(stats.currentStreakLen), s: stats.currentStreakKind === "win" ? "побед подряд" : "поражений подряд" }
      : { v: "—", s: "нет серии" };

  return (
    <>
      <section className="sf-page-head sf-night sf-grain pf-top">
        <Stripes shape="head" draw />
        <div className="sf-wrap">
          <Link className="sf-back" href="/rating">
            <ArrowBack />
            Таблица лидеров
          </Link>
          <p className="sf-eyebrow">Команда 2×2{active ? ` · ${active.name}` : ""}</p>
          <TeamCard team={team} name={name} season={active} />
        </div>
      </section>

      <section className="sf-sec sf-paper sf-grain pf-main">
        <div className="sf-wrap">
          {stats.games > 0 ? (
            <>
              <div className="sf-sec-head pf-head">
                <div>
                  <p className="sf-eyebrow">Рейтинг 2×2 · у команды свой MMR</p>
                  <h2 className="sf-h-mid">
                    рейтинг команды<span className="sf-dot">.</span>
                  </h2>
                </div>
              </div>
              <dl className="sf-stats">
                <div>
                  <dt>MMR сейчас</dt>
                  <dd>{stats.currentMmr}</dd>
                  <dd className="pf-sub">{stats.place > 0 ? `#${stats.place} в таблице 2×2` : "вне рейтинга"}</dd>
                </div>
                <div>
                  <dt>Пик MMR</dt>
                  <dd>{stats.peakMmr}</dd>
                  <dd className="pf-sub">максимум</dd>
                </div>
                <div>
                  <dt>Винрейт</dt>
                  <dd>
                    {stats.winrate}
                    <small>%</small>
                  </dd>
                  <dd className="pf-sub">
                    {stats.wins}–{stats.losses}
                  </dd>
                </div>
                <div>
                  <dt>Матчей</dt>
                  <dd>{stats.games}</dd>
                  <dd className="pf-sub">{stats.firstMatch ? `с ${fullDate(stats.firstMatch)}` : "—"}</dd>
                </div>
                <div>
                  <dt>Серия сейчас</dt>
                  <dd>{streak.v}</dd>
                  <dd className="pf-sub">{streak.s}</dd>
                </div>
              </dl>
              <ChartLegend corrections={segments.some((s) => s.points.some((p) => p.correction))} />
              <ProfileChart segments={segments} />
              <MapsAndRivals mapStats={team.maps} opponents={team.opponents} maps={maps.map((m) => ({ code: m.code, name: m.name }))} />
            </>
          ) : (
            <p className="sf-note">У команды пока нет сыгранных матчей 2×2 — график и разбор по картам появятся после первого.</p>
          )}
        </div>
      </section>
    </>
  );
}
