import { stripePaths, STRIPES } from "@/lib/stripes";

/** Ленты 70-х вдоль кривой; draw - прорисовываются при появлении. */
export function Stripes({
  shape,
  draw = false,
  className = "",
}: {
  shape: keyof typeof STRIPES;
  draw?: boolean;
  className?: string;
}) {
  const cfg = STRIPES[shape];
  const preserve = "preserve" in cfg ? cfg.preserve : "xMaxYMid slice";
  return (
    <svg
      className={`sf-stripes ${draw ? "sf-draw" : ""} ${className}`}
      viewBox={cfg.viewBox}
      preserveAspectRatio={preserve}
      aria-hidden
    >
      {stripePaths(cfg).map((p, i) => (
        <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.width} strokeOpacity={p.opacity} pathLength={1} />
      ))}
    </svg>
  );
}

/** Знак: молния из четырёх лент в сливовом круге. */
export function Mark() {
  const colors = ["var(--sf-s1)", "var(--sf-s2)", "var(--sf-s3)", "var(--sf-s4)"];
  return (
    <span className="sf-mark" aria-hidden>
      <svg viewBox="0 0 40 40">
        <g fill="none" strokeWidth="2.6" strokeLinejoin="miter">
          {colors.map((c, k) => (
            <path
              key={c}
              stroke={c}
              d={`M${21 + k * 3.1} ${3 - k * 0.4} L${11 + k * 3.1} ${21 - k * 0.4} L${19 + k * 3.1} ${21 - k * 0.4} L${9 + k * 3.1} ${39 - k * 0.4}`}
            />
          ))}
        </g>
      </svg>
    </span>
  );
}
