import { OverlayCanvas } from "@/components/overlay/overlay-canvas";

/* OBS-оверлей (Фаза 4). Вне группы (site) — без навбара/футера. Реактивно
   обновляется по WebSocket /api/ws/overlay (с фолбэком на опрос GET). */

export const metadata = {
  title: "Оверлей — Битва за Респект",
};

export default function OverlayPage() {
  return <OverlayCanvas />;
}
