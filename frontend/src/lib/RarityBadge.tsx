import { useId } from "react";
import Picture from "./Pictures";

/**
 * A shop picture inside a badge ring whose material shows its rarity:
 * common = wood, rare = icy silver, epic = gold, legendary = crystal with shards.
 * Locked pictures are dimmed behind a padlock plate set into the bottom of the ring.
 * View box -60..60; the picture is a circle of radius 34 in the middle.
 */
type Rarity = "common" | "rare" | "epic" | "legendary";
interface Mat { ring: string[]; edge: string; inner: string; hi: string; plate: string[]; lockInk: string; grain?: string }
const MATS: Record<Rarity, Mat> = {
  common: { ring: ["#d08a50", "#a55e2c", "#c47a42", "#8a4a20"], edge: "#5a2e12", inner: "#6e3a18", hi: "#f0b880", grain: "#7a4018",
    plate: ["#b06a36", "#7a4018"], lockInk: "#4a2208" },
  rare: { ring: ["#ffffff", "#d6f0f6", "#a8d8e4", "#eafaff"], edge: "#5e94a4", inner: "#7aaab8", hi: "#ffffff",
    plate: ["#e4f6fa", "#9ccad8"], lockInk: "#4a7a8a" },
  epic: { ring: ["#fff0a0", "#ffc020", "#f09a00", "#ffd84a"], edge: "#8a4a00", inner: "#b06a00", hi: "#fff8d0",
    plate: ["#ffd24a", "#d07a00"], lockInk: "#7a3a00" },
  legendary: { ring: ["#ffffff", "#c8f0ff", "#8ad4f0", "#e8f8ff"], edge: "#4a8ab0", inner: "#5aa0c8", hi: "#ffffff",
    plate: ["#e8faff", "#8ac8e8"], lockInk: "#3a7aa0" },
};
const R = 43; // middle of the ring
const W = 15; // ring width

function Shard({ d, id }: { d: string; id: string }) {
  return <g>
    <path d={d} fill={`url(#${id}-cr)`} stroke="#4a8ab0" strokeWidth="1.3" strokeLinejoin="round" />
    <path d={d} fill="#fff" opacity=".25" transform="translate(-1 -1) scale(.98)" />
  </g>;
}

export default function RarityBadge({ pic, rarity = "common", locked = false, size = 84 }: { pic: string; rarity?: string; locked?: boolean; size?: number }) {
  const r = (rarity in MATS ? rarity : "common") as Rarity;
  const m = MATS[r];
  const id = `rb${useId().replace(/:/g, "")}`;
  const crystal = r === "legendary";
  return (
    <span className={`rb rb-${r}${locked ? " locked" : ""}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="-60 -60 120 120" width="100%" height="100%">
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
            {m.ring.map((c, i) => <stop key={i} offset={i / (m.ring.length - 1)} stopColor={c} />)}
          </linearGradient>
          <linearGradient id={`${id}-pl`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={m.plate[0]} /><stop offset="1" stopColor={m.plate[1]} /></linearGradient>
          <linearGradient id={`${id}-cr`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" /><stop offset=".35" stopColor="#c8f0ff" /><stop offset=".7" stopColor="#8ad0f0" /><stop offset="1" stopColor="#f0c8ff" />
          </linearGradient>
          <clipPath id={`${id}-clip`}><circle r={R - W / 2 + 0.5} /></clipPath>
        </defs>
        {crystal && <g className="rb-shards">
          {/* top crown crystal */}
          <Shard id={id} d="M0 -70 L13 -52 L0 -40 L-13 -52Z" />
          <path d="M0 -70 L0 -40 L-13 -52Z" fill="#ffd6f4" opacity=".55" />
          <Shard id={id} d="M-16 -62 L-8 -50 L-16 -42 L-22 -52Z" />
          <Shard id={id} d="M16 -62 L22 -52 L16 -42 L8 -50Z" />
          {/* side clusters */}
          {[1, -1].map((sx) => <g key={sx} transform={`scale(${sx} 1)`}>
            <Shard id={id} d="M-70 -8 L-50 -18 L-42 2 L-58 10Z" />
            <path d="M-70 -8 L-42 2 L-58 10Z" fill="#ffd6f4" opacity=".6" />
            <Shard id={id} d="M-66 24 L-48 8 L-38 28 L-52 40Z" />
            <path d="M-66 24 L-38 28 L-52 40Z" fill="#f0c0ff" opacity=".5" />
            <Shard id={id} d="M-50 -40 L-36 -48 L-32 -32Z" />
          </g>)}
        </g>}
        {/* the picture */}
        <g clipPath={`url(#${id}-clip)`}>
          <foreignObject x={-(R - W / 2)} y={-(R - W / 2)} width={(R - W / 2) * 2} height={(R - W / 2) * 2}>
            <div className="rb-pic"><Picture name={pic} /></div>
          </foreignObject>
          {locked && <circle r={R} fill={m.inner} opacity=".45" />}
          <circle r={R - W / 2} fill="none" stroke="#0006" strokeWidth="3" />
        </g>
        {/* the ring */}
        <circle r={R} fill="none" stroke={`url(#${id}-ring)`} strokeWidth={W} />
        {m.grain && <g stroke={m.grain} strokeWidth="1.2" fill="none" opacity=".55" strokeLinecap="round">
          <path d={`M${-R + 4} -14 A${R} ${R} 0 0 1 -22 ${-R + 6}`} /><path d={`M20 ${-R - 3} A${R + 2} ${R + 2} 0 0 1 ${R + 1} 6`} />
          <path d={`M${R - 2} 20 A${R} ${R} 0 0 1 28 ${R - 6}`} /><path d={`M-30 ${R - 4} A${R} ${R} 0 0 1 ${-R - 1} 12`} />
          <path d="M-50 -2 l5 2 M47 -22 l-4 3 M8 49 l1 -4" />
        </g>}
        <circle r={R + W / 2} fill="none" stroke={m.edge} strokeWidth="2.2" />
        <circle r={R - W / 2} fill="none" stroke={m.edge} strokeWidth="1.6" opacity=".8" />
        <path d={`M${-R * 0.72} ${-R * 0.66} A${R + 3} ${R + 3} 0 0 1 ${R * 0.4} ${-R * 0.9}`} fill="none" stroke={m.hi} strokeWidth="3" strokeLinecap="round" opacity=".8" />
        {crystal && <path className="rb-glint" d="M-30 -38 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#fff" />}
        {/* padlock plate */}
        {locked && <g transform={`translate(0 ${R + 3}) scale(1.3)`}>
          <path d="M0 -15 L15 0 L0 15 L-15 0Z" fill={`url(#${id}-pl)`} stroke={m.edge} strokeWidth="2" strokeLinejoin="round" />
          <path d="M0 -11 L11 0 L0 11 L-11 0Z" fill="none" stroke={m.hi} strokeWidth="1" opacity=".6" />
          <path d="M-3.6 -2 v-3 a3.6 3.6 0 0 1 7.2 0 v3" fill="none" stroke={m.lockInk} strokeWidth="2" />
          <rect x="-5.4" y="-2.4" width="10.8" height="8.4" rx="1.6" fill={m.lockInk} />
          <circle cy="1.2" r="1.3" fill={m.plate[0]} /><rect x="-.6" y="1.6" width="1.2" height="2.6" fill={m.plate[0]} />
        </g>}
      </svg>
    </span>
  );
}
