import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { getMe } from "@/lib/queries";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";

/* Общий «хром» публичной витрины: навбар + футер + контекст авторизации.
   Текущего пользователя подгружаем на сервере (cookie сессии) и отдаём в
   AuthProvider как начальное значение — навбар сразу знает роль, без мигания. */

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const user = await getMe();
  return (
    <AuthProvider initialUser={user}>
      <div className="flex min-h-screen flex-col">
        <a href="#main" className="skip-link">
          К основному содержимому
        </a>
        <SiteNav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>
    </AuthProvider>
  );
}
