import { getTournaments, getUsers } from "@/lib/queries";
import { ScheduleManager } from "@/components/admin/schedule-manager";

export const metadata = { title: "Расписание — Кабинет" };

export default async function AdminSchedulePage() {
  const [tournaments, users] = await Promise.all([getTournaments(), getUsers()]);
  return <ScheduleManager tournaments={tournaments} users={users} />;
}
