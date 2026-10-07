import { notFound } from "next/navigation";
import { getDesign } from "@/lib/design";
import { SurfacePatches } from "@/components/surface/pages/patches";

export const metadata = {
  title: "Нашивки — Битва за Респект",
  description: "Нашивки сезона: за что даются, насколько редкие и кто их носит.",
};

/** Нашивки есть только в новом дизайне. */
export default async function PatchesPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  if ((await getDesign()) !== "surface") notFound();
  const { season } = await searchParams;
  return <SurfacePatches season={season} />;
}
