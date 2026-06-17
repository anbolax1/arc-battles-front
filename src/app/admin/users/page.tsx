import { getUsersOverview } from "@/lib/queries";
import { UsersManager } from "@/components/admin/users-manager";

export const metadata = { title: "Пользователи — Кабинет" };

const PAGE_SIZE = 15;

export default async function AdminUsersPage() {
  const { items, total } = await getUsersOverview({ limit: PAGE_SIZE, offset: 0, sort: "points" });
  return <UsersManager initialItems={items} initialTotal={total} pageSize={PAGE_SIZE} />;
}
