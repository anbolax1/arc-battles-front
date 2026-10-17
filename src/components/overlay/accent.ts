import type { CSSProperties } from "react";

/** Основной цвет сцены вместо фирменного оранжевого: сторона A на табло, свои задания и их очки.
    Оттенки считаются здесь, а не через color-mix: встроенный браузер старых OBS его не понимает. */
export function accentVars(hex?: string): CSSProperties {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return {};
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const light = (c: number) => Math.round(c + (255 - c) * 0.18); // светлее на 18%, как #ff8a3d у #ff6a1a
  const rgba = (a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;
  return {
    "--primary": `#${m[1]}`,
    "--primary-2": `rgb(${light(r)}, ${light(g)}, ${light(b)})`,
    "--primary-soft": rgba(0.16),
    "--primary-line": rgba(0.35),
    "--primary-glow": rgba(0.6),
  } as CSSProperties;
}
