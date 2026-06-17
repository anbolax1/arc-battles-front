# Битва за Респект — фронт (вариант B «Respect Arena»)

Next.js 16 (App Router, TS) + Tailwind v4. **Отдельный проект-сиблинг** рядом с Go-бэкендом (`../backend`); общаются только по HTTP через `/api`. Дизайн-эталон — `../prototypes/variant-b-respect-arena`. Подробный план — `../FRONTEND_PLAN_VARIANT_B.md`.

## Запуск (dev)
```bash
npm run dev        # http://localhost:3000
```
`/api/*` в dev проксируется на Go-бэкенд (`next.config.ts`, по умолчанию `http://127.0.0.1:8080`; переопределить — `BACKEND_ORIGIN`). Бэкенд для текущей демо-страницы не обязателен.

## Что уже есть (Фаза 0 — фундамент)
- Тема варианта B в `src/app/globals.css` (токены, тёмная тема, `prefers-reduced-motion`); шрифты Russo One + Chakra Petch в `layout.tsx`.
- Базовые компоненты `src/components/ui/`: `Button`, `StatusPill`, `Badge`, `Chip`, `Panel` (скос/clip-path-айдентика).
- Плумбинг `src/lib/`: `api.ts` (клиент к `/api`, `credentials:'include'`), `types.ts` (зеркало Go-моделей), `format.ts` (даты/склонения/`matchName`/`penaltyLabel`), `cn.ts`.
- Демо-страница (`/`) — витрина компонентов.

## Дальше
Фаза 1 — публичные страницы на текущем API (главная, расписание, рейтинг, архив, турнир, правила). См. план.

## Деплой
`output: 'standalone'`. Сборку делать **локально** (на сервере 960 МБ RAM), на сервер класть `.next/standalone` + `.next/static` + `public`; за nginx `/`→:3000, `/api`→:8080. Подробности — в плане.
