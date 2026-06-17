import type { ReactNode } from "react";

/* Оверлей для OBS: прозрачный фон, чтобы на стриме была видна только плашка
   (а не тёмный прямоугольник сайта). В обычном браузере фон тоже прозрачный —
   это ожидаемо, оверлей рассчитан на наложение поверх захвата игры. */
export default function OverlayLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`html,body{background:transparent !important}`}</style>
      {children}
    </>
  );
}
