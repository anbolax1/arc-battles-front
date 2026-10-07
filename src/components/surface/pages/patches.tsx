import Link from "next/link";
import { getPatchCatalog, getSeasons } from "@/lib/queries";
import type { PatchCode, PatchStat } from "@/lib/types";
import { Stripes } from "@/components/surface/stripes";
import { PatchArt } from "@/components/surface/patch-art";
import { HUNTER_TIERS, PATCH_GROUPS, PATCH_INFO, PATCH_RARITIES, ROMAN, patchRarity } from "@/components/surface/patch-meta";
import { pluralKnocks } from "@/lib/format";
import "@/components/surface/patches.css";

const GROUP_ABOUT: Record<string, string> = {
  "Рейтинг": "место, пояс и победы над лидером",
  "Матчи": "серии и характер побед",
  "Ноки и карты": "ноки пульт пишет по рейдам, 3 очка за нок",
  "Сезон": "от первого игрового дня до последнего",
};

/** Пороги редкости в процентах рейдеров сезона - как в patchRarity. */
const RARITY_SPAN = ["до 3%", "до 5%", "до 10%", "до 20%", "больше 20%"];

function raiders(n: number): string {
  const a = n % 100, b = n % 10;
  return a > 10 && a < 20 ? "рейдеров" : b === 1 ? "рейдер" : b >= 2 && b <= 4 ? "рейдера" : "рейдеров";
}

function Card({ stat, players }: { stat: PatchStat; players: number }) {
  const info = PATCH_INFO[stat.code];
  const rarity = patchRarity(stat.holders, players);
  const shown = stat.top.slice(0, 3);
  const more = stat.holders - shown.length;
  const pct = players ? Math.max(stat.holders ? 2 : 0, Math.round((stat.holders * 100) / players)) : 0;
  const best = stat.code === "hunter" ? Math.max(1, ...stat.top.map((h) => h.tier)) : 1;
  return (
    <li className="pt-cat-card">
      <PatchArt code={stat.code} tier={best} />
      <div>
        <div className="pt-cat-title">
          <b>{info.name}</b>
          {info.seasonEnd && <small>в конце сезона</small>}
        </div>
        <p className="pt-cat-about">{info.about}</p>
        {stat.code === "hunter" && (
          <div className="pt-cat-tiers">
            {HUNTER_TIERS.map((need, i) => (
              <span key={need}>
                <PatchArt code="hunter" tier={i + 1} label={`Охотник ${ROMAN[i + 1]}: ${need} ${pluralKnocks(need)}`} />
                {ROMAN[i + 1]} · {need}
                <small>{stat.tiers?.[i] ? `${stat.tiers[i]} ${raiders(stat.tiers[i])}` : "пока никто"}</small>
              </span>
            ))}
          </div>
        )}
        <span className="pt-cat-rar">
          <i style={{ background: rarity.color }} />
          {stat.holders ? `${rarity.label} · у ${stat.holders} из ${players}` : "пока ни у кого"}
        </span>
        <span className="pt-cat-bar" aria-hidden>
          <i style={{ width: `${pct}%` }} />
        </span>
        {stat.holders > 0 && (
          <span className="pt-cat-who">
            {shown.map((h) => (
              <Link key={h.login} className={h.provisional ? "prov" : undefined} href={`/profile/${h.login}`} title={h.provisional ? "претендент: закрепится в конце сезона" : undefined}>
                {h.displayName}
                {stat.code === "hunter" ? ` ${ROMAN[h.tier]}` : ""}
              </Link>
            ))}
            {more > 0 && <span>+{more}</span>}
          </span>
        )}
      </div>
    </li>
  );
}

/** Все нашивки сезона: правила, редкость и кто носит. */
export async function SurfacePatches({ season }: { season?: string }) {
  const [catalog, seasons] = await Promise.all([getPatchCatalog(season), getSeasons()]);
  if (!catalog) {
    return (
      <section className="sf-page-head sf-night sf-grain">
        <div className="sf-wrap">
          <p className="sf-eyebrow">Правила</p>
          <h1 className="sf-h-big">
            нашивки<span className="sf-dot">.</span>
          </h1>
          <p className="sf-lead pt-lead">Не удалось загрузить нашивки. Обнови страницу чуть позже.</p>
        </div>
      </section>
    );
  }
  const byCode = new Map(catalog.patches.map((p) => [p.code, p]));
  const owners = new Map<string, { name: string; n: number }>();
  for (const p of catalog.patches) {
    for (const h of p.top) {
      if (h.provisional) continue;
      const cur = owners.get(h.login) ?? { name: h.displayName, n: 0 };
      cur.n++;
      owners.set(h.login, cur);
    }
  }
  const most = Math.max(0, ...[...owners.values()].map((o) => o.n));
  const leaders = [...owners.values()].filter((o) => o.n === most && most > 0).map((o) => o.name);
  const held = catalog.patches.filter((p) => p.holders > 0);
  const rarest = Math.min(...held.map((p) => p.holders));
  const rarestNames = held.filter((p) => p.holders === rarest).map((p) => PATCH_INFO[p.code].name);
  const list = [...seasons].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const sn = catalog.season;

  return (
    <>
      <section className="sf-page-head sf-night sf-grain">
        <Stripes shape="corner" draw className="corner" />
        <div className="sf-wrap">
          <p className="sf-eyebrow">
            Правила · {sn.name}
            {sn.status === "active" ? " · идёт" : ""}
          </p>
          <h1 className="sf-h-big">
            нашивки<span className="sf-dot">.</span>
          </h1>
          <p className="sf-lead pt-lead">
            Выдаются сами по итогам матчей: за место в таблице, серии, ноки и характер побед. Каждый сезон коллекция собирается заново, прошлые остаются в профиле.
          </p>
          <dl className="pt-facts">
            <div>
              <dt>нашивок в сезоне</dt>
              <dd>{catalog.patches.length}</dd>
            </div>
            <div>
              <dt>рейдеров собрали хотя бы одну</dt>
              <dd>
                {owners.size}
                <small>из {catalog.players}</small>
              </dd>
            </div>
            {held.length > 0 && (
              <div>
                <dt>самые редкие: {rarestNames.join(", ")}</dt>
                <dd>
                  {rarest}
                  <small>{raiders(rarest)}</small>
                </dd>
              </div>
            )}
            {most > 0 && (
              <div>
                <dt>больше всех: {leaders.join(", ")}</dt>
                <dd>{most}</dd>
              </div>
            )}
          </dl>
          {list.length > 1 && (
            <nav className="sf-controls" aria-label="Сезон">
              <span className="sf-seg">
                {list.map((s) => (
                  <Link key={s.id} href={`/patches?season=${s.id}`} aria-current={s.id === sn.id ? "page" : undefined} className="pt-seg-link">
                    {s.name}
                  </Link>
                ))}
              </span>
            </nav>
          )}
        </div>
      </section>

      <section className="sf-sec sf-paper sf-grain">
        <div className="sf-wrap">
          <div className="pt-rarities">
            {PATCH_RARITIES.map((r, i) => (
              <span key={r.key}>
                <i style={{ background: r.color }} />
                {r.label} · {RARITY_SPAN[i]}
              </span>
            ))}
          </div>
          {PATCH_GROUPS.map((g) => (
            <section key={g.name} className="pt-cat-group">
              <div className="pt-cat-head">
                <h2 className="sf-h-up">{g.name}</h2>
                <span>{GROUP_ABOUT[g.name]}</span>
              </div>
              <ul className="pt-cat-list">
                {g.codes.map((code: PatchCode) => {
                  const stat = byCode.get(code) ?? { code, holders: 0, top: [] };
                  return <Card key={code} stat={stat} players={catalog.players} />;
                })}
              </ul>
            </section>
          ))}
          <p className="pt-cat-note">
            Нашивки пересчитываются после каждого матча. «Первый номер», «Без поражений», «Главный охотник» и «Король карты» закрепляются в день закрытия сезона, а до этого у лидеров отмечены как претенденты.
          </p>
        </div>
      </section>
    </>
  );
}
