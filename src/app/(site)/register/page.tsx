import { redirect } from "next/navigation";
import { getMe } from "@/lib/queries";
import { REGISTER_EXISTING_PROFILE_TEXT } from "@/lib/signup";
import { SignupForm } from "@/components/domain/auth-form";
import { SectionHead } from "@/components/ui/section-head";
import { getDesign } from "@/lib/design";
import { SurfaceRegister } from "@/components/surface/pages/auth";

export const metadata = {
  title: "Регистрация — GOARC.PRO",
  description: "Создай аккаунт по логину и паролю, чтобы записываться на матчи лиги.",
};

export default async function RegisterPage() {
  const user = await getMe();
  if (user) redirect("/profile");
  if ((await getDesign()) === "surface") return <SurfaceRegister />;

  return (
    <div className="mx-auto w-full max-w-md space-y-8 px-6 py-12 sm:py-16">
      <SectionHead eyebrow="Создай аккаунт" title="Регистрация" />
      <p className="border-l-4 border-[var(--primary)] bg-surface-2 p-4 font-display text-xl leading-snug">
        {REGISTER_EXISTING_PROFILE_TEXT}
      </p>
      <SignupForm />
    </div>
  );
}
