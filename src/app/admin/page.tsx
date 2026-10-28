import { redirect } from "next/navigation";
import { getMe } from "@/lib/queries";
import { roleAtLeast } from "@/lib/roles";

export default async function AdminIndex() {
  const user = await getMe();
  redirect(roleAtLeast(user?.role, "superadmin") ? "/admin/matches" : "/admin/review");
}
