import { getStarterTasks } from "@/lib/queries";
import { StarterTasksManager } from "@/components/admin/starter-tasks-manager";

export const metadata = { title: "Стартовые задания — Кабинет" };

export default async function AdminStarterTasksPage() {
  const tasks = await getStarterTasks();
  return <StarterTasksManager initial={tasks} />;
}
