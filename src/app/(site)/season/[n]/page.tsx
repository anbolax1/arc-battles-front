import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDesign } from "@/lib/design";
import { getSeasonRecap } from "@/lib/queries";
import { SurfaceSeason } from "@/components/surface/pages/season";

type Props = { params: Promise<{ n: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { n } = await params;
  return {
    title: `Сезон ${n} в цифрах — Битва за Респект`,
    description: `Итоги ${n} сезона по Arc Raiders: таблица, гонка за первое место, решающий матч, карты, задания и ноки.`,
  };
}

/** Итоги сезона есть только в новом дизайне: в прежнем страницы нет. */
export default async function SeasonPage({ params }: Props) {
  const { n } = await params;
  if (!/^\d{1,3}$/.test(n) || (await getDesign()) !== "surface") notFound();
  const recap = await getSeasonRecap(n);
  if (!recap) notFound();
  return <SurfaceSeason recap={recap} no={n} />;
}
