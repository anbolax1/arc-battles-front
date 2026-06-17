import { getRules } from "@/lib/queries";
import { RulesList } from "@/components/domain/rules-list";
import { SectionHead } from "@/components/ui/section-head";
import { Panel } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

export const metadata = {
  title: "Правила — Битва за Респект",
  description: "Формат турниров, бонусные задания, усложнения и начисление очков.",
};

export default async function RulesPage() {
  const { tasks, complications } = await getRules();

  return (
    <div className="mx-auto max-w-[1240px] space-y-10 px-6 py-12 sm:py-16">
      <SectionHead eyebrow="Как всё устроено" title="Правила и очки" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-6">
          <h3 className="mb-3 font-display text-lg uppercase">Формат турнира</h3>
          <p className="text-sm text-muted">
            3 раунда на разных картах. Режимы 1×1 (двое игроков) и 2×2 (две
            команды). Один матч в день: стороны бронируют дату, организатор
            подтверждает.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip dot>1×1 / 2×2</Chip>
            <Chip cyan dot>
              3 раунда
            </Chip>
            <Chip dot>~90 минут</Chip>
          </div>
        </Panel>
        <Panel className="p-6">
          <h3 className="mb-3 font-display text-lg uppercase">Как считаются очки</h3>
          <p className="text-sm text-muted">
            За выполнение бонусных заданий начисляются баллы (фиксированные или
            процент от очков), за усложнения раунда — штраф. Сумма очков за
            завершённые турниры формирует сезонный рейтинг.
          </p>
        </Panel>
      </div>

      <RulesList tasks={tasks} complications={complications} />
    </div>
  );
}
