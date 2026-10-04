import { getMe, getMyRegistrations, getPlayer, getSeasons } from "@/lib/queries";
import { PlayerRatingSections } from "@/components/domain/player-rating-sections";
import { Avatar } from "@/components/ui/avatar";
import { PublicTags } from "@/components/ui/tag-badge";
import { StatusPill } from "@/components/ui/pill";
import { Panel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead } from "@/components/ui/section-head";
import { EmbarkIdEditor } from "@/components/domain/embark-id-editor";
import { TagSettings } from "@/components/domain/tag-settings";
import Link from "next/link";
import { registrationPill } from "@/lib/display";
import { fmtDate } from "@/lib/format";

export const metadata = {
  title: "Профиль — Битва за Респект",
};

export default async function ProfilePage() {
  const user = await getMe();

  if (!user) {
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-12 sm:py-16">
        <SectionHead eyebrow="Личный кабинет" title="Профиль" />
        <Panel glow className="flex max-w-xl flex-col items-start gap-4 p-6">
          <h3 className="font-display text-lg uppercase">Нужно войти</h3>
          <p className="text-sm text-muted">
            Профиль, заявки и Embark ID доступны после входа по логину и паролю.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login?redirect=/profile" className="btn btn-primary">
              <span>Войти</span>
            </Link>
            <Link href="/register" className="btn btn-ghost">
              <span>Регистрация</span>
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  const [regs, playerProfile, seasons] = await Promise.all([getMyRegistrations(), getPlayer(user.login), getSeasons()]);

  return (
    <div className="mx-auto max-w-[1240px] space-y-8 px-6 py-12 sm:py-16">
      <SectionHead eyebrow="Личный кабинет" title="Профиль" />

      {/* Идентичность и Embark ID - сразу наверху, чтобы не листать до него */}
      <Panel glow className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={user.displayName || user.login} src={user.avatarUrl} size="lg" />
          <div className="min-w-0 space-y-2">
            <h2 className="truncate text-2xl">{user.displayName || user.login}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
              <span>@{user.login}</span>
              <PublicTags tags={user.tags} />
            </div>
            <TagSettings />
          </div>
        </div>
        <div className="w-full lg:w-[24rem]">
          <EmbarkIdEditor initial={user.embarkId ?? ""} compact />
        </div>
      </Panel>

      {/* Статистика, рейтинг и команды (как в публичном профиле) */}
      {playerProfile && <PlayerRatingSections profile={playerProfile} seasons={seasons} />}

      {/* Мои заявки */}
      <section className="space-y-4">
        <h3 className="text-xl">Мои заявки</h3>
        {regs.length ? (
          <div className="space-y-3">
            {regs.map((r) => {
              const pill = registrationPill(r.status);
              return (
                <Panel key={r.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="truncate font-display uppercase">
                      {r.status === "accepted" && r.tournamentTitle
                        ? r.tournamentTitle
                        : r.status === "declined"
                          ? "Заявка отклонена"
                          : "Заявка в пуле"}
                    </div>
                    <div className="text-sm text-muted">
                      Embark ID: <span className="text-fg">{r.embarkId || "—"}</span> ·{" "}
                      {fmtDate(r.createdAt)}
                    </div>
                  </div>
                  <StatusPill status={pill.status}>{pill.label}</StatusPill>
                </Panel>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Заявок пока нет"
            hint="Подай заявку на участие на странице «Записаться» — попадёшь в общий пул."
          />
        )}
      </section>
    </div>
  );
}
