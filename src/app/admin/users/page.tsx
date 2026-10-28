import { getSubscriberRole, getUsersOverview } from "@/lib/queries";
import { UsersManager } from "@/components/admin/users-manager";

export const metadata = { title: "Пользователи — Кабинет" };

const PAGE_SIZE = 15;

export default async function AdminUsersPage() {
  const [{ items, total }, subscriberRole] = await Promise.all([
    getUsersOverview({ limit: PAGE_SIZE, offset: 0, sort: "points" }),
    getSubscriberRole(),
  ]);
  return <UsersManager initialItems={items} initialTotal={total} pageSize={PAGE_SIZE} subscriberRole={subscriberRole} />;
}
