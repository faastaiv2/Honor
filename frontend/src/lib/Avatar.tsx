import { useId, type ReactNode } from "react";
import Picture, { isPicture } from "./Pictures";

/**
 * A member's picture (their emoji, or a person silhouette) inside the frame they chose. Never initials.
 *
 * Frames are game-style crests drawn in SVG: a metallic ring plus ornaments for each rank, and animated
 * frames from the shop. The SVG reaches a little past the picture so crowns, wings and flames can stick out.
 * Units: the picture is a circle of radius 41 at the centre of a 120 × 120 view box.
 */

const R = 45; // middle of the ring
const W = 8; // ring width

const polar = (r: number, deg: number): [number, number] => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];

function Rivets({ n, r = R, fill, size = 2.2 }: { n: number; r?: number; fill: string; size?: number }) {
  return <g>{Array.from({ length: n }, (_, i) => { const [x, y] = polar(r, (360 / n) * i - 90); return <circle key={i} cx={x} cy={y} r={size} fill={fill} stroke="#0005" strokeWidth=".6" />; })}</g>;
}

/** Laurel leaves up both sides from the bottom. */
function Laurel({ fill, from = 100, to = 230, n = 7 }: { fill: string; from?: number; to?: number; n?: number }) {
  const leaves: ReactNode[] = [];
  for (const side of [1, -1]) for (let i = 0; i < n; i++) {
    const a = from + ((to - from) / (n - 1)) * i;
    const ang = side === 1 ? a : 180 - a;
    const [x, y] = polar(R + 7, ang);
    const rot = ang + (side === 1 ? 90 : -90) + side * 28;
    leaves.push(<ellipse key={`${side}${i}`} cx={x} cy={y} rx="6.4" ry="2.6" transform={`rotate(${rot} ${x} ${y})`} fill={fill} stroke="#0004" strokeWidth=".5" />);
  }
  return <g>{leaves}</g>;
}

function Spikes({ n, len, fill, start = -90, width = 6, base = R + W / 2 - 1 }: { n: number; len: number; fill: string; start?: number; width?: number; base?: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const a = start + (360 / n) * i;
        const [x1, y1] = polar(base, a - width), [x2, y2] = polar(base, a + width), [tx, ty] = polar(base + len, a);
        return <polygon key={i} points={`${x1},${y1} ${tx},${ty} ${x2},${y2}`} fill={fill} stroke="#0004" strokeWidth=".5" />;
      })}
    </g>
  );
}

function Gem({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <polygon points={`0,${-s} ${s * 0.75},0 0,${s} ${-s * 0.75},0`} fill={fill} stroke="#fff" strokeWidth="1.1" />
      <polygon points={`0,${-s} ${s * 0.75},0 0,0`} fill="#fff" opacity=".45" />
    </g>
  );
}

function Crown({ y = -52, scale = 1, fill, gem }: { y?: number; scale?: number; fill: string; gem: string }) {
  return (
    <g transform={`translate(0 ${y}) scale(${scale})`}>
      <path d="M-15 6 L-17 -9 L-8 -1 L0 -13 L8 -1 L17 -9 L15 6 Z" fill={fill} stroke="#7a5a00" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="-17" cy="-9" r="2.2" fill={fill} stroke="#7a5a00" strokeWidth=".8" />
      <circle cx="0" cy="-13" r="2.4" fill={fill} stroke="#7a5a00" strokeWidth=".8" />
      <circle cx="17" cy="-9" r="2.2" fill={fill} stroke="#7a5a00" strokeWidth=".8" />
      <rect x="-15" y="2" width="30" height="4.5" rx="1" fill="#7a5a00" opacity=".35" />
      <Gem x={0} y={0} s={3.4} fill={gem} />
    </g>
  );
}

function Flames({ n, from, to, fill, inner, len = 14 }: { n: number; from: number; to: number; fill: string; inner: string; len?: number }) {
  return (
    <g className="fx-flicker">
      {Array.from({ length: n }, (_, i) => {
        const a = from + ((to - from) / Math.max(1, n - 1)) * i;
        const l = len * (0.75 + 0.25 * Math.sin(i * 2.1) ** 2);
        return (
          <g key={i} transform={`rotate(${a + 90}) translate(0 ${-(R + 2)})`}>
            <path d={`M-5 0 C-6 ${-l * 0.5} -1 ${-l * 0.7} 0 ${-l} C1 ${-l * 0.7} 6 ${-l * 0.5} 5 0 Z`} fill={fill} />
            <path d={`M-2.6 0 C-3 ${-l * 0.35} -0.5 ${-l * 0.45} 0 ${-l * 0.62} C0.5 ${-l * 0.45} 3 ${-l * 0.35} 2.6 0 Z`} fill={inner} />
          </g>
        );
      })}
    </g>
  );
}

function Twinkles({ pts, fill }: { pts: [number, number, number][]; fill: string }) {
  return (
    <g>
      {pts.map(([x, y, s], i) => (
        <path key={i} className="fx-twinkle" style={{ animationDelay: `${i * 0.45}s` }}
          d={`M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z`} fill={fill} />
      ))}
    </g>
  );
}

/** A ring split into coloured arcs (rainbow, diamond facets). */
function Segments({ colors, r = R, w = W }: { colors: string[]; r?: number; w?: number }) {
  const n = colors.length, step = 360 / n;
  return (
    <g>
      {colors.map((c, i) => {
        const [x1, y1] = polar(r, i * step - 90), [x2, y2] = polar(r, (i + 1) * step - 90 + 0.6);
        return <path key={i} d={`M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`} stroke={c} strokeWidth={w} fill="none" />;
      })}
    </g>
  );
}

interface Art { ring?: string[]; glow?: string; back?: (id: string) => ReactNode; front?: (id: string) => ReactNode; ringNode?: ReactNode }

const GOLD = ["#8a6100", "#ffe9a0", "#c9962b", "#fff6d0", "#a87a1e"];

const ART: Record<string, Art> = {
  bronze: { ring: ["#5e3512", "#e9a865", "#8a5a2b", "#f3c590", "#6e4018"], front: () => <Rivets n={8} fill="#f3c590" /> },
  silver: { ring: ["#69747f", "#ffffff", "#9aa6b2", "#f4f6f8", "#7d8a96"], back: () => <Laurel fill="#dfe6ee" />, front: () => <Rivets n={4} fill="#fff" size={1.8} /> },
  gold: {
    ring: GOLD, glow: "#f1c34a",
    back: () => <Laurel fill="#e7b93a" n={8} from={95} to={250} />,
    front: () => <><Gem x={0} y={-R} s={5.5} fill="#ffcf3a" /><Rivets n={8} fill="#fff6d0" size={1.4} /></>,
  },
  platinum: {
    ring: ["#5f9eb0", "#ffffff", "#9fd3e0", "#e8f6fa", "#6fa8b8"], glow: "#9fd3e0",
    back: () => <><Spikes n={12} len={10} fill="#e8f6fa" width={5} /><Spikes n={12} len={6} fill="#9fd3e0" width={4} start={-75} /></>,
  },
  emerald: {
    ring: ["#0b4a3a", "#7fe0b0", "#1e9e6a", "#c8f5df", "#0f6b47"], glow: "#2fd38a",
    back: () => <><Laurel fill="#2fa37f" n={8} from={100} to={265} /></>,
    front: () => <><Gem x={0} y={-R} s={6} fill="#22c27e" /><Gem x={-R} y={0} s={3.6} fill="#22c27e" /><Gem x={R} y={0} s={3.6} fill="#22c27e" /></>,
  },
  sapphire: {
    ring: ["#0e2a6a", "#8ab4ff", "#1f5fbf", "#dbe8ff", "#133a8a"], glow: "#4d8fe0",
    back: () => <g>{Array.from({ length: 16 }, (_, i) => { const [x, y] = polar(R + 5, i * 22.5); return <circle key={i} cx={x} cy={y} r="3.4" fill="#2c6fd6" stroke="#dbe8ff" strokeWidth=".8" />; })}</g>,
    front: () => <>{[-90, 0, 90, 180].map((a) => { const [x, y] = polar(R, a); return <Gem key={a} x={x} y={y} s={5} fill="#2f7bff" />; })}</>,
  },
  ruby: {
    ring: ["#4e0a20", "#ff8fa8", "#c0294a", "#ffd0da", "#6e1230"], glow: "#ff3d5a",
    back: () => <Flames n={9} from={-170} to={-10} fill="#ff5a36" inner="#ffd26b" />,
    front: () => <><Gem x={0} y={-R} s={6} fill="#e3214a" /><Rivets n={10} fill="#ffd0da" size={1.3} /></>,
  },
  diamond: {
    glow: "#b9e6ff",
    ringNode: <Segments colors={["#b9f2ff", "#ffffff", "#c9e7ff", "#f0d9ff", "#ffffff", "#b9f2ff", "#e9d6ff", "#ffffff", "#c9e7ff", "#f0d9ff", "#ffffff", "#ffe9a8"]} />,
    back: () => <Spikes n={8} len={9} fill="#e6f8ff" width={7} start={-67.5} />,
    front: () => <><Gem x={0} y={-R - 2} s={8} fill="#9fe6ff" /><Twinkles pts={[[-38, -40, 6], [40, -30, 5], [44, 32, 6], [-42, 30, 5]]} fill="#fff" /></>,
  },
  obsidian: {
    ring: ["#0a0612", "#7d5fd0", "#1a1426", "#b69cff", "#120c1c"], glow: "#9b6bff",
    back: () => <><g className="fx-spin-slow"><circle r={R + 10} fill="none" stroke="#b69cff" strokeWidth="1.4" strokeDasharray="1 5 6 5" opacity=".9" /></g>
      <Spikes n={8} len={13} fill="#1a1426" width={5} /><Spikes n={8} len={7} fill="#7d5fd0" width={4} start={-67.5} /></>,
    front: () => <Gem x={0} y={-R} s={6} fill="#6a3fd0" />,
  },
  // The shame ring: rusted iron, wrapped in chains, held shut with a padlock. Locked on while on the Pillar of Shame.
  shame: {
    ring: ["#1a1a1e", "#6a6a72", "#2a2a30", "#8a8a92", "#141418"], glow: "#c0141e",
    back: () => (
      <g>
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i * 360) / 16;
          return <ellipse key={i} rx="4.6" ry="2.6" fill="none" stroke={i % 2 ? "#8a8a92" : "#5a5a62"} strokeWidth="1.8"
            transform={`rotate(${a}) translate(0 ${-(R + 5)}) rotate(${i % 2 ? 0 : 90})`} />;
        })}
      </g>
    ),
    front: () => (
      <g transform={`translate(0 ${R + 2})`}>
        <path d="M-5 -2 V-7 A5 5 0 0 1 5 -7 V-2" fill="none" stroke="#9a9aa2" strokeWidth="2.2" />
        <rect x="-8" y="-3" width="16" height="13" rx="2.5" fill="#4a4a52" stroke="#1a1a1e" strokeWidth="1" />
        <circle cx="0" cy="2.5" r="1.8" fill="#c0141e" /><path d="M-0.8 3 L0 7 L0.8 3 Z" fill="#c0141e" />
      </g>
    ),
  },
  crown: {
    ring: GOLD, glow: "#ffd24a",
    back: (id) => <>
      {[1, -1].map((s) => <g key={s} transform={`scale(${s} 1)`}>
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${R + 2} ${-6 + i * 7} q${16 - i * 2} ${-10 + i * 2} ${22 - i * 3} ${-4 + i * 4} q-10 ${4} -${20 - i * 3} ${8}z`} fill={`url(#${id}-ring)`} stroke="#7a5a00" strokeWidth=".7" />)}
      </g>)}
    </>,
    front: () => <><Crown fill="#ffd24a" gem="#e3214a" y={-50} scale={1.15} /><Twinkles pts={[[-44, -36, 5], [46, 34, 5]]} fill="#fff8d6" /></>,
  },
  star: {
    ring: GOLD, glow: "#ffe58a",
    back: () => <g className="fx-spin">{Array.from({ length: 6 }, (_, i) => { const [x, y] = polar(R + 9, i * 60); return <Twinkles key={i} pts={[[x, y, 6]]} fill="#ffe58a" />; })}</g>,
  },
  ribbon: {
    ring: ["#0a5a62", "#7fe0e8", "#0d7680", "#c8f5f7", "#0a5a62"],
    front: () => <g transform="translate(0 46)">
      <path d="M-40 -4 L-52 4 L-44 7 L-52 12 L-34 10 Z" fill="#0b5f67" /><path d="M40 -4 L52 4 L44 7 L52 12 L34 10 Z" fill="#0b5f67" />
      <path d="M-38 -7 Q0 3 38 -7 L36 5 Q0 15 -36 5 Z" fill="#14a3ad" stroke="#c8f5f7" strokeWidth="1" />
      <Twinkles pts={[[0, 2, 3.5]]} fill="#fff" />
    </g>,
  },
  sun: {
    ring: ["#c96f00", "#ffe08a", "#ff9f1a", "#fff2c0", "#d97a00"], glow: "#ffb02e",
    back: () => <g className="fx-spin"><Spikes n={16} len={10} fill="#ffc23a" width={5} /><Spikes n={16} len={6} fill="#ff8a00" width={4} start={-78.75} /></g>,
  },
  rainbow: {
    glow: "#ff9bf0",
    ringNode: <g className="fx-spin"><Segments colors={["#ff5e5e", "#ffb84d", "#ffe94d", "#5ee07a", "#4dc3ff", "#8a6bff", "#ff5ec8"]} /></g>,
    front: () => <Twinkles pts={[[-40, -38, 5], [42, -36, 4], [0, 52, 4]]} fill="#fff" />,
  },
  fire: {
    ring: ["#7a1500", "#ffb347", "#ff3d00", "#ffe08a", "#a32100"], glow: "#ff6d00",
    back: () => <><Flames n={14} from={-180} to={0} fill="#ff3d00" inner="#ffd54f" len={18} /><Flames n={10} from={20} to={160} fill="#ff6d00" inner="#ffd54f" len={8} /></>,
  },
  galaxy: {
    ring: ["#1b1040", "#b69cff", "#6a2c91", "#7fb0ff", "#1f1050"], glow: "#8a6bff",
    back: () => <>
      <g className="fx-spin"><ellipse rx={R + 12} ry={R - 12} fill="none" stroke="#b69cff" strokeWidth="1.5" strokeDasharray="2 4" transform="rotate(-25)" />
        <circle cx={R + 8} cy={-14} r="3" fill="#7fb0ff" /><circle cx={-R - 8} cy={14} r="2.2" fill="#ff9bf0" /></g>
      <Twinkles pts={[[-36, -44, 5], [44, -24, 4], [30, 46, 5], [-48, 22, 4]]} fill="#fff" />
    </>,
  },
  // ---- Newer frames: richer animations ----
  blossom: {
    ring: ["#c2185b", "#ffd1e3", "#f06292", "#fff0f6", "#ad1457"], glow: "#ff8ab8",
    back: () => <>
      <g className="fx-spin-slow">{Array.from({ length: 12 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 30}) translate(0 ${-(R + 7)})`}>
          {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cy="-3" rx="2.4" ry="3.6" fill={i % 2 ? "#ffc1d9" : "#fff0f6"} transform={`rotate(${a})`} />)}
          <circle r="1.4" fill="#ffd24a" />
        </g>
      ))}</g>
      {[[-30, -52], [10, -58], [40, -50], [-50, -20], [52, -10]].map(([x, y], i) => (
        <ellipse key={i} className="fx-fall" style={{ animationDelay: `${i * 0.9}s` }} cx={x} cy={y} rx="2.6" ry="1.6" fill="#ff9ac2" />
      ))}
    </>,
  },
  waves: {
    ring: ["#0b3a7a", "#7fe3ff", "#1a8ad8", "#e0faff", "#0a4a8a"], glow: "#3ac8ff",
    back: () => <>
      <g className="fx-spin"><path d={Array.from({ length: 24 }, (_, i) => {
        const [x, y] = polar(R + 6 + (i % 2 ? 3 : -1), i * 15);
        return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(" ") + "Z"} fill="none" stroke="#7fe3ff" strokeWidth="2.4" strokeLinejoin="round" opacity=".9" /></g>
      {[[-22, 40], [0, 44], [24, 40], [-36, 30], [36, 30]].map(([x, y], i) => (
        <circle key={i} className="fx-rise" style={{ animationDelay: `${i * 0.7}s` }} cx={x} cy={y} r={1.6 + (i % 3)} fill="none" stroke="#e0faff" strokeWidth="1" />
      ))}
    </>,
  },
  aurora: {
    ring: ["#10305a", "#3affb0", "#2a8aff", "#c88aff", "#10305a"], glow: "#3affb0",
    back: () => <>
      <g className="fx-hue">
        <path d={`M${-R - 10} -10 Q-30 ${-R - 24} 0 ${-R - 12} T${R + 10} -10`} stroke="#3affb0" strokeWidth="6" fill="none" opacity=".55" strokeLinecap="round" />
        <path d={`M${-R - 6} -2 Q-24 ${-R - 14} 4 ${-R - 4} T${R + 6} -2`} stroke="#8a6aff" strokeWidth="4" fill="none" opacity=".55" strokeLinecap="round" />
      </g>
      <Twinkles pts={[[-40, -40, 4], [38, -42, 3.4], [50, 20, 4], [-52, 18, 3]]} fill="#e0fff4" />
    </>,
  },
  thunder: {
    ring: ["#1a1f3a", "#9adfff", "#3a4a8a", "#e8f8ff", "#141a30"], glow: "#7ad8ff",
    back: () => <>
      {[-60, 20, 140, 220, 300].map((a, i) => (
        <g key={a} transform={`rotate(${a})`}>
          <path className="fx-zap" style={{ animationDelay: `${i * 0.37}s` }} d={`M0 ${-(R + 3)} l-4 -7 5 0 -4 -8`} stroke="#e8f8ff" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
        </g>
      ))}
      <g className="fx-spin-slow"><circle r={R + 8} fill="none" stroke="#7ad8ff" strokeWidth="1" strokeDasharray="1 7" opacity=".8" /></g>
    </>,
    front: () => <path d="M2 -52 l-6 9 h5 l-4 8 9 -11 h-5 l4 -6z" fill="#ffe14a" stroke="#a07a00" strokeWidth=".8" />,
  },
  royalgems: {
    ring: GOLD, glow: "#ffd24a",
    back: () => <g className="fx-spin"><path d={`M${R + 2} 0 A${R + 2} ${R + 2} 0 0 1 0 ${R + 2}`} stroke="#fff" strokeWidth="3" fill="none" opacity=".7" strokeLinecap="round" /></g>,
    front: () => <>
      {["#e3214a", "#2f7bff", "#22c27e", "#b05aff", "#e3214a", "#2f7bff", "#22c27e", "#b05aff"].map((c, i) => {
        const [x, y] = polar(R, i * 45 - 90);
        return <Gem key={i} x={x} y={y} s={i % 2 ? 3.2 : 4.2} fill={c} />;
      })}
      <Twinkles pts={[[-34, -34, 3.4], [34, 34, 3.4], [36, -36, 2.6]]} fill="#fff" />
    </>,
  },
  godfather: {
    ring: ["#000", "#2a2622", "#050505", "#1c1a18", "#000"], glow: "#d4a017",
    back: () => <>
      <circle r={R + 7} fill="none" stroke="#c9962b" strokeWidth=".8" opacity=".7" />
      <Twinkles pts={[[-44, -40, 3], [46, -34, 2.6], [44, 40, 2.8], [-46, 36, 2.4]]} fill="#fff4c8" />
    </>,
    ringNode: <g>
      <circle r={R} fill="none" stroke="#0a0a0a" strokeWidth={W + 2} />
      {/* Greek key band all the way round */}
      <g fill="none" stroke="#e6c25a" strokeWidth=".95" strokeLinejoin="miter" strokeLinecap="square">
        {Array.from({ length: 20 }, (_, i) => (
          <path key={i} transform={`rotate(${i * 18})`}
            d={`M-7 ${-R + 3.6} H7 M-5.2 ${-R + 3.6} V${-R - 3.2} H4.6 V${-R + 1.6} H-2.4 V${-R - 1} H1.8`} />
        ))}
      </g>
      <circle r={R + W / 2 + 0.6} fill="none" stroke="#f4d36a" strokeWidth="1.4" />
      <circle r={R - W / 2 - 0.6} fill="none" stroke="#f4d36a" strokeWidth="1.4" />
      {/* a slow gloss sweeping round the gold */}
      <g className="fx-spin"><path d={`M${R} 0 A${R} ${R} 0 0 1 ${R * 0.5} ${R * 0.87}`} stroke="#fff8e0" strokeWidth="2.2" fill="none" opacity=".35" strokeLinecap="round" /></g>
    </g>,
    front: () => <>
      {/* onyx studs in gold settings */}
      {[45, 135, 225, 315, 0, 180].map((a) => { const [x, y] = polar(R, a); return <g key={a}>
        <circle cx={x} cy={y} r="4.4" fill="#e6c25a" stroke="#7a5400" strokeWidth=".6" />
        <circle cx={x} cy={y} r="2.6" fill="#0a0a0a" /><circle cx={x - .8} cy={y - .8} r=".8" fill="#fff" opacity=".7" />
      </g>; })}
      {/* baroque scrolls either side of the crest */}
      {[1, -1].map((sx) => <g key={sx} transform={`scale(${sx} 1)`} fill="none" stroke="#f0c850" strokeWidth="1.6" strokeLinecap="round">
        <path d="M11 -49 C18 -58 30 -56 31 -49 C32 -44 26 -42 24 -46 C23 -49 27 -50 27 -48" />
        <path d="M11 -45 C16 -42 20 -40 26 -41" strokeWidth="1.1" />
      </g>)}
      {/* bottom ornament: gold scroll pair with an onyx drop */}
      {[1, -1].map((sx) => <path key={sx} transform={`scale(${sx} 1)`} d="M3 48 C8 56 18 56 19 50 C20 46 15 45 14 48" fill="none" stroke="#f0c850" strokeWidth="1.6" strokeLinecap="round" />)}
      <path d="M0 43 L5 49 L0 57 L-5 49Z" fill="#0a0a0a" stroke="#f0c850" strokeWidth="1.3" strokeLinejoin="round" />
      {/* the crest: scalloped gold medallion */}
      <g transform={`translate(0 ${-R - 2})`}>
        {Array.from({ length: 16 }, (_, i) => { const [x, y] = polar(10.5, i * 22.5); return <circle key={i} cx={x} cy={y} r="2.4" fill="#e6c25a" stroke="#7a5400" strokeWidth=".4" />; })}
        <circle r="10.5" fill="#f4d36a" stroke="#7a5400" strokeWidth=".6" />
        <circle r="8" fill="#0a0a0a" />
        <circle r="6.6" fill="none" stroke="#e6c25a" strokeWidth=".6" strokeDasharray="1.2 1" />
        <text y="3.6" textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="'Didot', 'Bodoni 72', Georgia, serif" fill="#f4d36a">G</text>
      </g>
    </>,
  },
  orbit: {
    ring: ["#0a0a2a", "#ffb347", "#2a1a5a", "#7fb0ff", "#0a0a2a"], glow: "#ffb347",
    back: () => <>
      <circle r={R + 9} fill="none" stroke="#ffffff33" strokeWidth=".8" />
      <circle r={R + 15} fill="none" stroke="#ffffff22" strokeWidth=".8" />
      <g className="fx-orbit-a"><circle cx={R + 9} cy="0" r="3.2" fill="#7fb0ff" /></g>
      <g className="fx-orbit-b"><circle cx={-(R + 15)} cy="0" r="4.2" fill="#ff8a5a" /><ellipse cx={-(R + 15)} cy="0" rx="7" ry="1.6" fill="none" stroke="#ffd0b0" strokeWidth=".8" /></g>
      <g className="fx-orbit-c"><circle cx="0" cy={R + 9} r="2.4" fill="#7aff8a" /></g>
      <Twinkles pts={[[-50, -40, 3], [48, 44, 3], [-44, 46, 2.4]]} fill="#fff" />
    </>,
    front: () => <circle cx="0" cy={-R} r="5" fill="#ffd24a" stroke="#ff8a1a" strokeWidth="1.4" className="fx-pulse" />,
  },
};

export const FRAME_ART_KEYS = Object.keys(ART);

function FrameArt({ frame }: { frame: string }) {
  const art = ART[frame];
  const uid = useId().replace(/:/g, "");
  if (!art) return null;
  const id = `fx${uid}`;
  const ring = art.ring;
  return (
    <svg className="fx-svg" viewBox="-60 -60 120 120" aria-hidden="true">
      <defs>
        {ring && (
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
            {ring.map((c, i) => <stop key={i} offset={i / (ring.length - 1)} stopColor={c} />)}
          </linearGradient>
        )}
        {art.glow && <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" /></filter>}
      </defs>
      {art.glow && <circle r={R} fill="none" stroke={art.glow} strokeWidth={W + 4} filter={`url(#${id}-glow)`} opacity=".75" className="fx-pulse" />}
      {art.back?.(id)}
      {art.ringNode ?? <circle r={R} fill="none" stroke={`url(#${id}-ring)`} strokeWidth={W} />}
      <circle r={R + W / 2} fill="none" stroke="#0006" strokeWidth=".8" />
      <circle r={R - W / 2 + 0.6} fill="none" stroke="#fff" strokeWidth="1" opacity=".75" />
      <path d={`M${-R * 0.7} ${-R * 0.7} A${R} ${R} 0 0 1 ${R * 0.7} ${-R * 0.7}`} fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
      {art.front?.(id)}
    </svg>
  );
}

export default function Avatar({ avatar, color, frame, size = 48 }: { avatar?: string; color: string; frame?: string; size?: number }) {
  const framed = !!frame && frame !== "plain" && frame in ART;
  const drawn = isPicture(avatar);
  const light = /^#f{3}(f{3})?$/i.test(color); // a white rank colour: draw the silhouette in grey so it shows
  const tile = (
    <span className={`avatar${framed ? " in-frame" : ""}${drawn ? " drawn" : ""}`} style={{ width: size, height: size, background: avatar ? `color-mix(in srgb, ${color} 18%, #fff)` : color, fontSize: size * 0.55, ...(light ? { boxShadow: "inset 0 0 0 1.5px #dde2e8" } : {}) }} aria-hidden="true">
      {drawn ? <Picture name={avatar!} /> : avatar || (
        <svg viewBox="0 0 40 40" width="78%" height="78%">
          <circle cx="20" cy="14" r="8" fill={light ? "#b4bcc6" : "#fff"} />
          <path d="M5 40c0-9 6.7-15 15-15s15 6 15 15z" fill={light ? "#b4bcc6" : "#fff"} />
        </svg>
      )}
    </span>
  );
  if (!framed) return tile;
  // The box is the ring's outer edge; ornaments (crowns, wings, flames) reach a little beyond it.
  const box = Math.round(size * (R + W / 2) / 41);
  return (
    <span className={`fx fx-${frame}`} style={{ width: box, height: box }}>
      {tile}
      <FrameArt frame={frame!} />
    </span>
  );
}
