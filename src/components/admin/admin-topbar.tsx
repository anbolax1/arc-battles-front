"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { BoltIcon, LogoutIcon } from "@/components/icons";

export function AdminTopbar() {
  const { user, refresh } = useAuth();
  const router = useRouter();

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      /* всё равно обновим состояние */
    }
    await refresh();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-[100] border-b border-[var(--border)] bg-[rgba(9,9,12,0.8)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="logo-mark">
            <BoltIcon />
          </span>
          <span className="font-display text-base uppercase leading-none">
            Битва за Респект <span className="text-primary-2">· Кабинет</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          {user && (
            <span className="flex items-center gap-2">
              <Avatar name={user.displayName || user.login} src={user.avatarUrl} size="sm" />
              <span className="hidden font-display text-sm uppercase sm:inline">
                {user.displayName || user.login}
              </span>
            </span>
          )}
          <Link href="/" className="btn btn-ghost btn-sm">
            <span>На сайт</span>
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
            <LogoutIcon />
            <span>Выйти</span>
          </button>
        </div>
      </div>
    </header>
  );
}
