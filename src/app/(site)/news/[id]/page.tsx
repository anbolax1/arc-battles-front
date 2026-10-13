import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDesign } from "@/lib/design";
import { getNewsItem } from "@/lib/queries";
import { SurfaceNewsItem } from "@/components/surface/pages/news";
import { newsExcerpt } from "@/components/surface/news-body";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const n = await getNewsItem(id);
  if (!n) return { title: "Новость не найдена — Битва за Респект" };
  return { title: `${n.title} — Битва за Респект`, description: newsExcerpt(n.body, 160) || undefined };
}

/** Страница новости есть только в новом дизайне. */
export default async function NewsItemPage({ params }: Props) {
  if ((await getDesign()) !== "surface") notFound();
  const { id } = await params;
  const n = await getNewsItem(id);
  if (!n) notFound();
  return <SurfaceNewsItem n={n} />;
}
