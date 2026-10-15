/** Пояс лиги рисунком: ник носителя на центральной пластине, звёзды защит на ремне, ржавчина по позолоте. */

const PLATE = "M300 10 L382 34 L408 130 L382 226 L300 250 L218 226 L192 130 L218 34 Z";
const PLATE_IN = "M300 23 L371 44 L394 130 L371 216 L300 237 L229 216 L206 130 L229 44 Z";
/** Гнёзда под звёзды: по пять с каждой стороны, заполняются от центра. */
const STUDS = [88, 74, 60, 46, 32, 512, 526, 540, 554, 568];
const STRIPES = ["#7fede6", "#2bef83", "#f9cf0a", "#f2271c"];
/** Ширина ника на центральной пластине; Science Gothic при растяжке 122% - около 1,17 кегля на букву. */
const NAME_MAX = 170;
const NAME_EM = 1.17;

/** Средняя линия ремня: верх ремня - кривая от (14,84) через (300,108) к (586,84). */
function strapMid(x: number): number {
  const t = (x - 14) / 572;
  return 84 + 48 * t * (1 - t) + 38;
}

function starPath(cx: number, cy: number, outer: number, inner: number): string {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : outer;
    d += `${i ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  return d + "Z";
}

function Stripes({ x, y, w, h, gap = 0, reverse = false }: { x: number; y: number; w: number; h: number; gap?: number; reverse?: boolean }) {
  const colors = reverse ? [...STRIPES].reverse() : STRIPES;
  return (
    <>
      {colors.map((c, i) => (
        <rect key={c} x={x + i * (w + gap)} y={y} width={w} height={h} fill={c} />
      ))}
    </>
  );
}

export function BeltArt({
  id,
  name,
  stars = 0,
  rust = 0,
  vacant = false,
  label,
  className,
}: {
  /** Уникален на странице: на него ссылаются градиенты и фильтр ржавчины. */
  id: string;
  name?: string;
  stars?: number;
  /** Доля ржавчины 0..1. */
  rust?: number;
  vacant?: boolean;
  label?: string;
  className?: string;
}) {
  const r = Math.max(0, Math.min(1, rust));
  const nick = vacant ? "НИЧЕЙ" : (name ?? "").toUpperCase();
  const fs = Math.max(15, Math.min(40, Math.floor(NAME_MAX / (Math.max(1, nick.length) * NAME_EM))));
  const squeeze = nick.length * NAME_EM * fs > NAME_MAX ? { textLength: NAME_MAX, lengthAdjust: "spacingAndGlyphs" as const } : {};
  const studs = STUDS.map((x, i) => ({ d: starPath(x, strapMid(x), 6.6, 2.8), lit: i < stars }));
  const rivets = [24, 576].flatMap((x) => [strapMid(x) - 26, strapMid(x) + 26].map((y) => ({ x, y })));
  const g = `${id}-g`;
  const gr = `${id}-gr`;
  const nameStyle = { fontFamily: "var(--sf-ff-x)", fontStretch: "122%" } as const;
  const aria = label ?? (vacant ? "Пояс лиги: ничей" : `Пояс лиги: ${name ?? ""}`);

  return (
    <svg className={className} viewBox="0 0 600 260" role="img" aria-label={aria}>
      <defs>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d2446" />
          <stop offset=".55" stopColor="#1d0f23" />
          <stop offset="1" stopColor="#2d1834" />
        </linearGradient>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe7a3" />
          <stop offset=".4" stopColor="#f6b62e" />
          <stop offset=".78" stopColor="#d38c0f" />
          <stop offset="1" stopColor="#94590a" />
        </linearGradient>
        <linearGradient id={gr} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff0c4" />
          <stop offset=".45" stopColor="#e3a01b" />
          <stop offset="1" stopColor="#6e4204" />
        </linearGradient>
        {r > 0 && (
          <>
            {/* Доля закрытой ржавчиной позолоты растёт с r: при r = 1 - около двух третей. */}
            <filter id={`${id}-r`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves={4} seed={4} result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="a" />
              <feComponentTransfer in="a" result="m">
                <feFuncA type="linear" slope={7} intercept={-5 + 1.9 * r} />
              </feComponentTransfer>
              <feFlood floodColor="#a24f22" floodOpacity={0.92} result="c" />
              <feComposite in="c" in2="m" operator="in" result="r1" />
              <feTurbulence type="fractalNoise" baseFrequency=".13" numOctaves={2} seed={13} result="n2" />
              <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="a2" />
              <feComponentTransfer in="a2" result="m2">
                <feFuncA type="linear" slope={7} intercept={-5.6 + 1.7 * r} />
              </feComponentTransfer>
              <feFlood floodColor="#4b1d0b" floodOpacity={0.9} result="c2" />
              <feComposite in="c2" in2="m2" operator="in" result="r2" />
              <feMerge>
                <feMergeNode in="r1" />
                <feMergeNode in="r2" />
              </feMerge>
            </filter>
            <clipPath id={`${id}-co`}>
              <path d={PLATE} />
              <rect x="100" y="86" width="84" height="88" rx="12" />
              <rect x="416" y="86" width="84" height="88" rx="12" />
              {studs.map((s) => (
                <path key={s.d} d={s.d} />
              ))}
            </clipPath>
            <clipPath id={`${id}-ci`}>
              <path d={PLATE_IN} />
              <rect x="108" y="94" width="68" height="72" rx="8" />
              <rect x="424" y="94" width="68" height="72" rx="8" />
            </clipPath>
          </>
        )}
      </defs>

      <path d="M14 84 Q300 108 586 84 L586 160 Q300 184 14 160 Z" fill={`url(#${id}-l)`} />
      <path d="M24 92 Q300 115 576 92 L576 152 Q300 176 24 152 Z" fill="none" stroke="rgba(236,226,208,.32)" strokeWidth="1.4" strokeDasharray="6 5" />
      {rivets.map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r="3" fill={`url(#${g})`} stroke="#7a4a04" strokeWidth=".8" />
      ))}
      {studs.map((s) => (
        <path key={s.d} d={s.d} fill={s.lit ? `url(#${g})` : "#2a1931"} stroke={s.lit ? "#7a4a04" : "rgba(236,226,208,.4)"} strokeWidth="1" />
      ))}
      {stars > STUDS.length && (
        <text x="586" y={strapMid(560) - 20} textAnchor="end" fontFamily="monospace" fontSize="11" fontWeight="700" fill="#f1aa1c">
          +{stars - STUDS.length}
        </text>
      )}

      <rect x="100" y="86" width="84" height="88" rx="12" fill={`url(#${gr})`} stroke="#6e4204" strokeWidth="1.5" />
      <rect x="416" y="86" width="84" height="88" rx="12" fill={`url(#${gr})`} stroke="#6e4204" strokeWidth="1.5" />
      <path d={PLATE} fill={`url(#${gr})`} stroke="#6e4204" strokeWidth="2" />
      {r > 0 && (
        <g clipPath={`url(#${id}-co)`}>
          <rect x="0" y="0" width="600" height="260" fill="#3a1a08" opacity={r * 0.22} />
          <rect x="0" y="0" width="600" height="260" filter={`url(#${id}-r)`} />
        </g>
      )}
      <rect x="108" y="94" width="68" height="72" rx="8" fill="#1c0f22" stroke="#f1aa1c" strokeWidth="1" />
      <rect x="424" y="94" width="68" height="72" rx="8" fill="#1c0f22" stroke="#f1aa1c" strokeWidth="1" />
      <path d={PLATE_IN} fill="#1c0f22" stroke="#f1aa1c" strokeWidth="1.6" />
      {r > 0 && (
        <g clipPath={`url(#${id}-ci)`} opacity={0.08 + r * 0.2}>
          <rect x="0" y="0" width="600" height="260" filter={`url(#${id}-r)`} />
        </g>
      )}

      <Stripes x={118} y={108} w={9} h={44} gap={2} />
      <Stripes x={437} y={108} w={9} h={44} gap={2} reverse />
      <Stripes x={246} y={70} w={27} h={6} />
      <text x="300" y={131 + 1.6} dominantBaseline="central" textAnchor="middle" fontSize={fs} fontWeight="900" fill="#000" opacity=".55" style={nameStyle} {...squeeze}>
        {nick}
      </text>
      <text x="300" y="131" dominantBaseline="central" textAnchor="middle" fontSize={fs} fontWeight="900" fill={vacant ? "#b9ad9f" : "#f5eedf"} style={nameStyle} {...squeeze}>
        {nick}
      </text>
      <Stripes x={246} y={184} w={27} h={6} />
    </svg>
  );
}
