import { getRules } from "@/lib/queries";
import { CatalogManager } from "@/components/admin/catalog-manager";

export const metadata = { title: "Контракты — Кабинет" };

export default async function AdminTasksPage() {
  const { tasks } = await getRules();
  return <CatalogManager kind="task" initial={tasks} />;
}
