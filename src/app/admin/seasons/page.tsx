import { getSeasons } from "@/lib/queries";
import { SeasonsManager } from "@/components/admin/seasons-manager";

export const metadata = { title: "Сезоны — Кабинет" };

export default async function AdminSeasonsPage() {
  const seasons = await getSeasons();
  return <SeasonsManager initial={seasons} />;
}
