import { getRules, getTournaments } from "@/lib/queries";
import { LiveManager } from "@/components/admin/live-manager";

export const metadata = { title: "Эфир — Кабинет" };

export default async function AdminLivePage() {
  const [tournaments, { complications, tasks }] = await Promise.all([getTournaments(), getRules()]);
  return <LiveManager tournaments={tournaments} complications={complications} bonusCatalog={tasks} />;
}
