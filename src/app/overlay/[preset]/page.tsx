import { OverlayCanvas } from "@/components/overlay/overlay-canvas";

/* Оверлей, привязанный к пресету: /overlay/<slug>. Раскладка берётся из самого
   пресета, а не из состояния эфира, поэтому в OBS заводится по браузер-источнику
   на каждый вид оверлея и они переключаются сценами, а не выбором в кабинете. */

export const metadata = {
  title: "Оверлей — Битва за Респект",
};

export default async function OverlayPresetPage({ params }: { params: Promise<{ preset: string }> }) {
  const { preset } = await params;
  return <OverlayCanvas presetKey={preset} />;
}
