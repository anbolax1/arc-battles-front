import { redirect } from "next/navigation";
import { getMe } from "@/lib/queries";
import { AuthForm } from "@/components/domain/auth-form";
import { SectionHead } from "@/components/ui/section-head";

export const metadata = {
  title: "Регистрация — Битва за Респект",
  description: "Создай аккаунт по логину и паролю, чтобы записываться на турниры и загружать хайлайты.",
};

export default async function RegisterPage() {
  const user = await getMe();
  if (user) redirect("/profile");

  return (
    <div className="mx-auto w-full max-w-md space-y-8 px-6 py-12 sm:py-16">
      <SectionHead eyebrow="Создай аккаунт" title="Регистрация" />
      <AuthForm mode="register" />
    </div>
  );
}
