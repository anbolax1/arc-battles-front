import { notFound } from "next/navigation";
import { getLegendary, getMaps, getMatch } from "@/lib/queries";
import { MatchConsole } from "@/components/admin/match/match-console";

export const metadata = { title: "Пульт матча — Кабинет" };

export default async function AdminMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [match, maps, legendary] = await Promise.all([getMatch(id), getMaps(), getLegendary()]);
  if (!match) notFound();
  return <MatchConsole key={id} initial={match} maps={maps} legendary={legendary} />;
}
