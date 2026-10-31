import type { ReactNode } from "react";
import Link from "next/link";
import "./auth.css";
import { getClaimInfo, getMe } from "@/lib/queries";
import { JOIN_STEPS } from "@/lib/display";
import { REGISTER_EXISTING_PROFILE_TEXT } from "@/lib/signup";
import { Stripes } from "@/components/surface/stripes";
import { SurfaceMissing } from "@/components/surface/missing";
import { SurfaceAuthForm, SurfaceClaimForm, SurfaceJoinForm, SurfaceSignupForm } from "@/components/surface/auth-forms";

/** Каркас страниц с формой: слева заголовок и пояснение, справа карточка на бумаге. */
function AuthLayout({ eyebrow, title, lead, aside, card, children }: { eyebrow: string; title: string; lead: string; aside?: ReactNode; card: string; children: ReactNode }) {
  return (
    <section className="sf-page-head sf-night sf-grain au-top">
      <Stripes shape="head" draw />
      <div className="sf-wrap au-grid">
        <div className="au-intro">
          <p className="sf-eyebrow">{eyebrow}</p>
          <h1 className="sf-h-big">
            {title}
            <span className="sf-dot">.</span>
          </h1>
          <p className="sf-lead au-lead">{lead}</p>
          {aside}
        </div>
        <div className="au-card sf-paper">
          <div className="au-card-top" aria-hidden />
          <div className="au-card-in">
            <p className="sf-eyebrow">{card}</p>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SurfaceLogin({ redirectTo }: { redirectTo?: string }) {
  return (
    <AuthLayout eyebrow="С возвращением" title="вход" lead="Профиль, заявки на матчи и свои клипы — по логину и паролю." card="Вход по логину">
      <SurfaceAuthForm redirectTo={redirectTo} />
    </AuthLayout>
  );
}

export function SurfaceRegister() {
  return (
    <AuthLayout
      eyebrow="Новый рейдер"
      title="регистрация"
      lead="Аккаунт нужен, чтобы записываться на матчи, вести профиль и присылать клипы с эфиров."
      aside={<p className="au-notice">{REGISTER_EXISTING_PROFILE_TEXT}</p>}
      card="Создай аккаунт"
    >
      <SurfaceSignupForm />
    </AuthLayout>
  );
}

/** Активация аккаунта, заведённого организатором: ссылка одноразовая. */
export async function SurfaceClaim({ token }: { token: string }) {
  const info = await getClaimInfo(token);
  if (!info) {
    return (
      <SurfaceMissing
        eyebrow="Активация аккаунта"
        title="ссылка недействительна"
        lead="Возможно, аккаунт уже активирован или ссылку заменили на новую. Попроси у организатора актуальную."
      >
        <Link className="sf-btn sf-btn-amber" href="/login">
          Ко входу
        </Link>
      </SurfaceMissing>
    );
  }
  return (
    <AuthLayout
      eyebrow="Активация аккаунта"
      title="твой аккаунт"
      lead={`Аккаунт ${info.displayName || info.login} с историей матчей уже на сайте. Задай пароль — и сразу войдёшь, дальше вход по логину и паролю.`}
      card={`Аккаунт @${info.login}`}
    >
      <SurfaceClaimForm token={token} login={info.login} />
    </AuthLayout>
  );
}

/** Запись на матч: три шага и заявка в общий пул; без входа - приглашение войти. */
export async function SurfaceJoin() {
  const user = await getMe();
  const steps = (
    <ol className="au-steps">
      {JOIN_STEPS.map((s) => (
        <li key={s.n}>
          <span className="au-step-n">{s.n}</span>
          <div>
            <b>{s.title}</b>
            <p>{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
  return (
    <AuthLayout
      eyebrow="Заявка на матч"
      title="записаться"
      lead="Выйти на поверхность просто: заявка попадает в общий пул участников, и организатор зовёт на матч в эфире."
      aside={steps}
      card={user ? "Заявка в общий пул" : "Сначала войди"}
    >
      {user ? (
        <SurfaceJoinForm user={user} />
      ) : (
        <div className="au-form">
          <p className="au-text">Заявка доступна после входа — так она привяжется к твоему аккаунту. Создай аккаунт или войди по логину и паролю.</p>
          <div className="au-actions">
            <Link className="sf-btn sf-btn-amber" href="/register">
              Регистрация
            </Link>
            <Link className="sf-btn sf-btn-ink-line" href="/login?redirect=/join">
              Войти
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
