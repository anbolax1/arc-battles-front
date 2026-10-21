import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/queries";
import { REGISTER_CLOSED_TEXT } from "@/lib/display";
import { SectionHead } from "@/components/ui/section-head";
import { Panel } from "@/components/ui/card";
import { getDesign } from "@/lib/design";
import { SurfaceRegister } from "@/components/surface/pages/auth";

export const metadata = {
  title: "Регистрация — GOARC.PRO",
  description: "Аккаунты заводит организатор, вход выдаёт персональной ссылкой.",
};

export default async function RegisterPage() {
  const user = await getMe();
  if (user) redirect("/profile");
  if ((await getDesign()) === "surface") return <SurfaceRegister />;

  return (
    <div className="mx-auto w-full max-w-md space-y-8 px-6 py-12 sm:py-16">
      <SectionHead eyebrow="Регистрация" title="Вход по ссылке" />
      <Panel glow className="flex flex-col items-start gap-4 p-6">
        <p className="text-sm text-muted">{REGISTER_CLOSED_TEXT}</p>
        <Link href="/login" className="btn btn-primary">
          <span>Ко входу</span>
        </Link>
      </Panel>
    </div>
  );
}
