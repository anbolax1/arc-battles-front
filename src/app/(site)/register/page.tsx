import { getMe } from "@/lib/queries";
import { RegisterForm } from "@/components/domain/register-form";
import { SectionHead } from "@/components/ui/section-head";
import { Panel } from "@/components/ui/card";
import { TwitchIcon } from "@/components/icons";
import { apiHref } from "@/lib/api";

export const metadata = {
  title: "Регистрация — Битва за Респект",
  description: "Войди через Twitch, укажи Embark ID в профиле и оставь заявку в общий пул участников.",
};

const STEPS = [
  { n: 1, title: "Вход через Twitch", text: "Авторизуйся — так мы свяжем заявку с твоим аккаунтом." },
  { n: 2, title: "Embark ID в профиле", text: "Ник вида «ник#0000» задаётся один раз в профиле — он нужен для лобби в Arc Raiders и подставляется в заявку." },
  { n: 3, title: "Удобные даты", text: "Напиши, в какие даты можешь играть. Организатор позовёт на подходящий турнир." },
];

export default async function RegisterPage() {
  const user = await getMe();

  return (
    <div className="mx-auto max-w-[1240px] space-y-8 px-6 py-12 sm:py-16">
      <SectionHead eyebrow="Выходи на арену" title="Регистрация" />

      <div className="grid gap-8 lg:grid-cols-2">
        <ol className="space-y-5">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="flex h-10 w-10 flex-none items-center justify-center font-display text-lg [clip-path:polygon(18%_0,100%_0,82%_100%,0_100%)] bg-surface-2 text-primary-2 shadow-[inset_0_0_0_1px_var(--border)]">
                {s.n}
              </span>
              <div className="space-y-1">
                <h3 className="font-display text-base uppercase">{s.title}</h3>
                <p className="text-sm text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        {user ? (
          <RegisterForm user={user} />
        ) : (
          <Panel glow className="flex flex-col items-start gap-4 p-6">
            <h3 className="font-display text-lg uppercase">Сначала войди</h3>
            <p className="text-sm text-muted">
              Регистрация на турнир доступна после входа через Twitch. Это нужно,
              чтобы привязать заявку к твоему аккаунту и роли.
            </p>
            <a href={apiHref("/auth/twitch/login")} className="btn btn-twitch">
              <TwitchIcon />
              <span>Войти через Twitch</span>
            </a>
          </Panel>
        )}
      </div>
    </div>
  );
}
