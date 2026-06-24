import { getLegendary, getTournaments } from "@/lib/queries";
import { LegendaryManager } from "@/components/admin/legendary-manager";

export const metadata = { title: "Легендарные контракты — Кабинет" };

export default async function AdminLegendaryPage() {
  const [legendary, tournaments] = await Promise.all([getLegendary(), getTournaments()]);
  return <LegendaryManager initial={legendary} tournaments={tournaments} />;
}
