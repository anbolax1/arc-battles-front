import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDesign } from "@/lib/design";
import { getNewsItem } from "@/lib/queries";
import { SurfaceNewsItem } from "@/components/surface/pages/news";
import { newsExcerpt } from "@/components/surface/news-text";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const n = await getNewsItem(id);
  if (!n) return { title: "Новость не найдена — GOARC.PRO" };
  return { title: `${n.title} — GOARC.PRO`, description: newsExcerpt(n.body, 160) || undefined };
}

/** Страница новости есть только в новом дизайне. */
export default async function NewsItemPage({ params }: Props) {
  if ((await getDesign()) !== "surface") notFound();
  const { id } = await params;
  const n = await getNewsItem(id);
  if (!n) notFound();
  return <SurfaceNewsItem n={n} />;
}
