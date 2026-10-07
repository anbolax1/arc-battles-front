import type { MatchPatch, Participant, PatchCode } from "@/lib/types";
import { PatchArt } from "@/components/surface/patch-art";
import { HUNTER_TIERS, PATCH_INFO, ROMAN, patchName, patchResult } from "@/components/surface/patch-meta";
import { pluralKnocks } from "@/lib/format";
import "@/components/surface/patches.css";

/** У этих нашивок подробности - про матч, где она получена: соперник и счёт. У остальных - итоги сезона. */
const ABOUT_MATCH: PatchCode[] = ["regicide", "photo", "shutout", "pacifist", "revenge"];

function reason(p: MatchPatch): string {
  if (ABOUT_MATCH.includes(p.code)) return patchResult({ ...p, earnedAt: "" });
  if (p.code === "hunter") {
    const need = HUNTER_TIERS[p.tier - 1] ?? HUNTER_TIERS[0];
    return `ступень ${ROMAN[p.tier]}: ${need} ${pluralKnocks(need)} за сезон`;
  }
  return PATCH_INFO[p.code].rule;
}

function fresh(n: number): string {
  const a = n % 100, b = n % 10;
  return a > 10 && a < 20 ? "новых" : b === 1 ? "новая" : b >= 2 && b <= 4 ? "новые" : "новых";
}

/** Нашивки, полученные сторонами в этом матче, - со штампом «новая». */
export function MatchPatches({ patches, sides, live }: { patches: MatchPatch[]; sides: [Participant | null, Participant | null]; live: boolean }) {
  return (
    <div className="sf-m-block pt-match">
      <p className="sf-eyebrow">{live ? "Получены прямо в этом матче" : "Получены в этом матче"}</p>
      <h2 className="sf-h-mid">
        нашивки за матч<span className="sf-dot">.</span>
      </h2>
      <div className="pt-match-cols">
        {sides.map((side) => {
          if (!side) return null;
          const own = patches.filter((p) => p.participantId === side.id);
          return (
            <div key={side.id}>
              <h4>
                {side.name} · {own.length} {fresh(own.length)}
              </h4>
              {own.length > 0 ? (
                <ul>
                  {own.map((p) => (
                    <li key={`${p.code}${p.tier}`}>
                      <span className="pt-match-art">
                        <PatchArt code={p.code} tier={p.tier} />
                        <span className="sf-stamp">новая</span>
                      </span>
                      <span>
                        <b>{patchName(p.code, p.tier)}</b>
                        <small>{reason(p)}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pt-match-none">Без новых нашивок.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
