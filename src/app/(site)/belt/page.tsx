import { notFound } from "next/navigation";
import { getDesign } from "@/lib/design";
import { SurfaceBelt } from "@/components/surface/pages/belt";

export const metadata = {
  title: "Пояс лиги — Лига",
  description: "Пояс лиги: правила, нынешний носитель и вся история с первого матча.",
};

/** Пояс лиги есть только в новом дизайне. */
export default async function BeltPage() {
  if ((await getDesign()) !== "surface") notFound();
  return <SurfaceBelt />;
}
