import { useId, type ReactNode } from "react";

/**
 * Drawn rank crests. Each rank gets grander: Bronze is a plain shield; then chevrons, laurels, gems,
 * wings and flames; Legendary is a crowned, winged crest. View box 0 0 64 64.
 */

const SHIELD = "M32 5 L53 12.5 V29 C53 43 44 52.5 32 59 C20 52.5 11 43 11 29 V12.5 Z";
const INNER = "M32 10 L48.5 16 V29.5 C48.5 40.5 41.5 48.5 32 53.8 C22.5 48.5 15.5 40.5 15.5 29.5 V16 Z";
const HEX = "M32 4 L55 17 V45 L32 58 L9 45 V17 Z";
const HEX_IN = "M32 9.5 L50.5 20 V42 L32 52.5 L13.5 42 V20 Z";

interface Look { metal: [string, string, string]; field: [string, string]; shape?: "shield" | "hex"; back?: (id: string) => ReactNode; front?: (id: string) => ReactNode }

const Laurel = ({ fill, y0 = 46 }: { fill: string; y0?: number }) => (
  <g fill={fill} stroke="#0003" strokeWidth=".4">
    {[0, 1, 2, 3].map((i) => (
      <g key={i}>
        <ellipse cx={13 - i * 1.2} cy={y0 - i * 7} rx="5" ry="2.1" transform={`rotate(${-50 + i * 14} ${13 - i * 1.2} ${y0 - i * 7})`} />
        <ellipse cx={51 + i * 1.2} cy={y0 - i * 7} rx="5" ry="2.1" transform={`rotate(${50 - i * 14} ${51 + i * 1.2} ${y0 - i * 7})`} />
      </g>
    ))}
  </g>
);

const Wings = ({ fill, stroke }: { fill: string; stroke: string }) => (
  <g fill={fill} stroke={stroke} strokeWidth=".8" strokeLinejoin="round">
    {[1, -1].map((s) => (
      <g key={s} transform={s === -1 ? "translate(64 0) scale(-1 1)" : undefined}>
        <path d="M12 20 C4 18 0 22 1 26 C4 25 7 25 10 26 C5 27 2 30 3 34 C6 32 9 31 11.5 31.5 C8 33 6 36 7.5 39 C10 37 12 36 13.5 36" />
      </g>
    ))}
  </g>
);

/** A faceted gem: `cut` decides the outline. */
function Gem({ x, y, s, c, cut = "round" }: { x: number; y: number; s: number; c: [string, string]; cut?: "round" | "emerald" | "oval" | "brilliant" | "star" }) {
  const id = useId().replace(/:/g, "");
  const outline = cut === "emerald" ? `M${-s * .6} ${-s} H${s * .6} L${s} ${-s * .55} V${s * .55} L${s * .6} ${s} H${-s * .6} L${-s} ${s * .55} V${-s * .55} Z`
    : cut === "oval" ? `M0 ${-s * 1.15} C${s * .95} ${-s * 1.15} ${s * .95} ${s * 1.15} 0 ${s * 1.15} C${-s * .95} ${s * 1.15} ${-s * .95} ${-s * 1.15} 0 ${-s * 1.15} Z`
    : cut === "brilliant" ? `M${-s * .55} ${-s * .75} H${s * .55} L${s * 1.05} ${-s * .2} L0 ${s * 1.1} L${-s * 1.05} ${-s * .2} Z`
    : cut === "star" ? Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * .45 : s * 1.1; return `${i ? "L" : "M"}${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`; }).join(" ") + " Z"
    : `M0 ${-s} L${s * .87} ${-s * .5} V${s * .5} L0 ${s} L${-s * .87} ${s * .5} V${-s * .5} Z`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs><linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c[0]} /><stop offset="1" stopColor={c[1]} /></linearGradient></defs>
      <path d={outline} fill={`url(#${id}g)`} stroke="#fff" strokeWidth=".9" strokeLinejoin="round" />
      {cut === "brilliant"
        ? <path d={`M${-s * 1.05} ${-s * .2} H${s * 1.05} M${-s * .55} ${-s * .75} L${-s * .3} ${-s * .2} L0 ${s * 1.1} L${s * .3} ${-s * .2} L${s * .55} ${-s * .75} M0 ${-s * .75} L${-s * .3} ${-s * .2} M0 ${-s * .75} L${s * .3} ${-s * .2}`} stroke="#fff" strokeWidth=".55" fill="none" opacity=".8" />
        : <path d={`M${-s * .5} ${-s * .3} L0 ${-s * .7} L${s * .5} ${-s * .3}`} stroke="#fff" strokeWidth=".8" fill="none" opacity=".75" />}
      <ellipse cx={-s * .35} cy={-s * .4} rx={s * .22} ry={s * .12} fill="#fff" opacity=".8" transform={`rotate(-35 ${-s * .35} ${-s * .4})`} />
    </g>
  );
}

const LOOKS: Record<string, Look> = {
  low: { metal: ["#c9c9c9", "#8a8a8a", "#5a5a5a"], field: ["#9a9a9a", "#5e5e5e"],
    front: () => <path d="M30 14 L34 24 L28 31 L35 40 L31 50" fill="none" stroke="#3a3a3a" strokeWidth="1.6" strokeLinejoin="round" /> },
  bronze: { metal: ["#f6c896", "#b0703a", "#6e4018"], field: ["#c98a4e", "#7a4a1e"],
    front: () => <><path d="M18 30 L32 22 L46 30 V35 L32 27 L18 35 Z" fill="#f3c590" stroke="#6e4018" strokeWidth=".8" />
      {[[20, 18], [44, 18], [32, 47]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" fill="#f6d2a8" stroke="#6e4018" strokeWidth=".5" />)}</> },
  silver: { metal: ["#ffffff", "#aab6c2", "#66727e"], field: ["#c8d2dc", "#7d8a96"],
    back: () => <Laurel fill="#dfe6ee" />,
    front: () => <>{[24, 32].map((y) => <path key={y} d={`M18 ${y} L32 ${y - 8} L46 ${y} V${y + 5} L32 ${y - 3} L18 ${y + 5} Z`} fill="#fff" stroke="#66727e" strokeWidth=".8" />)}</> },
  gold: { metal: ["#fff2b8", "#e0aa20", "#8a6100"], field: ["#f0c040", "#a87a1e"],
    back: () => <Laurel fill="#e7b93a" />,
    front: () => <Gem x={32} y={31} s={11} c={["#fff6c0", "#e8a800"]} cut="star" /> },
  platinum: { shape: "hex", metal: ["#ffffff", "#9fd3e0", "#4d8696"], field: ["#cfeef6", "#5f9eb0"],
    back: () => <g fill="#e8f6fa" stroke="#4d8696" strokeWidth=".6">{[0, 60, 120, 180, 240, 300].map((a) => <path key={a} d="M32 0 L35 6 H29 Z" transform={`rotate(${a} 32 31)`} />)}</g>,
    front: () => <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
      {[0, 60, 120].map((a) => <g key={a} transform={`rotate(${a} 32 31)`}><path d="M32 18 V44 M28 21 L32 24 L36 21 M28 41 L32 38 L36 41" fill="none" /></g>)}
      <circle cx="32" cy="31" r="3" fill="#9fe6ff" stroke="#fff" strokeWidth="1" /></g> },
  emerald: { metal: ["#c8f5df", "#2fa37f", "#0b4a3a"], field: ["#3fbf8a", "#0f6b47"],
    back: () => <Laurel fill="#2fd38a" />,
    front: () => <Gem x={32} y={31} s={11} c={["#9ff0c8", "#0f8a55"]} cut="emerald" /> },
  sapphire: { metal: ["#dbe8ff", "#4d8fe0", "#0e2a6a"], field: ["#3a7ae0", "#133a8a"],
    back: () => <Wings fill="#dbe8ff" stroke="#1f5fbf" />,
    front: () => <><Gem x={32} y={31} s={11.5} c={["#9fc8ff", "#1846b8"]} cut="oval" />
      <circle cx="21" cy="18" r="1.3" fill="#fff" /><circle cx="44" cy="45" r="1" fill="#fff" /></> },
  ruby: { metal: ["#ffd0da", "#d0304f", "#5a0a20"], field: ["#e04a68", "#7a1631"],
    back: () => <g>{[-26, -13, 0, 13, 26].map((a, i) => <path key={a} d="M32 -2 C29 3 30 7 32 10 C34 7 35 3 32 -2 Z" transform={`rotate(${a} 32 34)`} fill={i % 2 ? "#ffb347" : "#ff5a36"} />)}</g>,
    front: () => <Gem x={32} y={32} s={11} c={["#ff9fb4", "#b0103a"]} cut="round" /> },
  diamond: { metal: ["#ffffff", "#b9e6ff", "#4a8fb0"], field: ["#d6f3ff", "#5aa8cf"],
    back: (id) => <><g opacity=".9">{Array.from({ length: 12 }, (_, i) => <path key={i} d="M32 -3 L33.4 6 H30.6 Z" fill={`url(#${id}m)`} transform={`rotate(${i * 30} 32 31)`} />)}</g>
      <Wings fill="#f0fbff" stroke="#5aa8cf" /></>,
    front: () => <><Gem x={32} y={30} s={13} c={["#ffffff", "#7fd6ff"]} cut="brilliant" />
      <path d="M46 16 l1 2.5 2.5 1 -2.5 1 -1 2.5 -1 -2.5 -2.5 -1 2.5 -1z M19 41 l.8 2 2 .8 -2 .8 -.8 2 -.8 -2 -2 -.8 2 -.8z" fill="#fff" /></> },
  obsidian: { metal: ["#b69cff", "#4a3470", "#0a0612"], field: ["#2a1f40", "#0c0814"],
    back: () => <g fill="#1a1426" stroke="#b69cff" strokeWidth=".7">
      {[-60, -35, 35, 60, 145, 215].map((a) => <path key={a} d="M32 -1 L35.5 9 H28.5 Z" transform={`rotate(${a} 32 31)`} />)}</g>,
    front: () => <><circle cx="32" cy="31" r="13" fill="#9b6bff" opacity=".35" /><Gem x={32} y={31} s={11} c={["#d8c8ff", "#5a2fc0"]} cut="brilliant" /></> },
  legendary: { metal: ["#fff6d0", "#e0aa20", "#7a5200"], field: ["#3a2a00", "#120c00"],
    back: (id) => <><g opacity=".85">{Array.from({ length: 16 }, (_, i) => <path key={i} d="M32 -4 L33.6 7 H30.4 Z" fill={`url(#${id}m)`} transform={`rotate(${i * 22.5} 32 33)`} />)}</g>
      <Wings fill="#ffe58a" stroke="#8a6100" /></>,
    front: () => <><Gem x={32} y={35} s={9.5} c={["#fff6c0", "#e8a800"]} cut="star" />
      <path d="M20 14 L18 2 L25 8 L32 -1 L39 8 L46 2 L44 14 Z" fill="#ffd24a" stroke="#7a5200" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="32" cy="9" r="1.8" fill="#e3214a" /><circle cx="25" cy="10.5" r="1.3" fill="#2f7bff" /><circle cx="39" cy="10.5" r="1.3" fill="#22c27e" /></> },
};

const keyOf = (k?: string | null) => (k ?? "").toLowerCase().replace(" honor", "").trim();

/** A rank's crest. `rank` is the tier key (or its name). Sized by `size`, or by the text around it (1.25em). */
export default function RankIcon({ rank, size, className = "", title }: { rank?: string | null; size?: number; className?: string; title?: string }) {
  const uid = useId().replace(/:/g, "");
  const look = LOOKS[keyOf(rank)] ?? LOOKS.bronze;
  const id = `ri${uid}`;
  const hex = look.shape === "hex";
  return (
    <svg className={`rank-ico ${className}`} viewBox="-4 -4 72 72" style={size ? { width: size, height: size } : undefined}
      role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={look.metal[0]} /><stop offset=".5" stopColor={look.metal[1]} /><stop offset="1" stopColor={look.metal[2]} />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={look.field[0]} /><stop offset="1" stopColor={look.field[1]} /></linearGradient>
      </defs>
      {look.back?.(id)}
      <path d={hex ? HEX : SHIELD} fill={`url(#${id}m)`} stroke={look.metal[2]} strokeWidth="1.2" strokeLinejoin="round" />
      <path d={hex ? HEX_IN : INNER} fill={`url(#${id}f)`} stroke="#ffffff88" strokeWidth=".8" />
      <path d={hex ? "M14 21 L32 10.5 L50 21" : "M16.5 17 L32 11 L47.5 17"} fill="none" stroke="#fff" strokeWidth="1.2" opacity=".55" strokeLinecap="round" />
      {look.front?.(id)}
    </svg>
  );
}
