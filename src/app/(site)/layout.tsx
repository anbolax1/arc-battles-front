import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { getMe } from "@/lib/queries";
import { getDesign } from "@/lib/design";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { SurfaceShell } from "@/components/surface/shell";

/* Общий «хром» публичной витрины: навбар + футер + контекст авторизации.
   Текущего пользователя подгружаем на сервере (cookie сессии) и отдаём в
   AuthProvider как начальное значение — навбар сразу знает роль, без мигания.
   Дизайн (прежний или новый) выбирает организатор в кабинете. */

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [user, design] = await Promise.all([getMe(), getDesign()]);

  if (design === "surface") {
    return (
      <AuthProvider initialUser={user}>
        <SurfaceShell>{children}</SurfaceShell>
      </AuthProvider>
    );
  }

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
