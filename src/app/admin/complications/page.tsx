import { getRules } from "@/lib/queries";
import { CatalogManager } from "@/components/admin/catalog-manager";

export const metadata = { title: "Протоколы — Кабинет" };

export default async function AdminComplicationsPage() {
  const { complications } = await getRules();
  return <CatalogManager kind="complication" initial={complications} />;
}
