import { getMe, getMyRegistrations } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/pill";
import { Panel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead } from "@/components/ui/section-head";
import { EmbarkIdEditor } from "@/components/domain/embark-id-editor";
import { TwitchIcon } from "@/components/icons";
import { apiHref } from "@/lib/api";
import { registrationPill, roleBadge } from "@/lib/display";
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
            Профиль, заявки и Embark ID доступны после входа через Twitch.
          </p>
          <a href={apiHref("/auth/twitch/login")} className="btn btn-twitch">
            <TwitchIcon />
            <span>Войти через Twitch</span>
          </a>
        </Panel>
      </div>
    );
  }

  const regs = await getMyRegistrations();
  const role = roleBadge(user.role);

  return (
    <div className="mx-auto max-w-[1240px] space-y-8 px-6 py-12 sm:py-16">
      <SectionHead eyebrow="Личный кабинет" title="Профиль" />

      {/* Идентичность */}
      <Panel glow className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <Avatar name={user.displayName || user.login} src={user.avatarUrl} size="lg" />
        <div className="space-y-2">
          <h2 className="text-2xl">{user.displayName || user.login}</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>@{user.login}</span>
            <Badge kind={role.kind}>{role.label}</Badge>
          </div>
        </div>
      </Panel>

      {/* Embark ID */}
      <Panel className="space-y-4 p-6">
        <div>
          <h3 className="font-display text-lg uppercase">Игровой профиль</h3>
          <p className="mt-1 text-sm text-muted">
            Embark ID нужен для лобби в Arc Raiders. Он подставится в заявки на турниры.
          </p>
        </div>
        <EmbarkIdEditor initial={user.embarkId ?? ""} />
      </Panel>

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
