import Link from "next/link";
import { getClaimInfo } from "@/lib/queries";
import { ClaimForm } from "@/components/domain/claim-form";
import { Panel } from "@/components/ui/card";
import { SectionHead } from "@/components/ui/section-head";

export const metadata = { title: "Активация аккаунта — Битва за Респект" };

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await getClaimInfo(token);

  if (!info) {
    return (
      <div className="mx-auto max-w-[1240px] space-y-4 px-6 py-24 text-center">
        <h1 className="text-3xl">Ссылка недействительна</h1>
        <p className="text-muted">Возможно, аккаунт уже активирован или ссылку заменили на новую. Попроси у организатора актуальную.</p>
        <div className="pt-2">
          <Link href="/login" className="btn btn-primary"><span>Ко входу</span></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-12 sm:py-16">
      <SectionHead eyebrow="Активация аккаунта" title={info.displayName || info.login} />
      <Panel glow className="mt-6 max-w-md space-y-4 p-6">
        <p className="text-sm text-muted">
          Это твой аккаунт <b className="text-fg">@{info.login}</b> с историей матчей. Задай пароль —
          и сразу войдёшь. Дальше вход по логину и паролю.
        </p>
        <ClaimForm token={token} login={info.login} />
      </Panel>
    </div>
  );
}
