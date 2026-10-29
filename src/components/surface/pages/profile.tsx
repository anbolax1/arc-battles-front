import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import "./profile.css";
import { getBelt, getHighlights, getMaps, getMe, getPlayer, getPlayerModeration, getSeasons } from "@/lib/queries";
import type { PlayerPatch, PlayerProfile, Season, StatValue } from "@/lib/types";
import { Stripes } from "@/components/surface/stripes";
import { ArrowBack, TagStamps } from "@/components/surface/ui";
import { SurfaceHighlights } from "@/components/surface/highlights";
import { ProfileSeasons } from "@/components/surface/profile-seasons";
import { ProfileHistory } from "@/components/surface/profile-history";
import { fullDate, shortDate, winrate } from "@/components/surface/fmt";
import { initials } from "@/lib/format";
import { PatchArt } from "@/components/surface/patch-art";
import { PATCH_ORDER } from "@/components/surface/patch-meta";
import { firstProfileSeason } from "@/components/surface/profile-season";
import { BeltProfile } from "@/components/surface/belt-parts";
import { ProfileModeration } from "@/components/surface/profile-moderation";
import { roleAtLeast } from "@/lib/roles";
import { fmtCount, regionLabel, STAT_LABEL, TOKEN_KINDS, TOKEN_LABEL } from "@/lib/tokens";

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

/** Число из профиля в игре: пока модератор не сверил его со скриншотом - с пометкой. */
function gameStat(s?: StatValue): { v: string; note?: string } {
  if (!s) return { v: "—" };
  return { v: fmtCount(s.value), note: s.confirmed ? undefined : "не подтверждено" };
}

function IdCard({ profile }: { profile: PlayerProfile }) {
  const { user, mmrSolo, mmrDuo, peakDuo, mmr1x1, stats, tokens } = profile;
  const name = user.displayName || user.login;
  // Колонки: общее, 1×1, 2×2, нижний ряд - из профиля в игре. m - порядок на телефоне: там две колонки,
  // и 1×1 с 2×2 встают парами.
  const fields: { k: string; v: string; m: number; note?: string; title?: string }[] = [
    { k: "Место в сезоне", v: mmr1x1.place > 0 ? `#${mmr1x1.place}` : "вне рейтинга", m: 1 },
    { k: "MMR 1×1", v: String(mmrSolo), m: 3 },
    { k: "MMR 2×2", v: String(mmrDuo), m: 4 },
    { k: "Первый матч", v: stats.firstMatch ? fullDate(stats.firstMatch) : "—", m: 2 },
    { k: "Лучший MMR 1×1", v: mmr1x1.peakMmr ? String(mmr1x1.peakMmr) : "—", m: 5 },
    { k: "Лучший MMR 2×2", v: peakDuo ? String(peakDuo) : "—", m: 6 },
    { k: STAT_LABEL.server, v: regionLabel(profile.server), m: 9 },
    { k: "Винрейт 1×1", v: stats.soloPlayed ? `${winrate(stats.soloWins, stats.soloPlayed - stats.soloWins)}%` : "нет матчей", m: 7 },
    { k: "Винрейт 2×2", v: stats.duoPlayed ? `${winrate(stats.duoWins, stats.duoPlayed - stats.duoWins)}%` : "нет матчей", m: 8 },
    { k: STAT_LABEL.hours, ...gameStat(profile.gameHours), m: 10 },
    { k: STAT_LABEL.knocks, ...gameStat(profile.gameKnocks), m: 11 },
    { k: "Сброс рейтинга", v: tokens?.lastReset ? shortDate(tokens.lastReset) : "—", title: fullDate(tokens?.lastReset), m: 12 },
  ];
  return (
    <article className="sf-idcard pf-card" aria-label={`Профиль игрока ${name}`}>
      <div className="sf-id-head">
        <span>
          Профиль игрока<span className="sf-hide-sm"> · GOARC.PRO</span>
        </span>
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
            {user.embarkId && (
              <p className="pf-embarkid" title="Embark ID">
                <span className="sr-only">Embark ID: </span>
                {user.embarkId}
              </p>
            )}
          </div>
          <TagStamps tags={user.tags} className="pf-stamps" />
        </div>
        <dl className="sf-id-fields pf-fields">
          {fields.map((f) => (
            <div key={f.k} style={{ "--m": f.m } as CSSProperties}>
              <dt>{f.k}</dt>
              <dd title={f.title || undefined}>
                {f.v}
                {f.note && <small className="pf-unconf">{f.note}</small>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}

/** Любимое игрока - блок подписчика под пропуском. */
function FavoritesCard({ profile }: { profile: PlayerProfile }) {
  const f = profile.favorites;
  if (!f) return null;
  const rows = [
    { k: "Карта", v: f.map },
    { k: "Оружие", v: f.weapon },
    { k: "Усилитель", v: f.augment },
    { k: "Щит", v: f.shield },
  ];
  return (
    <section className="pf-sheet pf-fav" aria-label="Любимое">
      <h2 className="pf-sheet-head">Любимое</h2>
      <dl className="sf-id-fields pf-sheet-body">
        <div className="pf-mates">
          <dt>{f.teammates.length > 1 ? "Любимые тиммейты" : "Любимый тиммейт"}</dt>
          <dd>
            {f.teammates.length
              ? f.teammates.map((m, i) => (
                  <span key={m.userId}>
                    {i > 0 && <i aria-hidden> · </i>}
                    <Link href={`/profile/${encodeURIComponent(m.login)}`}>{m.displayName || m.login}</Link>
                  </span>
                ))
              : "—"}
          </dd>
        </div>
        {rows.map((r) => (
          <div key={r.k}>
            <dt>{r.k}</dt>
            <dd>{r.v || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Баланс жетонов: сколько каждого и что из них действует сейчас. */
function WalletCard({ profile, solo }: { profile: PlayerProfile; solo: boolean }) {
  const t = profile.tokens;
  const count = { double: t?.double ?? 0, priority: t?.priority ?? 0, reset: t?.reset ?? 0 };
  const state = {
    double: "",
    priority: t?.priorityUntil ? "сегодня без очереди" : "",
    reset: t?.resetUsed ? "в этом сезоне использован" : "",
  };
  return (
    <section className={`pf-sheet pf-wallet ${solo ? "solo" : ""}`} aria-label="Баланс жетонов">
      <h2 className="pf-sheet-head">Баланс жетонов</h2>
      <dl className="sf-id-fields pf-sheet-body">
        {TOKEN_KINDS.map((k) => (
          <div key={k}>
            <dt>{TOKEN_LABEL[k]}</dt>
            <dd>
              <b>{count[k]}</b>
              {state[k] && <small className="pf-token-on">{state[k]}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Три самые редкие нашивки сезона, который профиль открывает первым: цифра в шапке совпадает с блоком нашивок. */
function rarestPatches(profile: PlayerProfile, season?: Season): { items: PlayerPatch[]; count: number } {
  const own = (season ? (profile.patches1x1?.[season.id]?.items ?? []) : []).filter((p) => !p.provisional);
  const items = [...own].sort((a, b) => a.holders - b.holders || PATCH_ORDER.indexOf(a.code) - PATCH_ORDER.indexOf(b.code));
  return { items: items.slice(0, 3), count: own.length };
}

/** Профиль игрока в новом дизайне: пропуск рейдера, рейтинг по сезонам, матчи, команды и клипы.
    Свой профиль добавляет под пропуск настройки, а после матчей - заявки. */
export async function ProfileView({
  profile,
  eyebrow,
  back = false,
  settings,
  moderation,
  extra,
}: {
  profile: PlayerProfile;
  eyebrow?: string;
  back?: boolean;
  settings?: ReactNode;
  moderation?: ReactNode;
  extra?: ReactNode;
}) {
  const { user, timeline1x1, history, teams } = profile;
  const [{ items: highlights }, seasons, maps, belt] = await Promise.all([getHighlights({ userId: user.id, limit: 4 }), getSeasons(), getMaps(), getBelt()]);
  const active = seasons.find((s) => s.status === "active");
  const played = timeline1x1.some((p) => !p.correction && !p.reset);
  const name = user.displayName || user.login;
  const shown = firstProfileSeason(timeline1x1, seasons);
  const sewn = rarestPatches(profile, shown);

  return (
    <>
      <section className="sf-page-head sf-night sf-grain pf-top pf-tall">
        <Stripes shape="head" draw />
        <div className="sf-wrap">
          {back && (
            <Link className="sf-back" href="/rating">
              <ArrowBack />
              Таблица лидеров
            </Link>
          )}
          {eyebrow && (
            <p className="sf-eyebrow">
              {eyebrow}
              {active ? ` · ${active.name}` : ""}
            </p>
          )}
          <div className={`pt-idwrap ${sewn.items.length ? "sewn" : ""}`}>
            <IdCard profile={profile} />
            {sewn.items.length > 0 && (
              <a className="pt-sewn" href="#patches" aria-label={`Нашивки ${name}, ${shown?.name}: ${sewn.count} из ${PATCH_ORDER.length}`}>
                <span>
                  {sewn.items.map((p) => (
                    <PatchArt key={p.code} code={p.code} tier={p.tier} night />
                  ))}
                </span>
                <small>
                  {sewn.count} из {PATCH_ORDER.length} нашивок · {shown?.name} ↓
                </small>
              </a>
            )}
          </div>
          <div className={`pf-extra ${profile.favorites ? "" : "solo"}`}>
            <FavoritesCard profile={profile} />
            <WalletCard profile={profile} solo={!profile.favorites} />
          </div>
          {moderation}
          {settings}
        </div>
      </section>

      <section className="sf-sec sf-paper sf-grain pf-main">
        <div className="sf-wrap">
          {played ? (
            <ProfileSeasons profile={profile} seasons={seasons} maps={maps.map((m) => ({ code: m.code, name: m.name }))} />
          ) : (
            <p className="sf-note">В рейтинге 1×1 у {name} пока нет матчей — график и разбор по картам появятся после первого.</p>
          )}

          <BeltProfile belt={belt} userId={user.id} />

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
                        {/* MMR - текущего сезона: у команды, не игравшей в нём, он стартовый и ничего не говорит */}
                        <em title={t.place > 0 ? undefined : "В текущем сезоне не играла"}>{t.place > 0 ? t.mmr : "—"}</em>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="sf-note">Пока нет команд: сыграй матч 2×2, и команда появится здесь.</p>
              )}
            </div>
          </div>
          {extra}
        </div>
      </section>

      <SurfaceHighlights items={highlights} title="лучшие моменты игрока" eyebrow={`Клипы с эфиров · ${name}`} />
    </>
  );
}

export async function SurfaceProfile({ login }: { login: string }) {
  const [profile, me] = await Promise.all([getPlayer(login), getMe()]);
  if (!profile) return <NotFound login={login} />;
  // Модератор ведёт жетоны и скриншоты игрока прямо на его странице; свои - нет, их ведёт организатор.
  const self = me?.id === profile.user.id && !roleAtLeast(me?.role, "superadmin");
  const mod = roleAtLeast(me?.role, "moderator") && !self ? await getPlayerModeration(profile.user.id) : null;
  const moderation = mod && <ProfileModeration userId={profile.user.id} name={profile.user.displayName || profile.user.login} wallet={profile.tokens} initial={mod} />;
  return <ProfileView profile={profile} back moderation={moderation} />;
}
