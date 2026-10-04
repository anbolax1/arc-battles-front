import { getMaps, getRules } from "@/lib/queries";
import { TasksCatalog } from "@/components/admin/tasks-catalog";

export const metadata = { title: "Задания и протоколы — Кабинет" };

export default async function AdminTasksPage() {
  const [{ tasks }, maps] = await Promise.all([getRules(), getMaps()]);
  return <TasksCatalog initial={tasks} maps={maps} />;
}
