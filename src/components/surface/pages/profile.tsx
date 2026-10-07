import Link from "next/link";
import "./profile.css";
import { getHighlights, getMaps, getPlayer, getSeasons } from "@/lib/queries";
import type { PlayerPatch, PlayerProfile, Season } from "@/lib/types";
import { Stripes } from "@/components/surface/stripes";
import { ArrowBack, TagStamps } from "@/components/surface/ui";
import { SurfaceHighlights } from "@/components/surface/highlights";
import { ProfileSeasons } from "@/components/surface/profile-seasons";
import { ProfileHistory } from "@/components/surface/profile-history";
import { fullDate, winrate } from "@/components/surface/fmt";
import { initials } from "@/lib/format";
import { PatchArt } from "@/components/surface/patch-art";
import { PATCH_ORDER } from "@/components/surface/patch-meta";

function NotFound({ login }: { login: string }) {
  return (
    <section className="sf-page-head sf-night sf-grain">
      <Stripes shape="corner" className="corner" draw />
      <div className="sf-wrap">
        <p className="sf-eyebrow">Профиль игрока</p>
        <h1 className="sf-h-big">
          игрок не найден<span className="sf-dot">.</span>
        </h1>
        <p className="sf-lead pf-lead">
          Логина «{login}» на сайте нет. Возможно, в адресе опечатка или игрок ещё не играл матчей.
        </p>
        <div className="sf-controls">
          <Link className="sf-btn sf-btn-amber" href="/rating">
            К таблице лидеров
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Машиночитаемая строка внизу пропуска - как на документах. */
function codeLine(login: string, season: Season | undefined, mmr: number, place: number): [string, string] {
  const no = season?.name.match(/\d+/)?.[0] ?? "0";
  const name = login.toUpperCase().replace(/[^A-Z0-9]/g, "<");
  return [`RSP<<${name}${"<".repeat(Math.max(4, 14 - name.length))}`, `S${no}<${String(mmr).padStart(4, "0")}<${String(place).padStart(2, "0")}`];
}

function IdCard({ profile, season }: { profile: PlayerProfile; season?: Season }) {
  const { user, mmrSolo, mmrDuo, mmr1x1, stats } = profile;
  const name = user.displayName || user.login;
  const [code1, code2] = codeLine(user.login, season, mmrSolo, mmr1x1.place);
  const fields = [
    { k: "Место в сезоне", v: mmr1x1.place > 0 ? `#${mmr1x1.place}` : "вне рейтинга" },
    { k: "MMR 1×1", v: String(mmrSolo) },
    { k: "MMR 2×2", v: String(mmrDuo) },
    { k: "Пик MMR", v: mmr1x1.peakMmr ? String(mmr1x1.peakMmr) : "—" },
    { k: "В рейтинге с", v: mmr1x1.firstMatch ? fullDate(mmr1x1.firstMatch) : "—" },
    { k: "Embark ID", v: user.embarkId || "не указан" },
    { k: "Любимая карта", v: stats.favoriteMap || "—" },
    { k: "Победы 1×1", v: stats.soloPlayed ? `${stats.soloWins} из ${stats.soloPlayed} · ${winrate(stats.soloWins, stats.soloPlayed - stats.soloWins)}%` : "нет матчей" },
    { k: "Победы 2×2", v: stats.duoPlayed ? `${stats.duoWins} из ${stats.duoPlayed} · ${winrate(stats.duoWins, stats.duoPlayed - stats.duoWins)}%` : "нет матчей" },
  ];
  return (
    <article className="sf-idcard pf-card" aria-label={`Профиль игрока ${name}`}>
      <div className="sf-id-head">
        <span>
          Пропуск рейдера<span className="sf-hide-sm"> · Speranza</span>
        </span>
        <span className="sf-hide-sm">{season?.name ?? "Вне сезона"}</span>
        <Stripes shape="badge" />
      </div>
      <div className={`sf-id-photo ${user.avatarUrl ? "has-img" : ""}`} aria-hidden>
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- аватар со стороннего CDN
          <img src={user.avatarUrl} alt="" />
        ) : (
          <b>{initials(name)}</b>
        )}
      </div>
      <div className="sf-id-body">
        <div className="pf-namerow">
          <div className="pf-name">
            <h1 className="sf-id-name">{name}</h1>
            <p className="pf-login">@{user.login}</p>
          </div>
          <TagStamps tags={user.tags} className="pf-stamps" />
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
        <span>{code1}</span>
        <span>{code2}</span>
      </div>
    </article>
  );
}

/** Три самые редкие нашивки текущего сезона, а пока в нём нет ни одной - последнего сезона с нашивками. */
function rarestPatches(profile: PlayerProfile, seasons: Season[], active?: Season): { items: PlayerPatch[]; count: number } {
  const order = [active, ...[...seasons].sort((a, b) => b.startedAt.localeCompare(a.startedAt))].filter((s): s is Season => !!s);
  for (const s of order) {
    const own = (profile.patches1x1?.[s.id]?.items ?? []).filter((p) => !p.provisional);
    if (own.length) {
      const items = [...own].sort((a, b) => a.holders - b.holders || PATCH_ORDER.indexOf(a.code) - PATCH_ORDER.indexOf(b.code));
      return { items: items.slice(0, 3), count: own.length };
    }
  }
  return { items: [], count: 0 };
}

/** Профиль игрока в новом дизайне: пропуск рейдера, рейтинг по сезонам, матчи, команды и клипы. */
export async function SurfaceProfile({ login }: { login: string }) {
  const profile = await getPlayer(login);
  if (!profile) return <NotFound login={login} />;

  const { user, timeline1x1, history, teams } = profile;
  const [{ items: highlights }, seasons, maps] = await Promise.all([getHighlights({ userId: user.id, limit: 4 }), getSeasons(), getMaps()]);
  const active = seasons.find((s) => s.status === "active");
  const played = timeline1x1.some((p) => !p.correction);
  const name = user.displayName || user.login;
  const sewn = rarestPatches(profile, seasons, active);

  return (
    <>
      <section className="sf-page-head sf-night sf-grain pf-top">
        <Stripes shape="head" draw />
        <div className="sf-wrap">
          <Link className="sf-back" href="/rating">
            <ArrowBack />
            Таблица лидеров
          </Link>
          <p className="sf-eyebrow">Профиль игрока{active ? ` · ${active.name}` : ""}</p>
          <div className={`pt-idwrap ${sewn.items.length ? "sewn" : ""}`}>
            <IdCard profile={profile} season={active} />
            {sewn.items.length > 0 && (
              <a className="pt-sewn" href="#patches" aria-label={`Нашивки ${name}: ${sewn.count} из ${PATCH_ORDER.length}`}>
                <span>
                  {sewn.items.map((p) => (
                    <PatchArt key={p.code} code={p.code} tier={p.tier} night />
                  ))}
                </span>
                <small>
                  {sewn.count} из {PATCH_ORDER.length} нашивок ↓
                </small>
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="sf-sec sf-paper sf-grain pf-main">
        <div className="sf-wrap">
          {played ? (
            <ProfileSeasons profile={profile} seasons={seasons} maps={maps.map((m) => ({ code: m.code, name: m.name }))} />
          ) : (
            <p className="sf-note">В рейтинге 1×1 у {name} пока нет матчей — график и разбор по картам появятся после первого.</p>
          )}

          <div className="sf-prof-cols sf-block">
            <div>
              <h2 className="sf-h-mid">
                последние матчи<span className="sf-dot">.</span>
              </h2>
              <ProfileHistory items={history} />
            </div>
            <div>
              <h2 className="sf-h-mid">
                команды 2×2<span className="sf-dot">.</span>
              </h2>
              {teams.length ? (
                <div className="sf-teams pf-teams">
                  {teams.map((t) => {
                    const members = t.members.map((m) => m.displayName || m.login).join(" & ");
                    return (
                      <Link key={t.teamKey} className="sf-team" href={`/teams/${encodeURIComponent(t.teamKey)}`}>
                        <b>{t.name || members}</b>
                        <small>
                          {t.name ? `${members} · ` : ""}
                          {t.place > 0 ? `#${t.place} · ` : ""}
                          {t.wins}–{t.losses}
                        </small>
                        <em>{t.mmr}</em>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="sf-note">Пока нет команд: сыграй матч 2×2, и команда появится здесь.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <SurfaceHighlights items={highlights} title="хайлайты игрока" eyebrow={`Клипы с эфиров · ${name}`} />
    </>
  );
}
