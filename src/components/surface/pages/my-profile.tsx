import Link from "next/link";
import "./profile.css";
import { getMe, getMyRegistrations, getMyTags, getPlayer } from "@/lib/queries";
import type { Registration } from "@/lib/types";
import { Stripes } from "@/components/surface/stripes";
import { Arrow } from "@/components/surface/ui";
import { ProfileSettings } from "@/components/surface/profile-settings";
import { fullDate } from "@/components/surface/fmt";
import { ProfileView } from "@/components/surface/pages/profile";

function SignIn() {
  return (
    <section className="sf-page-head sf-night sf-grain">
      <Stripes shape="corner" className="corner" draw />
      <div className="sf-wrap">
        <p className="sf-eyebrow">Личный кабинет</p>
        <h1 className="sf-h-big">
          нужно войти<span className="sf-dot">.</span>
        </h1>
        <p className="sf-lead pf-lead">Профиль, заявки и Embark ID доступны после входа по логину и паролю.</p>
        <div className="sf-controls">
          <Link className="sf-btn sf-btn-amber" href="/login?redirect=/profile">
            Войти
          </Link>
        </div>
      </div>
    </section>
  );
}

const REG_STATUS: Record<Registration["status"], { cls: string; label: string }> = {
  pending: { cls: "c", label: "в пуле" },
  accepted: { cls: "w", label: "принята" },
  declined: { cls: "l", label: "отклонена" },
};

function MyRegistrations({ items }: { items: Registration[] }) {
  return (
    <div className="sf-block">
      <h2 className="sf-h-mid">
        мои заявки<span className="sf-dot">.</span>
      </h2>
      {items.length ? (
        <ul className="sf-hist pf-regs">
          {items.map((r) => {
            const st = REG_STATUS[r.status] ?? REG_STATUS.pending;
            const row = (
              <>
                <span className={`sf-res ${st.cls}`}>{st.label}</span>
                <span>
                  <b>{r.status === "accepted" && r.tournamentTitle ? r.tournamentTitle : "Заявка на матч"}</b>
                  <small>
                    Embark ID {r.embarkId || "не указан"} · {fullDate(r.createdAt)}
                  </small>
                </span>
                <span />
              </>
            );
            return <li key={r.id}>{r.status === "accepted" && r.tournamentId ? <Link href={`/tournament/${r.tournamentId}`}>{row}</Link> : <div>{row}</div>}</li>;
          })}
        </ul>
      ) : (
        <div className="sf-note pf-regs-empty">
          <p>Заявок пока нет. Подай заявку — попадёшь в общий пул, и организатор позовёт тебя на матч.</p>
          <Link className="sf-more" href="/join">
            Играть
            <Arrow />
          </Link>
        </div>
      )}
    </div>
  );
}

/** Свой профиль в новом дизайне: тот же пропуск и рейтинг, что видят другие, плюс Embark ID, теги и заявки. */
export async function SurfaceMyProfile() {
  const user = await getMe();
  if (!user) return <SignIn />;

  const [profile, regs, tags] = await Promise.all([getPlayer(user.login), getMyRegistrations(), getMyTags()]);
  const settings = <ProfileSettings embarkId={user.embarkId ?? ""} tags={tags} />;
  const registrations = <MyRegistrations items={regs} />;

  if (!profile) {
    return (
      <>
        <section className="sf-page-head sf-night sf-grain pf-top">
          <Stripes shape="head" draw />
          <div className="sf-wrap">
            <p className="sf-eyebrow">Личный кабинет</p>
            <h1 className="sf-h-big">
              профиль<span className="sf-dot">.</span>
            </h1>
            {settings}
          </div>
        </section>
        <section className="sf-sec sf-paper sf-grain pf-main">
          <div className="sf-wrap">{registrations}</div>
        </section>
      </>
    );
  }

  return <ProfileView profile={profile} eyebrow="Личный кабинет" settings={settings} extra={registrations} />;
}
