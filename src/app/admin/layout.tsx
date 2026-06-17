import type { ReactNode } from "react";
import Link from "next/link";
import { AuthProvider } from "@/lib/auth";
import { getMe } from "@/lib/queries";
import { apiHref } from "@/lib/api";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { TwitchIcon } from "@/components/icons";

export const metadata = { title: "Кабинет — Битва за Респект" };

/* Кабинет организатора — собственный shell (вне публичного (site)-хрома).
   Гейт по роли на сервере: не организатор → экран-заглушка. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getMe();

  if (!user || user.role !== "organizer") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl">Доступно только организатору</h1>
        <p className="max-w-md text-muted">
          Кабинет открыт пользователям с ролью организатора.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {!user && (
            <a href={apiHref("/auth/twitch/login")} className="btn btn-twitch">
              <TwitchIcon />
              <span>Войти через Twitch</span>
            </a>
          )}
          <Link href="/" className="btn btn-ghost">
            <span>На главную</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider initialUser={user}>
      <div className="flex min-h-screen flex-col">
        <AdminTopbar />
        <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
          <AdminSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
