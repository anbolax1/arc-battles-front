import { notFound } from "next/navigation";
import { getDesign } from "@/lib/design";
import { SurfaceNews } from "@/components/surface/pages/news";

export const metadata = {
  title: "Новости — GOARC.PRO",
  description: "Новости лиги по ARC Raiders: сезоны, шоу-матчи и анонсы эфиров.",
};

/** Новости есть только в новом дизайне. */
export default async function NewsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if ((await getDesign()) !== "surface") notFound();
  const { page } = await searchParams;
  return <SurfaceNews page={Math.max(1, Math.floor(Number(page)) || 1)} />;
}
