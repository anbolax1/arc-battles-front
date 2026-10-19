import { getMaps, getRules } from "@/lib/queries";
import { RulesList } from "@/components/domain/rules-list";
import { SectionHead } from "@/components/ui/section-head";
import { Panel } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { getDesign } from "@/lib/design";
import { SurfaceRules } from "@/components/surface/pages/rules";

export const metadata = {
  title: "Правила — GOARC.PRO",
  description: "Формат матчей, пики-баны карт, задания, протоколы, легендарные задания и MMR.",
};

export default async function RulesPage() {
  if ((await getDesign()) === "surface") return <SurfaceRules />;
  const [{ tasks, legendary }, maps] = await Promise.all([getRules(), getMaps()]);

  return (
    <div className="mx-auto max-w-[1240px] space-y-10 px-6 py-12 sm:py-16">
      <SectionHead eyebrow="Как всё устроено" title="Правила и очки" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-6">
          <h3 className="mb-3 font-display text-lg uppercase">Формат матча</h3>
          <p className="text-sm text-muted">
            Матч — два раунда, один раунд — один рейд. В первом раунде бесплатный набор,
            во втором — свой. Карты выбирают пиками-банами: бан A → бан B → бан A
            → бан B → пик B (1-й раунд) → пик A (2-й раунд). A — игрок с меньшим MMR,
            при равном — сыгравший меньше матчей в прошлых сезонах, у двух новичков — жребий.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip dot>1×1 / 2×2</Chip>
            <Chip cyan dot>
              2 раунда
            </Chip>
            <Chip dot>~60 минут</Chip>
          </div>
        </Panel>
        <Panel className="p-6">
          <h3 className="mb-3 font-display text-lg uppercase">Как считаются очки</h3>
          <p className="text-sm text-muted">
            Перед каждым раундом участник получает два задания (общее и на карту
            раунда) и протокол. Задание — +2 балла, протокол — +1, легендарное
            задание — +10 один раз навсегда; задания соперника не засчитываются.
            Ведущий может начислить и ручные очки, например +3 за нок
            рейдера. Побеждает тот, кто наберёт больше за матч. MMR — Эло внутри
            сезона: в начале сезона у всех стартовый, матч ×2 считается дважды.
          </p>
        </Panel>
      </div>

      <RulesList tasks={tasks} legendary={legendary} maps={maps} />
    </div>
  );
}
