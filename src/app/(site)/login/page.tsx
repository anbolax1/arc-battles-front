import { redirect } from "next/navigation";
import { getMe } from "@/lib/queries";
import { AuthForm } from "@/components/domain/auth-form";
import { SectionHead } from "@/components/ui/section-head";
import { getDesign } from "@/lib/design";
import { SurfaceLogin } from "@/components/surface/pages/auth";

export const metadata = {
  title: "Вход — GOARC.PRO",
  description: "Вход по нику и паролю.",
};

// safeInternalRedirect — пускает только внутренний путь. Резолвим относительно фиктивного
// origin ровно так, как это сделает router.push (WHATWG URL), и требуем совпадения origin:
// это ловит и "//host", и бэкслеш-трюк "/\host" (его prefix-проверка пропускала).
function safeInternalRedirect(raw: string | undefined): string | undefined {
  if (typeof raw !== "string" || !raw.startsWith("/")) return undefined;
  try {
    const base = "https://internal.invalid";
    const u = new URL(raw, base);
    if (u.origin !== base) return undefined;
    return u.pathname + u.search + u.hash;
  } catch {
    return undefined;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const user = await getMe();
  if (user) redirect("/");

  const sp = await searchParams;
  const redirectTo = safeInternalRedirect(sp.redirect);
  if ((await getDesign()) === "surface") return <SurfaceLogin redirectTo={redirectTo} />;

  return (
    <div className="mx-auto w-full max-w-md space-y-8 px-6 py-12 sm:py-16">
      <SectionHead eyebrow="С возвращением" title="Вход" />
      <AuthForm redirectTo={redirectTo} />
    </div>
  );
}
