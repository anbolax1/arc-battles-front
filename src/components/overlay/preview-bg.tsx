/** Подложка превью оверлея: скриншот игры днём или ночью, чтобы оценить читаемость. На OBS не влияет. */
export type PreviewBg = "day" | "night" | "checker" | "off";

const IMAGES = { day: "/preview-bg.jpg", night: "/preview-bg-night.jpg" } as const;

// Клетка 40 px сцены в долях её размера: шахматка одинакова и в редакторе, и в маленьком превью пульта.
const CHECKER = "repeating-conic-gradient(#3a3a42 0% 25%, #24242b 0% 50%) 0 0 / 4.1667% 7.4074%";

const OPTIONS: Array<[PreviewBg, string]> = [
  ["day", "День"],
  ["night", "Ночь"],
  ["checker", "Шахматка"],
  ["off", "Выкл"],
];

export function PreviewBgLayer({ bg }: { bg: PreviewBg }) {
  if (bg === "off") return null;
  if (bg === "checker") return <div aria-hidden className="absolute inset-0" style={{ background: CHECKER }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={IMAGES[bg]} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />;
}

export function PreviewBgSwitch({
  value,
  onChange,
  label = "Фон игры в превью:",
}: {
  value: PreviewBg;
  onChange: (v: PreviewBg) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      <div className="seg">
        {OPTIONS.map(([k, text]) => (
          <button key={k} type="button" className="seg-btn" aria-pressed={value === k} onClick={() => onChange(k)}>
            <span>{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
