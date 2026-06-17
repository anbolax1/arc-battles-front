/* Витрина дизайн-системы (kitchen-sink) — перенесена с «/» на «/kitchen».
   Реальная главная живёт в app/(site)/page.tsx. Полезно как справочник
   компонентов; не входит в публичную навигацию. */

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/pill";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Panel } from "@/components/ui/card";

function TwitchIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 3 3 6.5V20h4v2.5h3L12.5 20H17l4-4V3H4Zm15 11.5-2.5 2.5H12l-2 2v-2H6V5h13v9.5Z" />
      <path d="M14 8h1.6v4.2H14V8Zm-4 0h1.6v4.2H10V8Z" />
    </svg>
  );
}

export default function Kitchen() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 space-y-14">
      <header className="space-y-3">
        <p className="eyebrow">Дизайн-система · витрина компонентов</p>
        <h1 className="text-4xl sm:text-5xl">
          БИТВА ЗА <span className="grad">РЕСПЕКТ</span>
        </h1>
        <p className="max-w-2xl text-muted">
          Справочник по варианту B «Respect Arena»: токены, шрифты (Russo One +
          Chakra Petch), тёмная тема и базовые компоненты. Реальные страницы — в
          публичной навигации.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Chip dot>1×1 / 2×2</Chip>
          <Chip cyan dot>
            3 раунда
          </Chip>
          <Chip dot>~90 минут</Chip>
        </div>
      </header>

      <section className="space-y-4">
        <p className="eyebrow">Кнопки</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Записаться</Button>
          <Button variant="cyan">Смотреть</Button>
          <Button variant="ghost">На сайт</Button>
          <Button variant="danger">Отклонить</Button>
          <Button variant="twitch" icon={<TwitchIcon />}>
            Войти через Twitch
          </Button>
          <Button variant="primary" size="sm">
            Маленькая
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <p className="eyebrow">Статусы матча</p>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status="live">В эфире</StatusPill>
          <StatusPill status="soon">Скоро</StatusPill>
          <StatusPill status="announce">Анонс</StatusPill>
          <StatusPill status="done">Завершён</StatusPill>
          <StatusPill status="ok">Подтверждён</StatusPill>
          <StatusPill status="no">Отклонён</StatusPill>
          <StatusPill status="wait">Заявка</StatusPill>
        </div>
      </section>

      <section className="space-y-4">
        <p className="eyebrow">Бейджи и очки</p>
        <div className="flex flex-wrap items-center gap-3">
          <Badge kind="champ">Чемпион</Badge>
          <Badge kind="glad">Гладиатор</Badge>
          <Badge kind="org">Организатор</Badge>
          <Badge kind="boosty">Boosty</Badge>
          <Badge kind="official">official</Badge>
          <span className="pts pts-cyan">
            <span>+1 балл</span>
          </span>
          <span className="pts pts-orange">
            <span>+2 балла</span>
          </span>
          <span className="pts pts-minus">
            <span>−10%</span>
          </span>
        </div>
      </section>

      <section className="space-y-4">
        <p className="eyebrow">Карточка матча</p>
        <Panel glow className="max-w-md p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-display text-lg uppercase">
                RaZor_Vortex vs Nyx_Striker
              </div>
              <div className="text-sm text-muted">Космопорт · 1×1 · 3 раунда</div>
            </div>
            <StatusPill status="live">В эфире</StatusPill>
          </div>
        </Panel>
      </section>
    </main>
  );
}
