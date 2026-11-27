import { useId, type ReactNode } from "react";

/**
 * Drawn profile pictures: front-facing characters in one flat cartoon style, each on its own coloured backdrop.
 * View box 0 0 100 100. Keys are what the server stores (see app/tiers.py PICTURES).
 */

type Draw = (id: string) => ReactNode;
interface Pic { bg: [string, string]; draw: Draw }

/** Big friendly eyes with a shine. */
const Eyes = ({ y, dx = 11, r = 4.6, color = "#2a1a10", cx = 50 }: { y: number; dx?: number; r?: number; color?: string; cx?: number }) => (
  <g>
    {[cx - dx, cx + dx].map((x) => (
      <g key={x}><circle cx={x} cy={y} r={r} fill={color} /><circle cx={x + r * 0.35} cy={y - r * 0.35} r={r * 0.38} fill="#fff" /></g>
    ))}
  </g>
);
const Cheeks = ({ y, dx = 19, color = "#ff8a8a" }: { y: number; dx?: number; color?: string }) => (
  <g opacity=".45">{[50 - dx, 50 + dx].map((x) => <ellipse key={x} cx={x} cy={y} rx="5" ry="3" fill={color} />)}</g>
);
const Smile = ({ y, w = 6, color = "#2a1a10" }: { y: number; w?: number; color?: string }) => (
  <path d={`M${50 - w} ${y} Q50 ${y + w * 0.9} ${50 + w} ${y}`} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
);
const Body = ({ fill, y = 86 }: { fill: string; y?: number }) => <ellipse cx="50" cy={y + 18} rx="34" ry="24" fill={fill} />;

/** A macaw on a branch, in its own colours (body, wing top, wing bottom, tail, face lines). */
type MacawColors = { body: [string, string]; wingTop: string; wingBottom: string; tail: string; tailMid: string; crest: string; lines: string };
const macaw = (c: MacawColors): Draw => (id) => <>
    <defs>
      <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.body[0]} /><stop offset="1" stopColor={c.body[1]} /></linearGradient>
      <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.wingTop} /><stop offset=".35" stopColor={c.wingTop} /><stop offset=".4" stopColor={c.wingBottom} /><stop offset="1" stopColor={c.tail} /></linearGradient>
    </defs>
    {/* jungle leaves behind */}
    <path d="M0 30 Q18 22 26 40 Q12 40 0 46Z M100 22 Q80 18 74 36 Q88 34 100 40Z M0 70 Q14 60 24 76 Q10 78 0 84Z" fill="#1e8a4a" opacity=".8" />
    {/* the branch it sits on */}
    <path d="M4 92 Q50 84 96 94" stroke="#7a4a22" strokeWidth="7" fill="none" strokeLinecap="round" />
    {/* long tail feathers */}
    <path d="M44 84 L38 104 M50 86 L50 106 M56 84 L62 104" stroke={c.tail} strokeWidth="6" strokeLinecap="round" />
    <path d="M50 86 L50 106" stroke={c.tailMid} strokeWidth="4" strokeLinecap="round" />
    {/* wings */}
    <path d="M30 50 Q16 66 26 88 Q36 84 40 70Z" fill={`url(#${id}w)`} stroke="#123a5a" strokeWidth="1" />
    <path d="M70 50 Q84 66 74 88 Q64 84 60 70Z" fill={`url(#${id}w)`} stroke="#123a5a" strokeWidth="1" />
    {/* body and head */}
    <ellipse cx="50" cy="66" rx="20" ry="22" fill={`url(#${id}r)`} />
    <circle cx="50" cy="40" r="20" fill={`url(#${id}r)`} />
    <path d="M42 22 Q46 12 52 14 Q48 18 50 22Z" fill={c.crest} />
    {/* white face patches with tiny feather lines */}
    <path d="M32 40 Q34 30 44 32 Q46 42 40 48 Q34 48 32 40Z M68 40 Q66 30 56 32 Q54 42 60 48 Q66 48 68 40Z" fill="#fff" />
    <path d="M35 38 h5 M36 42 h5 M65 38 h-5 M64 42 h-5" stroke={c.lines} strokeWidth="1" />
    {[41, 59].map((x) => <g key={x}><circle cx={x} cy="38" r="4.4" fill="#fffbe0" stroke="#2a1a10" strokeWidth="1" /><circle cx={x} cy="38" r="2.6" fill="#1a1a1a" /><circle cx={x + 1} cy="37" r="1" fill="#fff" /></g>)}
    {/* the big curved beak */}
    <path d="M44 46 Q50 42 56 46 Q58 58 50 64 Q48 58 50 54 Q46 52 44 46Z" fill="#f4ead8" stroke="#8a7a60" strokeWidth="1" />
    <path d="M46 52 Q50 56 54 52 Q52 60 50 60 Q48 58 46 52Z" fill="#2a2a2a" />
    {/* little feet on the branch */}
    <path d="M44 86 q-2 4 -5 4 M44 86 q0 4 2 5 M56 86 q2 4 5 4 M56 86 q0 4 -2 5" stroke="#5a5a5a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <Cheeks y={50} dx={14} color="#ff9ab0" />
  </>;

const PICS: Record<string, Pic> = {
  lion: { bg: ["#ffe9a8", "#f0a830"], draw: () => <>
    <Body fill="#d98a2b" />
    {Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return <circle key={i} cx={50 + Math.cos(a) * 27} cy={47 + Math.sin(a) * 27} r="11" fill={i % 2 ? "#b35a1a" : "#c96a1f"} />; })}
    <circle cx="50" cy="47" r="26" fill="#a64d14" />
    <circle cx="33" cy="31" r="6" fill="#f2b45a" /><circle cx="67" cy="31" r="6" fill="#f2b45a" />
    <ellipse cx="50" cy="49" rx="20" ry="21" fill="#f6c46e" />
    <Eyes y={45} dx={8.5} r={3.6} />
    <ellipse cx="50" cy="59" rx="9" ry="7" fill="#fff1d6" />
    <path d="M45.5 54 h9 l-4.5 4.5 z" fill="#5a2c10" />
    <path d="M50 58.5 v3 M50 61.5 q-3.5 3 -6 0 M50 61.5 q3.5 3 6 0" stroke="#5a2c10" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  </> },
  tiger: { bg: ["#ffe0b8", "#ff8a3c"], draw: () => <>
    <Body fill="#e8742a" />
    <circle cx="29" cy="28" r="9" fill="#e8742a" /><circle cx="71" cy="28" r="9" fill="#e8742a" />
    <circle cx="29" cy="28" r="4.5" fill="#fff1e0" /><circle cx="71" cy="28" r="4.5" fill="#fff1e0" />
    <ellipse cx="50" cy="50" rx="26" ry="24" fill="#f58a35" />
    <path d="M50 27 l-4 9 h8z M38 29 l-1 8 l5 -2z M62 29 l1 8 l-5 -2z M24 46 h9 l-8 4z M76 46 h-9 l8 4z M25 55 h8 l-7 4z M75 55 h-8 l7 4z" fill="#3a2010" />
    <ellipse cx="50" cy="60" rx="15" ry="11" fill="#fff6ea" />
    <Eyes y={46} dx={10} r={3.8} color="#2a3a10" />
    <path d="M45.5 55 h9 l-4.5 4.5 z" fill="#3a2010" />
    <path d="M50 59.5 v2.5 M50 62 q-3.5 3 -6 0 M50 62 q3.5 3 6 0" stroke="#3a2010" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  </> },
  eagle: { bg: ["#cfe8ff", "#5b9be0"], draw: () => <>
    <Body fill="#6b4226" />
    <path d="M22 70 Q20 40 36 28 Q50 18 64 28 Q80 40 78 70 Q64 62 50 64 Q36 62 22 70Z" fill="#7a4a2a" />
    <path d="M28 52 Q30 26 50 24 Q70 26 72 52 Q62 60 50 60 Q38 60 28 52Z" fill="#fbfbf7" />
    <path d="M30 40 l8 2 M70 40 l-8 2" stroke="#e8e4da" strokeWidth="3" strokeLinecap="round" />
    <Eyes y={42} dx={11} r={3.8} color="#3a2410" />
    <path d="M36 37 l9 3 M64 37 l-9 3" stroke="#3a2410" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M42 48 Q50 44 58 48 Q58 58 50 66 Q48 58 42 54Z" fill="#ffc23a" stroke="#d48a00" strokeWidth="1.2" />
    <path d="M44 52 Q50 50 56 52" fill="none" stroke="#d48a00" strokeWidth="1.2" />
  </> },
  wolf: { bg: ["#dfe6ee", "#6b7d94"], draw: () => <>
    <Body fill="#5f6f82" />
    <path d="M24 44 L28 14 L44 32Z M76 44 L72 14 L56 32Z" fill="#6f8094" /><path d="M29 36 L30 21 L39 32Z M71 36 L70 21 L61 32Z" fill="#f0c8c8" />
    <path d="M22 50 Q24 28 50 26 Q76 28 78 50 Q74 70 50 74 Q26 70 22 50Z" fill="#8494a8" />
    <path d="M50 40 Q38 50 36 62 Q50 72 64 62 Q62 50 50 40Z" fill="#eef2f6" />
    <Eyes y={45} dx={11} r={3.8} color="#1f3a5a" />
    <ellipse cx="50" cy="58" rx="5" ry="3.6" fill="#2a2f38" />
    <path d="M50 61.5 v3 M50 64.5 q-3 2.5 -5 0 M50 64.5 q3 2.5 5 0" stroke="#2a2f38" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </> },
  fox: { bg: ["#fff0d8", "#ff9a4d"], draw: () => <>
    <Body fill="#e86a1f" />
    <path d="M22 46 L26 14 L44 34Z M78 46 L74 14 L56 34Z" fill="#f07a2a" /><path d="M27 38 L29 22 L38 34Z M73 38 L71 22 L62 34Z" fill="#3a2010" />
    <path d="M20 46 Q24 28 50 28 Q76 28 80 46 Q72 70 50 76 Q28 70 20 46Z" fill="#f5832f" />
    <path d="M20 46 Q34 52 50 76 Q30 70 20 46Z M80 46 Q66 52 50 76 Q70 70 80 46Z" fill="#fff6ea" />
    <Eyes y={47} dx={11} r={3.6} />
    <ellipse cx="50" cy="66" rx="4.5" ry="3.4" fill="#2a1a10" />
  </> },
  owl: { bg: ["#e8dcff", "#8a6bd8"], draw: () => <>
    <Body fill="#7a5638" />
    <path d="M24 30 L32 18 L40 30Z M76 30 L68 18 L60 30Z" fill="#8a6440" />
    <ellipse cx="50" cy="54" rx="28" ry="30" fill="#9a7048" />
    <path d="M30 70 q4 -4 8 0 q4 -4 8 0 q4 -4 8 0 q4 -4 8 0 q4 -4 8 0" fill="none" stroke="#7a5638" strokeWidth="1.6" />
    <circle cx="39" cy="44" r="12" fill="#fff8e8" /><circle cx="61" cy="44" r="12" fill="#fff8e8" />
    <circle cx="39" cy="44" r="12" fill="none" stroke="#e0b060" strokeWidth="2" /><circle cx="61" cy="44" r="12" fill="none" stroke="#e0b060" strokeWidth="2" />
    <circle cx="39" cy="45" r="6.5" fill="#2a1a10" /><circle cx="61" cy="45" r="6.5" fill="#2a1a10" />
    <circle cx="41.5" cy="42.5" r="2.4" fill="#fff" /><circle cx="63.5" cy="42.5" r="2.4" fill="#fff" />
    <path d="M46 54 h8 l-4 7z" fill="#ffb020" />
  </> },
  bear: { bg: ["#ffe6cc", "#c98a52"], draw: () => <>
    <Body fill="#8a5530" />
    <circle cx="28" cy="30" r="10" fill="#8a5530" /><circle cx="72" cy="30" r="10" fill="#8a5530" />
    <circle cx="28" cy="30" r="5" fill="#c98a5a" /><circle cx="72" cy="30" r="5" fill="#c98a5a" />
    <circle cx="50" cy="52" r="27" fill="#9a6238" />
    <ellipse cx="50" cy="61" rx="13" ry="10" fill="#e8c09a" />
    <Eyes y={47} dx={11} r={3.8} />
    <ellipse cx="50" cy="57" rx="5" ry="3.6" fill="#3a2010" />
    <Smile y={62} w={4.5} color="#3a2010" />
    <Cheeks y={58} dx={21} />
  </> },
  cat: { bg: ["#ffe1ec", "#ff8fb4"], draw: () => <>
    <Body fill="#9aa3b0" />
    <path d="M24 44 L26 16 L46 32Z M76 44 L74 16 L54 32Z" fill="#aab3c0" /><path d="M28 38 L29 23 L40 33Z M72 38 L71 23 L60 33Z" fill="#ffb8cc" />
    <ellipse cx="50" cy="52" rx="28" ry="25" fill="#b8c0cc" />
    <path d="M50 28 v8 M43 29 l2 7 M57 29 l-2 7" stroke="#8a93a0" strokeWidth="2.4" strokeLinecap="round" />
    <Eyes y={49} dx={11} r={4.2} color="#2f6b3a" />
    <path d="M47 57 h6 l-3 3z" fill="#ff7aa0" />
    <path d="M50 60 q-3 3 -6 1 M50 60 q3 3 6 1" stroke="#5a5f68" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M30 56 h-12 M30 60 l-11 3 M70 56 h12 M70 60 l11 3" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
    <Cheeks y={59} dx={18} color="#ff7aa0" />
  </> },
  turtle: { bg: ["#d8f5e8", "#3fb88a"], draw: () => <>
    <ellipse cx="50" cy="96" rx="40" ry="24" fill="#3a8a4a" />
    <path d="M18 92 Q50 66 82 92" fill="#4ea85a" stroke="#2f6b3a" strokeWidth="2" />
    <path d="M38 82 l6 -6 h12 l6 6 l-6 6 h-12z" fill="#5fbf6a" stroke="#2f6b3a" strokeWidth="1.5" />
    <ellipse cx="50" cy="46" rx="22" ry="22" fill="#8fd47a" />
    <ellipse cx="50" cy="66" rx="10" ry="9" fill="#8fd47a" />
    <Eyes y={44} dx={9} r={4} />
    <Smile y={54} w={7} color="#2f6b3a" />
    <Cheeks y={52} dx={15} />
  </> },
  dolphin: { bg: ["#d6f3ff", "#2fa8e0"], draw: () => <>
    <path d="M10 88 q10 -6 20 0 t20 0 t20 0 t20 0 v14 h-80z" fill="#1d7fc0" opacity=".6" />
    <path d="M24 80 Q18 50 40 34 Q48 20 58 28 Q80 36 80 60 Q80 80 60 84 Q40 88 24 80Z" fill="#5aa8e0" />
    <path d="M56 26 Q60 14 70 16 Q64 22 64 32Z" fill="#4a94cc" />
    <path d="M30 76 Q40 68 58 74 Q70 78 76 66 Q76 80 60 84 Q40 88 30 76Z" fill="#dff1ff" />
    <path d="M70 58 Q86 56 90 62 Q82 66 72 66Z" fill="#5aa8e0" />
    <circle cx="58" cy="50" r="4" fill="#1f2f40" /><circle cx="59.5" cy="48.5" r="1.5" fill="#fff" />
    <path d="M72 64 Q78 66 84 63" fill="none" stroke="#1f5a8a" strokeWidth="1.6" strokeLinecap="round" />
  </> },
  knight: { bg: ["#c8d6e6", "#4a5e78"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".4" stopColor="#c4ced8" /><stop offset=".75" stopColor="#8a96a4" /><stop offset="1" stopColor="#4e5a68" /></linearGradient>
    </defs>
    <path d="M12 100 Q14 80 30 76 Q50 72 70 76 Q86 80 88 100 Z" fill="#2f5aa8" stroke="#1a3570" strokeWidth="1.2" />
    <path d="M42 78 H58 V100 H42 Z" fill="#f0f2f5" /><path d="M50 80 V98 M44 88 H56" stroke="#d6283a" strokeWidth="3" />
    <path d="M16 86 Q22 76 34 78 Q30 86 32 92 Q22 88 16 92 Z M84 86 Q78 76 66 78 Q70 86 68 92 Q78 88 84 92 Z" fill={`url(#${id}s)`} stroke="#4e5a68" strokeWidth="1" />
    <path d="M50 10 C58 2 74 4 76 16 C68 12 60 14 56 22 Z" fill="#d6283a" stroke="#8a0a1a" strokeWidth=".8" />
    <path d="M28 50 Q28 22 50 20 Q72 22 72 50 V70 Q62 78 50 78 Q38 78 28 70 Z" fill={`url(#${id}s)`} stroke="#4e5a68" strokeWidth="1.6" />
    <path d="M50 21 V77" stroke="#ffffff" strokeWidth="1.4" opacity=".7" />
    <path d="M34 30 Q42 24 50 23" stroke="#fff" strokeWidth="2.2" fill="none" opacity=".8" strokeLinecap="round" />
    <path d="M31 44 Q50 40 69 44 L68 51 Q50 47 32 51 Z" fill="#1a2230" />
    {[57, 62, 67].map((y) => <path key={y} d={`M40 ${y} H60`} stroke="#4e5a68" strokeWidth="1.6" strokeLinecap="round" />)}
    {[[33, 58], [67, 58]].map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r="1.5" fill="#fff" />)}
  </> },
  knightepic: { bg: ["#3a4ab0", "#0a0c2a"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}d`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c8b8ff" /><stop offset=".35" stopColor="#6a5ab0" /><stop offset=".75" stopColor="#3a2c70" /><stop offset="1" stopColor="#1a1238" /></linearGradient>
      <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#a8b4d0" /></linearGradient>
      <radialGradient id={`${id}v`}><stop offset="0" stopColor="#ffffff" /><stop offset=".4" stopColor="#d08aff" /><stop offset="1" stopColor="#8a2ae0" stopOpacity="0" /></radialGradient>
    </defs>
    <g opacity=".4" className="pa-spin" style={{ transformOrigin: "50px 42px" }}>{Array.from({ length: 12 }, (_, i) => <path key={i} d="M50 42 L48 -8 H52 Z" fill="#c8d4ff" transform={`rotate(${i * 30} 50 42)`} />)}</g>
    <path d="M6 100 Q8 70 26 72 L50 96 L74 72 Q92 70 94 100 Z" fill="#5a1f9a" stroke="#2a0a50" strokeWidth="1" />
    <path d="M12 100 Q14 80 30 76 Q50 72 70 76 Q86 80 88 100 Z" fill={`url(#${id}d)`} stroke="#14082a" strokeWidth="1.2" />
    <path d="M14 86 Q22 74 34 76 Q30 84 32 92 Q22 88 14 92 Z M86 86 Q78 74 66 76 Q70 84 68 92 Q78 88 86 92 Z" fill={`url(#${id}d)`} stroke={`url(#${id}t)`} strokeWidth="1.4" />
    <path d="M44 80 H56 L58 88 Q50 96 42 88 Z" fill="#14082a" stroke={`url(#${id}t)`} strokeWidth="1.2" />
    <path d="M50 82 L53 88 L50 92 L47 88 Z" fill="#d08aff" />
    <path d="M30 34 C20 28 16 16 20 6 C24 16 30 22 36 26 Z M70 34 C80 28 84 16 80 6 C76 16 70 22 64 26 Z" fill={`url(#${id}t)`} stroke="#4a4a6a" strokeWidth="1" />
    <path d="M28 50 Q28 22 50 20 Q72 22 72 50 V70 Q62 78 50 78 Q38 78 28 70 Z" fill={`url(#${id}d)`} stroke={`url(#${id}t)`} strokeWidth="1.8" />
    <path d="M50 21 V77" stroke="#c8b8ff" strokeWidth="1.4" opacity=".7" />
    <path d="M34 30 Q42 24 50 23" stroke="#fff" strokeWidth="2" fill="none" opacity=".6" strokeLinecap="round" />
    <path d="M31 44 Q50 40 69 44 L68 52 Q50 48 32 52 Z" fill="#06020e" />
    <ellipse className="pa-glow" cx="50" cy="47" rx="17" ry="4" fill={`url(#${id}v)`} />
    <path d="M39 47 h5 M56 47 h5" stroke="#f6e8ff" strokeWidth="2" strokeLinecap="round" />
    {[58, 63, 68].map((y) => <path key={y} d={`M40 ${y} H60`} stroke="#c8b8ff" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />)}
    {[[16, 30, 3], [84, 60, 2.6]].map(([x, y, r]) => <path key={`${x}`} d={`M${x} ${y - r} L${x + r * .3} ${y - r * .3} L${x + r} ${y} L${x + r * .3} ${y + r * .3} L${x} ${y + r} L${x - r * .3} ${y + r * .3} L${x - r} ${y} L${x - r * .3} ${y - r * .3} Z`} fill="#e6dcff" className="fx-twinkle" />)}
  </> },
  knightlegend: { bg: ["#6a3fb0", "#140828"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff6c8" /><stop offset=".35" stopColor="#ffd24a" /><stop offset=".7" stopColor="#d99a10" /><stop offset="1" stopColor="#7a4a00" /></linearGradient>
      <linearGradient id={`${id}gv`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2a8" /><stop offset=".55" stopColor="#f0b820" /><stop offset="1" stopColor="#8a5a00" /></linearGradient>
      <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff6a7a" /><stop offset="1" stopColor="#9a0a2a" /></linearGradient>
      <radialGradient id={`${id}h`}><stop offset="0" stopColor="#fff2b8" stopOpacity=".9" /><stop offset="1" stopColor="#ffd24a" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}v`}><stop offset="0" stopColor="#ffffff" /><stop offset=".4" stopColor="#7fe8ff" /><stop offset="1" stopColor="#1a8ad8" stopOpacity="0" /></radialGradient>
    </defs>
    {/* rays and halo */}
    <g opacity=".55" className="pa-spin" style={{ transformOrigin: "50px 40px" }}>{Array.from({ length: 16 }, (_, i) => <path key={i} d="M50 40 L47 -10 H53 Z" fill="#ffd24a" transform={`rotate(${i * 22.5} 50 40)`} opacity={i % 2 ? 0.5 : 1} />)}</g>
    <circle className="pa-pulse" cx="50" cy="40" r="30" fill={`url(#${id}h)`} />
    {/* pauldrons and breastplate */}
    <path d="M10 100 Q12 78 30 74 Q50 70 70 74 Q88 78 90 100 Z" fill={`url(#${id}g)`} stroke="#6a4200" strokeWidth="1.2" />
    <path d="M14 86 Q22 74 34 76 Q30 84 32 92 Q22 88 14 92 Z M86 86 Q78 74 66 76 Q70 84 68 92 Q78 88 86 92 Z" fill={`url(#${id}gv)`} stroke="#6a4200" strokeWidth="1" />
    <path d="M40 80 H60 L62 88 Q50 100 38 88 Z" fill="#5a2fc0" stroke="#fff2b8" strokeWidth="1.4" />
    <path d="M50 82 l1.6 3.4 3.7.5 -2.7 2.6 .7 3.7 -3.3 -1.8 -3.3 1.8 .7 -3.7 -2.7 -2.6 3.7 -.5z" fill="#ffd24a" />
    {/* plume */}
    <g className="pa-sway"><path d="M52 14 C66 2 86 6 90 20 C82 14 72 14 66 20 C76 18 84 24 84 32 C76 26 66 26 60 30 Z" fill={`url(#${id}p)`} stroke="#6a0a1a" strokeWidth=".8" />
    <path d="M58 22 C68 14 78 14 84 18 M60 28 C68 22 76 24 80 28" stroke="#ffb0b8" strokeWidth="1" fill="none" opacity=".7" /></g>
    {/* great helm */}
    <path d="M28 50 Q28 22 50 20 Q72 22 72 50 V70 Q62 78 50 78 Q38 78 28 70 Z" fill={`url(#${id}g)`} stroke="#6a4200" strokeWidth="1.6" />
    <path d="M50 21 V77" stroke="#fff6c8" strokeWidth="1.6" opacity=".7" />
    <path d="M34 30 Q42 24 50 23" stroke="#fff" strokeWidth="2.4" fill="none" opacity=".7" strokeLinecap="round" />
    {/* glowing visor */}
    <path d="M31 44 Q50 40 69 44 L68 52 Q50 48 32 52 Z" fill="#160a28" />
    <ellipse className="pa-glow" cx="50" cy="47" rx="17" ry="4" fill={`url(#${id}v)`} />
    <path d="M38 47 h6 M56 47 h6" stroke="#e6fbff" strokeWidth="2" strokeLinecap="round" />
    {/* breaths and rivets */}
    {[58, 63, 68].map((y) => <path key={y} d={`M40 ${y} H60`} stroke="#6a4200" strokeWidth="1.6" strokeLinecap="round" />)}
    {[[33, 58], [67, 58], [36, 66], [64, 66]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.5" fill="#fff6c8" />)}
    {/* crown */}
    <path d="M36 22 L34 10 L42 16 L50 6 L58 16 L66 10 L64 22 Z" fill={`url(#${id}gv)`} stroke="#6a4200" strokeWidth="1.2" strokeLinejoin="round" />
    <circle cx="50" cy="16" r="2.4" fill="#e3214a" stroke="#fff" strokeWidth=".8" />
    <circle cx="41" cy="18" r="1.5" fill="#2f7bff" /><circle cx="59" cy="18" r="1.5" fill="#22c27e" />
    {/* sparkles */}
    {[[16, 22, 4], [84, 52, 3.4], [20, 62, 2.6]].map(([x, y, r]) => <path key={`${x}`} d={`M${x} ${y - r} L${x + r * .3} ${y - r * .3} L${x + r} ${y} L${x + r * .3} ${y + r * .3} L${x} ${y + r} L${x - r * .3} ${y + r * .3} L${x - r} ${y} L${x - r * .3} ${y - r * .3} Z`} fill="#fff6c8" className="fx-twinkle" />)}
  </> },
  // ---------- Armour suits (shop) ----------
  squire: { bg: ["#e6f2d8", "#7fae5a"], draw: (id) => <>
    <defs><linearGradient id={`${id}i`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f4f6f8" /><stop offset=".5" stopColor="#b8c0c8" /><stop offset="1" stopColor="#6e7884" /></linearGradient></defs>
    <path d="M12 100 Q14 80 30 76 Q50 72 70 76 Q86 80 88 100 Z" fill="#8a5a2b" stroke="#5a3814" strokeWidth="1.2" />
    <path d="M30 78 Q50 90 70 78 L66 100 H34 Z" fill="#6e8a3a" />
    <path d="M40 76 Q50 84 60 76" stroke="#5a3814" strokeWidth="2.4" fill="none" />
    <path d="M32 60 Q32 42 50 42 Q68 42 68 60 Q68 76 50 78 Q32 76 32 60 Z" fill="#f2c9a0" stroke="#c99a70" strokeWidth="1" />
    <Eyes y={60} dx={8} r={3.6} /><Smile y={68} w={5} /><Cheeks y={66} dx={13} />
    <path d="M22 50 Q24 22 50 20 Q76 22 78 50 Q64 44 50 44 Q36 44 22 50 Z" fill={`url(#${id}i)`} stroke="#5a6470" strokeWidth="1.4" />
    <path d="M18 52 Q50 40 82 52 Q82 56 78 56 Q50 46 22 56 Q18 56 18 52 Z" fill={`url(#${id}i)`} stroke="#5a6470" strokeWidth="1.2" />
    <path d="M50 21 V44" stroke="#fff" strokeWidth="1.4" opacity=".7" />
    <path d="M34 30 Q42 24 50 23" stroke="#fff" strokeWidth="2" fill="none" opacity=".7" strokeLinecap="round" />
  </> },
  viking: { bg: ["#d8e8f4", "#4a7aa8"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}i`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eef2f6" /><stop offset=".5" stopColor="#a8b2bc" /><stop offset="1" stopColor="#5a6470" /></linearGradient>
      <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff8e8" /><stop offset="1" stopColor="#d8c49a" /></linearGradient>
    </defs>
    <path d="M10 100 Q12 80 30 76 Q50 72 70 76 Q88 80 90 100 Z" fill="#7a3a1a" stroke="#4a200a" strokeWidth="1.2" />
    <path d="M18 84 Q30 72 50 74 Q70 72 82 84 Q70 80 50 82 Q30 80 18 84 Z" fill="#c9a77a" stroke="#8a6a40" strokeWidth="1" />
    <path d="M32 56 Q32 40 50 40 Q68 40 68 56 Q68 66 50 68 Q32 66 32 56 Z" fill="#f2c9a0" />
    <path d="M30 58 Q30 86 50 92 Q70 86 70 58 Q62 70 50 70 Q38 70 30 58 Z" fill="#e8823a" stroke="#b0561a" strokeWidth="1" />
    <path d="M40 74 Q42 86 38 92 M60 74 Q58 86 62 92" stroke="#b0561a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <path d="M42 64 Q50 60 58 64 Q50 68 42 64 Z" fill="#c8642a" />
    <Eyes y={55} dx={8} r={3.6} />
    <path d="M28 30 C16 28 8 18 10 6 C16 16 22 20 30 22 Z M72 30 C84 28 92 18 90 6 C84 16 78 20 70 22 Z" fill={`url(#${id}h)`} stroke="#a8946a" strokeWidth="1" />
    <path d="M26 46 Q26 18 50 16 Q74 18 74 46 Q62 42 50 42 Q38 42 26 46 Z" fill={`url(#${id}i)`} stroke="#4a5460" strokeWidth="1.5" />
    <path d="M24 44 Q50 36 76 44 V49 Q50 41 24 49 Z" fill="#c9a24a" stroke="#7a5a14" strokeWidth="1" />
    <path d="M47 42 H53 V58 Q50 61 47 58 Z" fill={`url(#${id}i)`} stroke="#4a5460" strokeWidth="1" />
    <path d="M50 17 V41" stroke="#c9a24a" strokeWidth="3" />
  </> },
  samurai: { bg: ["#ffe6e0", "#c83a3a"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e85a5a" /><stop offset=".6" stopColor="#a81a1a" /><stop offset="1" stopColor="#5a0a0a" /></linearGradient>
      <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2b0" /><stop offset=".6" stopColor="#f0b820" /><stop offset="1" stopColor="#9a6a00" /></linearGradient>
    </defs>
    <circle cx="74" cy="26" r="12" fill="#fff4f0" opacity=".55" />
    <path d="M10 100 Q12 80 30 76 Q50 72 70 76 Q88 80 90 100 Z" fill="#1a1a24" />
    {[80, 87, 94].map((y) => <path key={y} d={`M14 ${y + 4} Q50 ${y - 6} 86 ${y + 4}`} stroke={`url(#${id}r)`} strokeWidth="5" fill="none" />)}
    <path d="M32 56 Q32 40 50 40 Q68 40 68 56 Q68 64 50 66 Q32 64 32 56 Z" fill="#f2c9a0" />
    <path d="M36 52 Q41 49 46 52 M54 52 Q59 49 64 52" stroke="#2a1a10" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <circle cx="41" cy="55" r="2.6" fill="#2a1a10" /><circle cx="59" cy="55" r="2.6" fill="#2a1a10" />
    <path d="M32 60 Q50 56 68 60 L66 74 Q50 80 34 74 Z" fill="#2a1a1a" stroke="#000" strokeWidth="1" />
    <path d="M40 66 L44 70 M60 66 L56 70 M46 72 H54" stroke="#e8d8c0" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M14 50 Q16 34 26 30 L30 48 Q22 52 14 50 Z M86 50 Q84 34 74 30 L70 48 Q78 52 86 50 Z" fill={`url(#${id}r)`} stroke="#3a0505" strokeWidth="1" />
    <path d="M26 44 Q26 18 50 16 Q74 18 74 44 Q62 38 50 38 Q38 38 26 44 Z" fill="#1a1a24" stroke="#000" strokeWidth="1.4" />
    {[24, 30, 36].map((y) => <path key={y} d={`M${30 + (36 - y) * .3} ${y} Q50 ${y - 6} ${70 - (36 - y) * .3} ${y}`} stroke="#3a3a4a" strokeWidth="1.2" fill="none" />)}
    <path d="M24 44 Q50 34 76 44 V48 Q50 38 24 48 Z" fill={`url(#${id}g)`} />
    <path d="M50 18 C40 14 30 4 32 -2 C38 6 44 10 50 12 C56 10 62 6 68 -2 C70 4 60 14 50 18 Z" fill={`url(#${id}g)`} stroke="#7a5000" strokeWidth=".8" />
    <circle cx="50" cy="20" r="3" fill="#e3214a" stroke={`url(#${id}g)`} strokeWidth="1.2" />
  </> },
  spartan: { bg: ["#ffeccc", "#c87a2a"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe8a8" /><stop offset=".4" stopColor="#e0a040" /><stop offset=".75" stopColor="#a8661a" /><stop offset="1" stopColor="#5a3008" /></linearGradient>
      <linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8a0a1a" /><stop offset=".5" stopColor="#e8283a" /><stop offset="1" stopColor="#8a0a1a" /></linearGradient>
    </defs>
    <g opacity=".35">{Array.from({ length: 10 }, (_, i) => <path key={i} d="M50 50 L48 -6 H52 Z" fill="#fff4d0" transform={`rotate(${i * 36} 50 50)`} />)}</g>
    <path d="M4 100 Q8 72 28 72 L50 94 L72 72 Q92 72 96 100 Z" fill="#b01a2a" stroke="#5a0510" strokeWidth="1" />
    <path d="M12 100 Q14 80 30 76 Q50 72 70 76 Q86 80 88 100 Z" fill={`url(#${id}b)`} stroke="#5a3008" strokeWidth="1.2" />
    <path d="M38 84 Q50 78 62 84 M40 92 Q50 86 60 92" stroke="#5a3008" strokeWidth="1.6" fill="none" />
    <path d="M20 26 Q50 -2 80 26 Q72 18 50 14 Q28 18 20 26 Z" fill={`url(#${id}c)`} stroke="#5a0510" strokeWidth="1" />
    {Array.from({ length: 13 }, (_, i) => <path key={i} d={`M${24 + i * 4.3} ${22 - Math.sin((i / 12) * Math.PI) * 10} v6`} stroke="#ff8a8a" strokeWidth=".8" opacity=".7" />)}
    <path d="M28 50 Q28 22 50 20 Q72 22 72 50 L70 74 Q62 80 56 76 L56 58 L44 58 L44 76 Q38 80 30 74 Z" fill={`url(#${id}b)`} stroke="#5a3008" strokeWidth="1.6" />
    <path d="M33 44 Q41 40 47 44 L47 58 H44 L44 48 Q38 46 33 48 Z M67 44 Q59 40 53 44 L53 58 H56 L56 48 Q62 46 67 48 Z" fill="#1a0a04" />
    <path d="M47 44 H53 V60 H47 Z" fill={`url(#${id}b)`} stroke="#5a3008" strokeWidth="1" />
    <path d="M34 30 Q42 24 50 23" stroke="#fff4d0" strokeWidth="2.4" fill="none" opacity=".8" strokeLinecap="round" />
    <path d="M30 36 Q50 30 70 36" stroke="#5a3008" strokeWidth="1.2" fill="none" />
    <circle cx="40" cy="46" r="1.6" fill="#ffd24a" /><circle cx="60" cy="46" r="1.6" fill="#ffd24a" />
  </> },
  frostknight: { bg: ["#e0f6ff", "#3a8ad0"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".35" stopColor="#bfe8ff" /><stop offset=".75" stopColor="#5aa8e0" /><stop offset="1" stopColor="#1a4a8a" /></linearGradient>
      <radialGradient id={`${id}v`}><stop offset="0" stopColor="#ffffff" /><stop offset=".45" stopColor="#7ff0ff" /><stop offset="1" stopColor="#1ab0e0" stopOpacity="0" /></radialGradient>
    </defs>
    {[[14, 20, 5], [86, 30, 4], [18, 70, 3.5], [82, 74, 4.5], [70, 8, 3]].map(([x, y, r]) => (
      <g key={`${x}`} stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity=".9">
        {[0, 60, 120].map((a) => <path key={a} d={`M${x - r} ${y} H${x + r}`} transform={`rotate(${a} ${x} ${y})`} />)}
      </g>
    ))}
    <path d="M12 100 Q14 80 30 76 Q50 72 70 76 Q86 80 88 100 Z" fill={`url(#${id}f)`} stroke="#1a4a8a" strokeWidth="1.2" />
    <path d="M14 86 Q22 74 34 76 Q30 84 32 92 Q22 88 14 92 Z M86 86 Q78 74 66 76 Q70 84 68 92 Q78 88 86 92 Z" fill="#e8f8ff" stroke="#3a7ac0" strokeWidth="1" />
    <path d="M44 80 L50 92 L56 80 L50 84 Z" fill="#7ff0ff" stroke="#fff" strokeWidth=".8" />
    <path d="M30 26 L26 6 L36 20 L42 2 L48 18 L50 0 L52 18 L58 2 L64 20 L74 6 L70 26 Z" fill="#dff6ff" stroke="#5aa8e0" strokeWidth="1" strokeLinejoin="round" />
    <path d="M28 50 Q28 22 50 20 Q72 22 72 50 V70 Q62 78 50 78 Q38 78 28 70 Z" fill={`url(#${id}f)`} stroke="#1a4a8a" strokeWidth="1.6" />
    <path d="M50 21 V77" stroke="#ffffff" strokeWidth="1.4" opacity=".8" />
    <path d="M34 30 Q42 24 50 23" stroke="#fff" strokeWidth="2.4" fill="none" opacity=".9" strokeLinecap="round" />
    <path d="M31 44 Q50 40 69 44 L68 52 Q50 48 32 52 Z" fill="#0a1a3a" />
    <ellipse cx="50" cy="47" rx="17" ry="4" fill={`url(#${id}v)`} />
    <path d="M38 47 h6 M56 47 h6" stroke="#e6fbff" strokeWidth="2" strokeLinecap="round" />
    {[58, 63, 68].map((y) => <path key={y} d={`M40 ${y} H60`} stroke="#1a4a8a" strokeWidth="1.4" strokeLinecap="round" opacity=".7" />)}
    <path d="M30 70 l2 6 2 -5 2 7 2 -6 M64 70 l2 6 2 -5 2 7" stroke="#dff6ff" strokeWidth="1.2" fill="none" />
  </> },
  dragonknight: { bg: ["#5a1a0a", "#140404"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}d`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8a8a9a" /><stop offset=".35" stopColor="#3a3440" /><stop offset=".8" stopColor="#16121a" /><stop offset="1" stopColor="#060408" /></linearGradient>
      <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff8a4a" /><stop offset=".5" stopColor="#c81a1a" /><stop offset="1" stopColor="#4a0404" /></linearGradient>
      <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2a8" /><stop offset=".6" stopColor="#f0a820" /><stop offset="1" stopColor="#8a4a00" /></linearGradient>
      <radialGradient id={`${id}v`}><stop offset="0" stopColor="#fff8d0" /><stop offset=".4" stopColor="#ffb020" /><stop offset="1" stopColor="#ff3a00" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}h`}><stop offset="0" stopColor="#ff7a1a" stopOpacity=".85" /><stop offset="1" stopColor="#ff2a00" stopOpacity="0" /></radialGradient>
    </defs>
    <circle className="pa-pulse" cx="50" cy="44" r="44" fill={`url(#${id}h)`} />
    {[[18, 96, 14], [32, 98, 10], [70, 98, 11], [84, 96, 15]].map(([x, y, h]) => (
      <path key={`${x}`} d={`M${x - 6} ${y} Q${x - 6} ${y - h * .6} ${x} ${y - h} Q${x + 1} ${y - h * .5} ${x + 6} ${y} Z`} fill="#ffb020" opacity=".85" className="fx-flicker" />
    ))}
    {/* wings */}
    <path className="pa-flap-l" d="M24 60 C10 50 2 30 4 12 C10 22 16 24 22 24 C16 30 18 36 24 38 C20 42 22 48 28 50 Z" fill={`url(#${id}r)`} stroke="#2a0404" strokeWidth="1" />
    <path className="pa-flap-r" d="M76 60 C90 50 98 30 96 12 C90 22 84 24 78 24 C84 30 82 36 76 38 C80 42 78 48 72 50 Z" fill={`url(#${id}r)`} stroke="#2a0404" strokeWidth="1" />
    <path d="M10 100 Q12 78 30 74 Q50 70 70 74 Q88 78 90 100 Z" fill={`url(#${id}d)`} stroke="#000" strokeWidth="1.2" />
    {[[30, 84], [42, 82], [58, 82], [70, 84], [36, 92], [50, 90], [64, 92]].map(([x, y]) => <path key={`${x}${y}`} d={`M${x - 5} ${y} Q${x} ${y + 6} ${x + 5} ${y}`} stroke="#c81a1a" strokeWidth="1.4" fill="none" />)}
    <path d="M44 78 H56 L58 86 Q50 96 42 86 Z" fill="#160a0a" stroke={`url(#${id}g)`} strokeWidth="1.2" />
    <ellipse cx="50" cy="86" rx="3.4" ry="4.2" fill="#ff5a1a" stroke="#ffd24a" strokeWidth=".8" />
    {/* horns */}
    <path d="M32 30 C22 24 18 12 24 2 C26 12 32 18 38 22 Z M68 30 C78 24 82 12 76 2 C74 12 68 18 62 22 Z" fill={`url(#${id}g)`} stroke="#5a2a00" strokeWidth="1" />
    {/* helm */}
    <path d="M28 50 Q28 22 50 18 Q72 22 72 50 V68 Q64 78 50 80 Q36 78 28 68 Z" fill={`url(#${id}d)`} stroke={`url(#${id}g)`} strokeWidth="1.8" />
    <path d="M50 18 L46 30 L50 40 L54 30 Z" fill={`url(#${id}g)`} />
    <path d="M34 30 Q40 24 46 22" stroke="#c8c0d0" strokeWidth="2" fill="none" opacity=".6" strokeLinecap="round" />
    <path d="M30 44 L46 48 L44 54 L32 52 Z M70 44 L54 48 L56 54 L68 52 Z" fill="#0a0404" />
    <path className="pa-glow" d="M32 47 L45 50 M68 47 L55 50" stroke={`url(#${id}v)`} strokeWidth="4" strokeLinecap="round" />
    <path d="M34 48 L44 50.5 M66 48 L56 50.5" stroke="#fff4c0" strokeWidth="1.4" strokeLinecap="round" />
    {[[40, 62], [50, 64], [60, 62], [44, 70], [56, 70]].map(([x, y]) => <path key={`${x}${y}`} d={`M${x} ${y - 3} L${x + 2} ${y + 3} H${x - 2} Z`} fill={`url(#${id}g)`} />)}
    {[[14, 66, 2.4], [86, 20, 2], [90, 70, 2.6], [10, 34, 1.8]].map(([x, y, r]) => <circle key={`${x}`} cx={x} cy={y} r={r} fill="#ffcf5a" className="fx-twinkle" />)}
  </> },
  // ---------- Girls (shop) ----------
  flowergirl: { bg: ["#ffe6f0", "#ff9ac0"], draw: (id) => <>
    <defs><linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffb3cf" /><stop offset="1" stopColor="#e0588e" /></linearGradient></defs>
    <path d="M12 100 Q14 78 32 74 Q50 70 68 74 Q86 78 88 100 Z" fill="#8a5ad0" />
    <path d="M22 56 Q20 22 50 18 Q80 22 78 56 Q80 80 66 90 Q50 96 34 90 Q20 80 22 56 Z" fill={`url(#${id}h)`} stroke="#c0407a" strokeWidth="1.2" />
    <path d="M33 54 Q33 36 50 35 Q67 36 67 54 Q67 72 50 75 Q33 72 33 54 Z" fill="#f6d0ae" />
    <Eyes y={54} dx={8} r={3.8} /><path d="M38.6 52.4 l-3 -1.4 M38.9 51 l-2.4 -2.2 M61.4 52.4 l3 -1.4 M61.1 51 l2.4 -2.2" stroke="#2a1a10" strokeWidth="1.4" strokeLinecap="round" />
    <Smile y={63} w={5} /><Cheeks y={60} dx={12} />
    <path d="M33 44 Q50 34 67 44" stroke="#ff8ab4" strokeWidth="2" fill="none" opacity=".7" />
    {[[28, 28, "#fff"], [72, 30, "#ffe36a"]].map(([x, y, c]) => (
      <g key={`${x}`}>{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={x as number} cy={(y as number) - 4.5} rx="3" ry="4.5" fill={c as string} transform={`rotate(${a} ${x} ${y})`} />)}
        <circle cx={x as number} cy={y as number} r="2.6" fill="#ffb020" /></g>
    ))}
  </> },
  archer: { bg: ["#e6f6d8", "#6aae4a"], draw: (id) => <>
    <defs><linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6ac46a" /><stop offset="1" stopColor="#1f6a3a" /></linearGradient></defs>
    <path d="M86 10 Q100 50 86 90" stroke="#8a5a2b" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M86 10 V90" stroke="#f4ecd8" strokeWidth=".8" />
    <path d="M10 100 Q12 78 32 74 Q50 70 68 74 Q88 78 90 100 Z" fill={`url(#${id}c)`} stroke="#1a4a2a" strokeWidth="1" />
    <path d="M22 60 Q18 24 50 16 Q82 24 78 60 L74 80 Q50 70 26 80 Z" fill={`url(#${id}c)`} stroke="#1a4a2a" strokeWidth="1.2" />
    <path d="M30 50 Q30 40 40 36 Q50 42 60 36 Q70 40 70 50 L72 72 Q66 66 64 58 L36 58 Q34 66 28 72 Z" fill="#a8542a" />
    <path d="M34 54 Q34 38 50 37 Q66 38 66 54 Q66 72 50 74 Q34 72 34 54 Z" fill="#f2c9a0" />
    <path d="M34 48 Q42 38 54 40 Q48 44 46 48 Q40 44 34 48 Z" fill="#a8542a" />
    <Eyes y={56} dx={8} r={3.6} /><path d="M38.6 54.4 l-3 -1.4 M38.9 53 l-2.4 -2.2 M61.4 54.4 l3 -1.4 M61.1 53 l2.4 -2.2" stroke="#2a1a10" strokeWidth="1.4" strokeLinecap="round" />
    <Smile y={65} w={5} /><Cheeks y={62} dx={12} />
    <path d="M64 18 L78 10 L74 20 Z" fill="#d6283a" />
  </> },
  shieldmaiden: { bg: ["#dfeefc", "#5a8ac8"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}i`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#b8c4d0" /><stop offset="1" stopColor="#5a6878" /></linearGradient>
      <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#c8dcf0" /></linearGradient>
    </defs>
    <path d="M10 100 Q12 78 32 74 Q50 70 68 74 Q88 78 90 100 Z" fill="#2f5aa8" stroke="#1a3570" strokeWidth="1" />
    <path d="M24 88 Q30 76 50 76 Q70 76 76 88" stroke="#c9a24a" strokeWidth="3" fill="none" />
    <path d="M28 56 Q22 80 20 96 Q26 90 30 92 Q30 76 34 64 Z M72 56 Q78 80 80 96 Q74 90 70 92 Q70 76 66 64 Z" fill="#f0c050" stroke="#c08a20" strokeWidth="1" />
    {[70, 78, 86].map((y) => <path key={y} d={`M${24 - (y - 70) * .1} ${y} l6 2 M${76 + (y - 70) * .1} ${y} l-6 2`} stroke="#c08a20" strokeWidth="1.2" />)}
    <path d="M34 54 Q34 38 50 37 Q66 38 66 54 Q66 72 50 74 Q34 72 34 54 Z" fill="#f6d0ae" />
    <Eyes y={56} dx={8} r={3.6} /><path d="M38.6 54.4 l-3 -1.4 M38.9 53 l-2.4 -2.2 M61.4 54.4 l3 -1.4 M61.1 53 l2.4 -2.2" stroke="#2a1a10" strokeWidth="1.4" strokeLinecap="round" />
    <Smile y={65} w={5} /><Cheeks y={62} dx={12} />
    <path d="M24 30 C12 26 4 16 6 6 C12 14 18 16 24 18 C18 20 18 24 26 26 Z M76 30 C88 26 96 16 94 6 C88 14 82 16 76 18 C82 20 82 24 74 26 Z" fill={`url(#${id}w)`} stroke="#8aa8c8" strokeWidth="1" />
    <path d="M28 46 Q28 20 50 18 Q72 20 72 46 Q62 42 50 42 Q38 42 28 46 Z" fill={`url(#${id}i)`} stroke="#4a5868" strokeWidth="1.4" />
    <path d="M26 44 Q50 36 74 44 V48 Q50 40 26 48 Z" fill="#c9a24a" />
    <path d="M50 19 V42" stroke="#fff" strokeWidth="1.4" opacity=".7" />
    <path d="M34 30 Q42 24 50 22" stroke="#fff" strokeWidth="2" fill="none" opacity=".8" strokeLinecap="round" />
  </> },
  fairy: { bg: ["#f0e6ff", "#a88ae8"], draw: (id) => <>
    <defs><radialGradient id={`${id}w`}><stop offset="0" stopColor="#ffffff" stopOpacity=".95" /><stop offset=".6" stopColor="#c8f0ff" stopOpacity=".8" /><stop offset="1" stopColor="#ff9ad8" stopOpacity=".6" /></radialGradient></defs>
    <ellipse cx="20" cy="50" rx="16" ry="24" fill={`url(#${id}w)`} transform="rotate(-25 20 50)" stroke="#fff" strokeWidth="1" />
    <ellipse cx="80" cy="50" rx="16" ry="24" fill={`url(#${id}w)`} transform="rotate(25 80 50)" stroke="#fff" strokeWidth="1" />
    <ellipse cx="24" cy="78" rx="10" ry="14" fill={`url(#${id}w)`} transform="rotate(30 24 78)" />
    <ellipse cx="76" cy="78" rx="10" ry="14" fill={`url(#${id}w)`} transform="rotate(-30 76 78)" />
    <path d="M18 100 Q20 80 34 76 Q50 72 66 76 Q80 80 82 100 Z" fill="#ff8ac8" />
    <path d="M26 58 Q22 22 50 18 Q78 22 74 58 Q76 76 70 84 Q66 70 66 56 L34 56 Q34 70 30 84 Q24 76 26 58 Z" fill="#ffcf5a" stroke="#e0a020" strokeWidth="1" />
    <path d="M34 54 Q34 38 50 37 Q66 38 66 54 Q66 72 50 74 Q34 72 34 54 Z" fill="#f6d0ae" />
    <path d="M34 46 Q44 32 60 40 Q66 42 66 50 Q56 40 34 46 Z" fill="#ffcf5a" />
    <Eyes y={56} dx={8} r={3.8} /><path d="M38.6 54.4 l-3 -1.4 M38.9 53 l-2.4 -2.2 M61.4 54.4 l3 -1.4 M61.1 53 l2.4 -2.2" stroke="#2a1a10" strokeWidth="1.4" strokeLinecap="round" />
    <Smile y={65} w={5} /><Cheeks y={62} dx={12} color="#ff6aa8" />
    <path d="M38 20 L42 12 L46 18 L50 8 L54 18 L58 12 L62 20 Z" fill="#c8f0ff" stroke="#8ad0f0" strokeWidth=".8" />
    {[[14, 20, 3], [86, 16, 2.6], [10, 70, 2], [90, 74, 2.4], [70, 6, 2]].map(([x, y, r]) => <path key={`${x}`} d={`M${x} ${y - r} L${x + r * .3} ${y - r * .3} L${x + r} ${y} L${x + r * .3} ${y + r * .3} L${x} ${y + r} L${x - r * .3} ${y + r * .3} L${x - r} ${y} L${x - r * .3} ${y - r * .3} Z`} fill="#fff" />)}
  </> },
  warriorprincess: { bg: ["#ffe6f6", "#c84a9a"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".45" stopColor="#d8dde8" /><stop offset="1" stopColor="#7a86a0" /></linearGradient>
      <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2b0" /><stop offset=".6" stopColor="#f0b820" /><stop offset="1" stopColor="#9a6a00" /></linearGradient>
      <linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff6ab0" /><stop offset="1" stopColor="#8a0a5a" /></linearGradient>
    </defs>
    <g opacity=".35">{Array.from({ length: 10 }, (_, i) => <path key={i} d="M50 46 L48 -6 H52 Z" fill="#fff" transform={`rotate(${i * 36} 50 46)`} />)}</g>
    <path d="M4 100 Q8 70 28 72 L50 94 L72 72 Q92 70 96 100 Z" fill={`url(#${id}c)`} stroke="#5a0a3a" strokeWidth="1" />
    <path d="M12 100 Q14 80 30 76 Q50 72 70 76 Q86 80 88 100 Z" fill={`url(#${id}s)`} stroke="#4a5470" strokeWidth="1.2" />
    <path d="M14 86 Q22 74 34 76 Q30 84 32 92 Q22 88 14 92 Z M86 86 Q78 74 66 76 Q70 84 68 92 Q78 88 86 92 Z" fill={`url(#${id}g)`} stroke="#7a5000" strokeWidth="1" />
    <path d="M44 80 H56 L50 92 Z" fill={`url(#${id}g)`} /><circle cx="50" cy="84" r="2.4" fill="#ff3a8a" />
    <path d="M24 60 Q18 26 50 18 Q82 26 76 60 Q80 80 72 92 Q70 74 66 62 L34 62 Q30 74 28 92 Q20 80 24 60 Z" fill="#3a2010" />
    <path d="M34 54 Q34 38 50 37 Q66 38 66 54 Q66 72 50 74 Q34 72 34 54 Z" fill="#f2c9a0" />
    <path d="M34 48 Q38 36 50 36 Q62 36 66 48 Q58 40 50 42 Q42 40 34 48 Z" fill="#3a2010" />
    <Eyes y={56} dx={8} r={3.8} /><path d="M38.6 54.4 l-3 -1.4 M38.9 53 l-2.4 -2.2 M61.4 54.4 l3 -1.4 M61.1 53 l2.4 -2.2" stroke="#2a1a10" strokeWidth="1.4" strokeLinecap="round" />
    <Smile y={65} w={5} /><Cheeks y={62} dx={12} color="#ff6aa8" />
    <path d="M32 36 L30 22 L38 30 L44 16 L50 28 L56 16 L62 30 L70 22 L68 36 Q50 30 32 36 Z" fill={`url(#${id}s)`} stroke="#4a5470" strokeWidth="1" strokeLinejoin="round" />
    <circle cx="50" cy="30" r="3" fill="#ff3a8a" stroke="#fff" strokeWidth=".8" />
    <circle cx="38" cy="32" r="1.6" fill="#7ad8ff" /><circle cx="62" cy="32" r="1.6" fill="#7ad8ff" />
  </> },
  crystalqueen: { bg: ["#5a3ab0", "#120828"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".35" stopColor="#c8f0ff" /><stop offset=".7" stopColor="#8a9aff" /><stop offset="1" stopColor="#5a3ab0" /></linearGradient>
      <linearGradient id={`${id}d`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d8c8ff" /><stop offset=".5" stopColor="#8a5ae0" /><stop offset="1" stopColor="#3a1a80" /></linearGradient>
      <radialGradient id={`${id}h`}><stop offset="0" stopColor="#e6f8ff" stopOpacity=".9" /><stop offset="1" stopColor="#8ad8ff" stopOpacity="0" /></radialGradient>
    </defs>
    <g opacity=".55" className="pa-spin" style={{ transformOrigin: "50px 40px" }}>{Array.from({ length: 16 }, (_, i) => <path key={i} d="M50 40 L47 -10 H53 Z" fill="#c8f0ff" transform={`rotate(${i * 22.5} 50 40)`} opacity={i % 2 ? 0.5 : 1} />)}</g>
    <circle className="pa-pulse" cx="50" cy="42" r="32" fill={`url(#${id}h)`} />
    <path d="M10 100 Q14 74 32 72 Q50 70 68 72 Q86 74 90 100 Z" fill={`url(#${id}d)`} stroke="#2a0a60" strokeWidth="1" />
    <path d="M22 78 Q50 66 78 78 L76 84 Q50 74 24 84 Z" fill={`url(#${id}g)`} stroke="#fff" strokeWidth=".6" />
    <path d="M44 78 L50 92 L56 78 L50 82 Z" fill="#c8f0ff" stroke="#fff" strokeWidth=".8" />
    <path d="M22 62 Q16 24 50 18 Q84 24 78 62 Q82 84 76 96 Q70 80 66 64 L34 64 Q30 80 24 96 Q18 84 22 62 Z" fill="#f4f0ff" stroke="#c8c0e8" strokeWidth="1" />
    {[30, 40, 60, 70].map((x) => <path key={x} d={`M${x} 40 Q${x + (x < 50 ? -4 : 4)} 70 ${x + (x < 50 ? -6 : 6)} 92`} stroke="#d8d0f0" strokeWidth="1" fill="none" />)}
    <path d="M34 54 Q34 38 50 37 Q66 38 66 54 Q66 72 50 74 Q34 72 34 54 Z" fill="#f6d8c0" />
    <path d="M34 48 Q40 34 52 38 Q62 38 66 48 Q56 42 48 44 Q40 42 34 48 Z" fill="#f4f0ff" />
    <Eyes y={56} dx={8} r={3.8} color="#3a2a8a" /><path d="M38.6 54.4 l-3 -1.4 M38.9 53 l-2.4 -2.2 M61.4 54.4 l3 -1.4 M61.1 53 l2.4 -2.2" stroke="#2a1a50" strokeWidth="1.4" strokeLinecap="round" />
    <Smile y={65} w={5} /><Cheeks y={62} dx={12} color="#ff8ad0" />
    <path d="M30 34 L26 12 L36 26 L40 6 L46 24 L50 0 L54 24 L60 6 L64 26 L74 12 L70 34 Q50 28 30 34 Z" fill={`url(#${id}g)`} stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
    <path className="pa-glow" d="M50 22 L53 27 L50 32 L47 27 Z" fill="#ff5ab0" stroke="#fff" strokeWidth=".8" />
    <circle cx="38" cy="29" r="1.8" fill="#7ad8ff" /><circle cx="62" cy="29" r="1.8" fill="#7ad8ff" />
    {[[14, 24, 4], [86, 56, 3.4], [16, 66, 2.6], [84, 18, 3]].map(([x, y, r]) => <path key={`${x}`} d={`M${x} ${y - r} L${x + r * .3} ${y - r * .3} L${x + r} ${y} L${x + r * .3} ${y + r * .3} L${x} ${y + r} L${x - r * .3} ${y + r * .3} L${x - r} ${y} L${x - r * .3} ${y - r * .3} Z`} fill="#fff" className="fx-twinkle" />)}
  </> },
  // ---------- More friends (shop) ----------
  bunny: { bg: ["#fff0f6", "#ffb3d1"], draw: () => <>
    <Body fill="#fff" />
    <path d="M34 34 C26 10 30 0 38 2 C46 6 46 22 44 34Z M66 34 C74 10 70 0 62 2 C54 6 54 22 56 34Z" fill="#fff" stroke="#f0d8e4" strokeWidth="1.4" />
    <path d="M37 30 C33 14 35 7 39 8 C43 10 43 20 42 30Z M63 30 C67 14 65 7 61 8 C57 10 57 20 58 30Z" fill="#ffc2da" />
    <ellipse cx="50" cy="54" rx="26" ry="24" fill="#fff" stroke="#f0d8e4" strokeWidth="1.4" />
    <Eyes y={50} dx={10} r={4.4} color="#5a2a40" />
    <path d="M47 58 h6 l-3 3z" fill="#ff7aa8" />
    <path d="M50 61 v3 M50 64 q-3 2 -5 0 M50 64 q3 2 5 0" stroke="#c07090" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <path d="M46 66 h3 v4 h-3z M51 66 h3 v4 h-3z" fill="#fff" stroke="#e0c8d4" strokeWidth=".8" />
    <Cheeks y={60} dx={17} color="#ff8ab8" />
  </> },
  hamster: { bg: ["#fff3dc", "#ffc070"], draw: () => <>
    <Body fill="#f0a860" />
    <circle cx="28" cy="32" r="8" fill="#e09050" /><circle cx="72" cy="32" r="8" fill="#e09050" />
    <circle cx="28" cy="32" r="4" fill="#ffb8b0" /><circle cx="72" cy="32" r="4" fill="#ffb8b0" />
    <ellipse cx="50" cy="55" rx="30" ry="26" fill="#f4b070" />
    <ellipse cx="50" cy="64" rx="22" ry="16" fill="#fff4e4" />
    <ellipse cx="30" cy="62" rx="9" ry="8" fill="#fff4e4" /><ellipse cx="70" cy="62" rx="9" ry="8" fill="#fff4e4" />
    <Eyes y={50} dx={11} r={4} />
    <ellipse cx="50" cy="58" rx="3" ry="2.2" fill="#ff7a90" />
    <Smile y={62} w={4} />
    <Cheeks y={62} dx={21} color="#ff9a8a" />
  </> },
  puppy: { bg: ["#e6f4ff", "#7ab8f0"], draw: () => <>
    <Body fill="#d9a066" />
    <ellipse cx="50" cy="52" rx="26" ry="25" fill="#e8b47a" />
    <path d="M26 36 C12 38 12 64 22 70 C28 62 30 48 32 40Z M74 36 C88 38 88 64 78 70 C72 62 70 48 68 40Z" fill="#8a5a30" />
    <ellipse cx="60" cy="44" rx="9" ry="8" fill="#fff2e0" />
    <ellipse cx="50" cy="63" rx="15" ry="11" fill="#fff2e0" />
    <Eyes y={48} dx={10} r={4.2} />
    <ellipse cx="50" cy="58" rx="5" ry="3.6" fill="#3a2010" />
    <path d="M50 61 v3 M45 65 q5 4 10 0" stroke="#3a2010" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path d="M48 66 q2 7 4 0" fill="#ff7a8a" />
    <Cheeks y={60} dx={18} />
  </> },
  duckling: { bg: ["#e6f8ff", "#7fd0f0"], draw: () => <>
    <path d="M10 94 Q50 80 90 94 V100 H10Z" fill="#5ab8e0" opacity=".6" />
    <Body fill="#ffd84a" y={84} />
    <circle cx="50" cy="50" r="26" fill="#ffe066" />
    <path d="M46 24 q4 -10 8 -2 q2 -8 6 0" stroke="#ffd040" strokeWidth="4" fill="none" strokeLinecap="round" />
    <Eyes y={46} dx={10} r={4} />
    <path d="M38 58 Q50 50 62 58 Q50 70 38 58Z" fill="#ff9a2a" stroke="#d06a10" strokeWidth="1" />
    <path d="M40 58 H60" stroke="#d06a10" strokeWidth="1" />
    <Cheeks y={56} dx={17} color="#ff9a8a" />
  </> },
  frog: { bg: ["#eaffdc", "#7ad05a"], draw: () => <>
    <Body fill="#5ab848" />
    <circle cx="34" cy="34" r="12" fill="#6cc85a" /><circle cx="66" cy="34" r="12" fill="#6cc85a" />
    <ellipse cx="50" cy="56" rx="32" ry="22" fill="#6cc85a" />
    <circle cx="34" cy="33" r="7.5" fill="#fff" /><circle cx="66" cy="33" r="7.5" fill="#fff" />
    <circle cx="35" cy="34" r="4" fill="#1a2a10" /><circle cx="67" cy="34" r="4" fill="#1a2a10" />
    <circle cx="36.4" cy="32.6" r="1.4" fill="#fff" /><circle cx="68.4" cy="32.6" r="1.4" fill="#fff" />
    <path d="M28 58 Q50 76 72 58" stroke="#2a5a1a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <path d="M46 46 h1 M53 46 h1" stroke="#2a5a1a" strokeWidth="2" strokeLinecap="round" />
    <Cheeks y={60} dx={24} color="#ff8a8a" />
  </> },
  pirate: { bg: ["#e6f4ff", "#3a7ab0"], draw: () => <>
    <path d="M0 88 Q25 80 50 88 T100 88 V100 H0Z" fill="#2a5a8a" />
    <Body fill="#c8283a" />
    <path d="M36 84 L50 96 L64 84" stroke="#fff" strokeWidth="3" fill="none" />
    <ellipse cx="50" cy="54" rx="22" ry="22" fill="#f2c9a0" />
    <path d="M24 38 Q50 6 76 38 Q50 30 24 38Z" fill="#1a1a24" stroke="#000" strokeWidth="1" />
    <path d="M22 40 Q50 28 78 40" stroke="#e0b030" strokeWidth="2" fill="none" />
    <circle cx="50" cy="26" r="4.2" fill="#fff" /><path d="M47 30 l6 4 M53 30 l-6 4" stroke="#fff" strokeWidth="1.2" />
    <circle cx="42" cy="52" r="3.6" fill="#2a1a10" /><circle cx="43.2" cy="50.8" r="1.2" fill="#fff" />
    <ellipse cx="59" cy="52" rx="6" ry="5" fill="#1a1a24" /><path d="M30 46 L66 50 M64 50 L74 42" stroke="#1a1a24" strokeWidth="1.6" />
    <path d="M40 64 Q50 70 60 64" stroke="#2a1a10" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <circle cx="27" cy="60" r="2.6" fill="none" stroke="#e0b030" strokeWidth="1.6" />
    <Cheeks y={62} dx={15} />
  </> },
  firefighter: { bg: ["#fff0e0", "#ff7a3a"], draw: () => <>
    <Body fill="#2a3a5a" />
    <path d="M30 86 H70 M30 94 H70" stroke="#ffe14a" strokeWidth="3" />
    <ellipse cx="50" cy="56" rx="22" ry="22" fill="#f2c9a0" />
    <path d="M22 44 Q22 16 50 14 Q78 16 78 44 Z" fill="#d6283a" stroke="#8a0a1a" strokeWidth="1.4" />
    <path d="M14 46 Q50 36 86 46 Q86 52 80 52 Q50 44 20 52 Q14 52 14 46Z" fill="#b01a2a" />
    <path d="M50 15 V40" stroke="#8a0a1a" strokeWidth="2" />
    <path d="M44 22 h12 v12 l-6 4 l-6 -4z" fill="#ffd34a" stroke="#a07a10" strokeWidth="1" />
    <Eyes y={57} dx={9} r={3.8} />
    <Smile y={66} w={5} />
    <Cheeks y={64} dx={14} />
  </> },
  chef: { bg: ["#fff8ee", "#ffb070"], draw: () => <>
    <Body fill="#fff" />
    <path d="M40 82 L50 92 L60 82" fill="#e0283a" />
    <circle cx="44" cy="88" r="1.6" fill="#c8c8c8" /><circle cx="56" cy="88" r="1.6" fill="#c8c8c8" />
    <ellipse cx="50" cy="58" rx="22" ry="21" fill="#f2c9a0" />
    <path d="M30 40 C18 34 22 14 36 18 C38 4 62 4 64 18 C78 14 82 34 70 40 Z" fill="#fff" stroke="#e0e0e8" strokeWidth="1.4" />
    <rect x="30" y="36" width="40" height="8" rx="2" fill="#f4f4f8" stroke="#e0e0e8" />
    <Eyes y={57} dx={9} r={3.6} />
    <path d="M40 66 Q45 62 50 66 Q55 62 60 66" stroke="#5a3010" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <Smile y={70} w={4} />
    <Cheeks y={64} dx={15} />
  </> },
  snowleopard: { bg: ["#eef6ff", "#8aa8d0"], draw: () => <>
    <Body fill="#dfe4ea" />
    <path d="M26 38 L26 20 L42 30Z M74 38 L74 20 L58 30Z" fill="#dfe4ea" stroke="#8a96a4" strokeWidth="1" />
    <ellipse cx="50" cy="54" rx="28" ry="25" fill="#eef1f5" />
    {[[32, 38], [40, 32], [60, 32], [68, 38], [28, 54], [72, 54], [36, 68], [64, 68], [50, 30]].map(([x, y], i) =>
      <circle key={i} cx={x} cy={y} r="3" fill="none" stroke="#6a7484" strokeWidth="1.6" strokeDasharray="4 2" />)}
    <Eyes y={50} dx={11} r={4.2} color="#2a7ab0" />
    <path d="M46 58 h8 l-4 4z" fill="#ff9aac" />
    <path d="M50 62 q-4 4 -8 1 M50 62 q4 4 8 1" stroke="#4a5462" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <Cheeks y={61} dx={18} color="#ffb0c0" />
  </> },
  thundertiger: { bg: ["#2a2a6a", "#0a0a24"], draw: (id) => <>
    <defs><linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd24a" /><stop offset="1" stopColor="#ff8a1a" /></linearGradient></defs>
    <path d="M14 10 L22 26 L16 26 L26 44 M86 8 L78 24 L84 24 L74 42" stroke="#7ad8ff" strokeWidth="2.4" fill="none" strokeLinejoin="round" className="fx-flicker" />
    <Body fill="#f0a030" />
    <path d="M24 40 L24 18 L42 30Z M76 40 L76 18 L58 30Z" fill={`url(#${id}t)`} stroke="#3a1a00" strokeWidth="1" />
    <ellipse cx="50" cy="54" rx="29" ry="26" fill={`url(#${id}t)`} />
    <path d="M50 28 l-4 10 l6 0 l-4 10" stroke="#7ad8ff" strokeWidth="2.6" fill="none" strokeLinejoin="round" />
    <path d="M24 50 l9 2 M24 58 l9 0 M76 50 l-9 2 M76 58 l-9 0 M34 34 l5 6 M66 34 l-5 6" stroke="#2a1000" strokeWidth="2.6" strokeLinecap="round" />
    <ellipse cx="50" cy="64" rx="14" ry="10" fill="#fff4e0" />
    <Eyes y={50} dx={11} r={4.4} color="#1a6ab0" />
    <path d="M46 60 h8 l-4 4z" fill="#3a1a00" />
    <path d="M50 64 q-4 4 -8 1 M50 64 q4 4 8 1" stroke="#3a1a00" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  </> },
  crystalfox: { bg: ["#e8f6ff", "#6ab0e8"], draw: (id) => <>
    <defs><linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#bfe6ff" /><stop offset="1" stopColor="#7ab8f0" /></linearGradient></defs>
    {[[16, 22, 3], [84, 18, 2.6], [12, 70, 2.2], [88, 66, 3]].map(([x, y, r], i) => <path key={i} className="fx-twinkle" d={`M${x} ${y - r} L${x + r * .3} ${y - r * .3} L${x + r} ${y} L${x + r * .3} ${y + r * .3} L${x} ${y + r} L${x - r * .3} ${y + r * .3} L${x - r} ${y} L${x - r * .3} ${y - r * .3} Z`} fill="#fff" />)}
    <Body fill={`url(#${id}c)`} />
    <path d="M22 44 L18 12 L42 32Z M78 44 L82 12 L58 32Z" fill={`url(#${id}c)`} stroke="#5a9ad0" strokeWidth="1.2" />
    <path d="M24 38 L22 20 L36 32Z M76 38 L78 20 L64 32Z" fill="#8ad0ff" />
    <path d="M22 46 Q24 30 50 28 Q76 30 78 46 L62 74 Q50 80 38 74 Z" fill={`url(#${id}c)`} stroke="#5a9ad0" strokeWidth="1.2" />
    <path d="M50 28 V78 M36 40 L50 52 L64 40 M30 50 L50 66 L70 50" stroke="#fff" strokeWidth="1" opacity=".7" fill="none" />
    <path d="M38 68 Q50 62 62 68 L54 78 Q50 80 46 78Z" fill="#fff" />
    <Eyes y={50} dx={11} r={4} color="#2a5ab0" />
    <circle cx="50" cy="70" r="3" fill="#2a4a7a" />
  </> },
  oasiskitten: { bg: ["#e6fbf6", "#3fbfae"], draw: (id) => <>
    <defs><radialGradient id={`${id}s`} cx="50%" cy="100%" r="80%"><stop offset="0" stopColor="#ffe2a8" /><stop offset="1" stopColor="#f0c070" /></radialGradient></defs>
    {/* an oasis behind: a palm and a little pool */}
    <path d="M78 98 Q80 60 84 40" stroke="#8a5a2a" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M84 40 q-14 -6 -22 4 q12 -2 22 -4 q-6 -14 -18 -14 q10 6 18 14 q4 -14 16 -16 q-10 8 -16 16 q14 -4 18 6 q-12 -4 -18 -6Z" fill="#3a9a4a" />
    <ellipse cx="50" cy="100" rx="52" ry="14" fill={`url(#${id}s)`} />
    <ellipse cx="20" cy="94" rx="16" ry="4" fill="#6ad0f0" opacity=".9" />
    {/* the kitten */}
    <Body fill="#ffd3a1" />
    <path d="M42 80 Q50 90 58 80 Q54 86 50 87 Q46 86 42 80Z" fill="#fff6ea" />
    <path d="M22 46 Q16 16 40 28Z M78 46 Q84 16 60 28Z" fill="#ffd3a1" stroke="#c98a52" strokeWidth="1.2" />
    <path d="M26 40 Q24 24 37 31Z M74 40 Q76 24 63 31Z" fill="#ffb6c8" />
    <ellipse cx="50" cy="52" rx="30" ry="26" fill="#ffd3a1" stroke="#c98a52" strokeWidth="1.2" />
    <path d="M50 27 v6 M44 28 l1.5 5 M56 28 l-1.5 5" stroke="#f2a65e" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M21 50 h5 M22 55 h4 M79 50 h-5 M78 55 h-4" stroke="#f2a65e" strokeWidth="2.2" strokeLinecap="round" />
    <ellipse cx="50" cy="64" rx="12" ry="8" fill="#fff6ea" />
    {[39, 61].map((x) => <g key={x}><ellipse cx={x} cy="52" rx="7" ry="7.6" fill="#2a1a12" /><ellipse cx={x} cy="53.5" rx="5" ry="5.6" fill="#5a3a24" />
      <circle cx={x + 2.4} cy="49" r="2.6" fill="#fff" /><circle cx={x - 2.4} cy="56" r="1.2" fill="#fff" /></g>)}
    <path d="M47.6 60 Q50 58 52.4 60 Q50 63 47.6 60Z" fill="#ff8aa6" />
    <path d="M46 65 q2 2 4 0 q2 2 4 0" stroke="#3a2412" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <ellipse cx="32" cy="62" rx="4.6" ry="2.6" fill="#ff9ab0" opacity=".6" /><ellipse cx="68" cy="62" rx="4.6" ry="2.6" fill="#ff9ab0" opacity=".6" />
    {/* a blue scarf with a water-drop charm */}
    <path d="M30 76 Q50 86 70 76 L68 82 Q50 92 32 82Z" fill="#2a8ae0" />
    <path d="M50 84 q-4 6 0 9 q4 -3 0 -9Z" fill="#9ad8ff" stroke="#fff" strokeWidth=".8" />
  </> },
  // ---- added: more pictures in every rarity ----
  otter: { bg: ["#e0f4ff", "#5ab0e0"], draw: () => <>
    <path d="M0 84 q12 -6 25 0 t25 0 t25 0 t25 0 v16 h-100z" fill="#3a90c8" opacity=".55" />
    <Body fill="#8a5a3a" />
    <circle cx="28" cy="34" r="7" fill="#7a4a2a" /><circle cx="72" cy="34" r="7" fill="#7a4a2a" />
    <ellipse cx="50" cy="52" rx="27" ry="24" fill="#9a6a44" />
    <ellipse cx="50" cy="62" rx="17" ry="12" fill="#f0dcc0" />
    <Eyes y={48} dx={11} r={4} />
    <ellipse cx="50" cy="57" rx="4.6" ry="3.2" fill="#2a1a10" />
    <path d="M46 63 q4 3 8 0" stroke="#2a1a10" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M34 60 h-12 M34 64 l-11 3 M66 60 h12 M66 64 l11 3" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    <ellipse cx="40" cy="86" rx="8" ry="6" fill="#7a4a2a" /><ellipse cx="60" cy="86" rx="8" ry="6" fill="#7a4a2a" />
    <ellipse cx="50" cy="84" rx="7" ry="5" fill="#e8e0d0" stroke="#b8a888" strokeWidth="1" />
    <Cheeks y={60} dx={19} />
  </> },
  bee: { bg: ["#fff8d0", "#ffc83a"], draw: () => <>
    {[[14, 20], [86, 26], [80, 84]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}><circle r="5" fill="#fff" /><circle r="2" fill="#ffb000" /></g>)}
    <ellipse cx="30" cy="40" rx="14" ry="10" fill="#e8f6ff" stroke="#9ac8e0" strokeWidth="1" transform="rotate(-30 30 40)" opacity=".9" />
    <ellipse cx="70" cy="40" rx="14" ry="10" fill="#e8f6ff" stroke="#9ac8e0" strokeWidth="1" transform="rotate(30 70 40)" opacity=".9" />
    <ellipse cx="50" cy="86" rx="28" ry="22" fill="#ffd23a" />
    <path d="M26 80 Q50 74 74 80 M24 92 Q50 86 76 92" stroke="#2a2a2a" strokeWidth="6" fill="none" />
    <circle cx="50" cy="52" r="24" fill="#ffd23a" />
    <path d="M42 30 Q38 18 32 16 M58 30 Q62 18 68 16" stroke="#2a2a2a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <circle cx="32" cy="16" r="3" fill="#2a2a2a" /><circle cx="68" cy="16" r="3" fill="#2a2a2a" />
    <Eyes y={52} dx={9} r={4.2} />
    <Smile y={62} w={6} />
    <Cheeks y={60} dx={16} />
  </> },
  sloth: { bg: ["#e8f6e0", "#7ab85a"], draw: () => <>
    <path d="M0 22 Q50 14 100 24" stroke="#6a4a2a" strokeWidth="7" fill="none" />
    <path d="M18 22 q-2 8 4 12 M80 24 q4 8 -2 12" stroke="#3a8a3a" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M24 30 Q22 60 32 70 M76 30 Q78 60 68 70" stroke="#a88a6a" strokeWidth="10" fill="none" strokeLinecap="round" />
    <Body fill="#a88a6a" />
    <ellipse cx="50" cy="58" rx="26" ry="24" fill="#b89a78" />
    <ellipse cx="50" cy="60" rx="20" ry="16" fill="#f0e2c8" />
    <ellipse cx="40" cy="57" rx="8" ry="5" fill="#6a4a30" transform="rotate(15 40 57)" /><ellipse cx="60" cy="57" rx="8" ry="5" fill="#6a4a30" transform="rotate(-15 60 57)" />
    <path d="M37 57 q3 2 6 0 M57 57 q3 2 6 0" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <ellipse cx="50" cy="64" rx="4" ry="2.8" fill="#3a2a1a" />
    <path d="M44 69 q6 5 12 0" stroke="#3a2a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
  </> },
  redpanda: { bg: ["#fff0e0", "#e0703a"], draw: () => <>
    <path d="M78 100 Q96 80 88 60" stroke="#c0502a" strokeWidth="12" fill="none" strokeLinecap="round" />
    <path d="M84 84 l8 -4 M88 72 l8 -2" stroke="#f0e0c8" strokeWidth="4" strokeLinecap="round" />
    <Body fill="#5a2a1a" />
    <path d="M22 42 L20 20 L40 30Z M78 42 L80 20 L60 30Z" fill="#c0502a" /><path d="M25 36 L24 25 L35 31Z M75 36 L76 25 L65 31Z" fill="#fff6ea" />
    <ellipse cx="50" cy="52" rx="29" ry="25" fill="#d0602e" />
    <path d="M30 46 Q36 40 44 46 Q38 58 30 54Z M70 46 Q64 40 56 46 Q62 58 70 54Z" fill="#fff6ea" />
    <ellipse cx="50" cy="62" rx="12" ry="9" fill="#fff6ea" />
    <path d="M40 54 Q42 66 36 72 M60 54 Q58 66 64 72" stroke="#8a3a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Eyes y={50} dx={11} r={4} />
    <ellipse cx="50" cy="59" rx="4" ry="3" fill="#2a1a10" />
    <Smile y={64} w={4} />
  </> },
  explorer: { bg: ["#f0f8e0", "#8ab84a"], draw: () => <>
    <path d="M6 100 Q10 70 22 60 M94 100 Q90 70 78 60" stroke="#4a8a2a" strokeWidth="5" fill="none" />
    <Body fill="#c8a86a" />
    <path d="M42 84 h16 v16 h-16z" fill="#a8884a" /><circle cx="36" cy="92" r="6" fill="#2a2a2a" /><circle cx="36" cy="92" r="3.6" fill="#7ac0ff" />
    <path d="M38 88 L56 82" stroke="#5a3a1a" strokeWidth="2" />
    <circle cx="50" cy="52" r="23" fill="#f3c9a0" />
    <path d="M22 40 Q50 30 78 40 L76 44 Q50 36 24 44Z" fill="#d8b87a" />
    <path d="M30 40 Q32 18 50 18 Q68 18 70 40Z" fill="#e8c88a" /><path d="M30 36 Q50 30 70 36" stroke="#8a5a2a" strokeWidth="3" />
    <path d="M30 46 Q34 52 30 58 M70 46 Q66 52 70 58" stroke="#5a3a1a" strokeWidth="4" strokeLinecap="round" />
    <Eyes y={53} dx={10} r={3.8} />
    <Smile y={63} w={6} />
    <Cheeks y={60} dx={16} />
  </> },
  flamingo: { bg: ["#fff0f6", "#ff8ac0"], draw: () => <>
    <path d="M0 86 q12 -5 25 0 t25 0 t25 0 t25 0 v14 h-100z" fill="#7ad0e8" opacity=".6" />
    <ellipse cx="54" cy="90" rx="28" ry="16" fill="#ff8ab4" />
    <path d="M30 86 Q20 80 26 72 Q36 82 44 84Z" fill="#ff6aa0" />
    <path d="M60 80 Q70 60 56 46 Q46 36 52 26" stroke="#ff8ab4" strokeWidth="11" fill="none" strokeLinecap="round" />
    <circle cx="54" cy="26" r="15" fill="#ff9ac0" />
    <path d="M64 24 Q80 26 80 36 Q74 32 66 32Z" fill="#fff" /><path d="M74 30 Q80 32 80 36 L76 36Z" fill="#2a2a2a" />
    <circle cx="52" cy="22" r="3.6" fill="#2a1a10" /><circle cx="53.4" cy="20.8" r="1.3" fill="#fff" />
    <ellipse cx="46" cy="30" rx="4" ry="2.4" fill="#ff5a90" opacity=".5" />
  </> },
  moonrabbit: { bg: ["#1a1a4a", "#06061a"], draw: (id) => <>
    <defs><radialGradient id={`${id}m`}><stop offset="0" stopColor="#fffbe8" /><stop offset="1" stopColor="#f0d890" /></radialGradient></defs>
    <circle cx="50" cy="44" r="34" fill={`url(#${id}m)`} opacity=".95" />
    <circle cx="36" cy="30" r="4" fill="#e8cf80" opacity=".6" /><circle cx="70" cy="56" r="5" fill="#e8cf80" opacity=".6" /><circle cx="66" cy="26" r="2.5" fill="#e8cf80" opacity=".6" />
    {[[10, 14], [88, 12], [8, 70], [92, 76]].map(([x, y], i) => <circle key={i} className="fx-twinkle" style={{ animationDelay: `${i * .4}s` }} cx={x} cy={y} r="1.4" fill="#fff" />)}
    <Body fill="#f4f0ff" />
    <path d="M36 44 Q30 6 40 6 Q48 8 44 44Z M64 44 Q70 6 60 6 Q52 8 56 44Z" fill="#fff" stroke="#c8c0e8" strokeWidth="1.2" />
    <path d="M38 40 Q35 14 40 12 Q44 14 42 40Z M62 40 Q65 14 60 12 Q56 14 58 40Z" fill="#ffc0d8" />
    <ellipse cx="50" cy="60" rx="24" ry="21" fill="#fff" stroke="#c8c0e8" strokeWidth="1.2" />
    <Eyes y={58} dx={9} r={4} color="#6a3aa0" />
    <path d="M47 66 h6 l-3 3z" fill="#ff8ab0" />
    <Cheeks y={66} dx={15} />
    <path d="M60 86 l3 -6 3 6 -3 6z" fill="#ffd24a" />
  </> },
  crystalowl: { bg: ["#e0f6ff", "#5a8ad0"], draw: (id) => <>
    <defs><linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e8fbff" /><stop offset=".5" stopColor="#8ad8ff" /><stop offset="1" stopColor="#7a6aff" /></linearGradient></defs>
    {[[14, 20], [86, 18], [12, 80], [88, 82]].map(([x, y], i) => <path key={i} className="fx-twinkle" style={{ animationDelay: `${i * .3}s` }} d={`M${x} ${y - 4} l1.4 3 3 1 -3 1 -1.4 3 -1.4 -3 -3 -1 3 -1z`} fill="#fff" />)}
    <path d="M24 70 L30 100 H70 L76 70 L50 84Z" fill={`url(#${id}c)`} stroke="#fff" strokeWidth="1" />
    <path d="M22 34 L28 14 L40 28Z M78 34 L72 14 L60 28Z" fill={`url(#${id}c)`} stroke="#fff" strokeWidth="1" />
    <path d="M22 34 L50 22 L78 34 L80 64 L50 80 L20 64Z" fill={`url(#${id}c)`} stroke="#fff" strokeWidth="1.4" />
    <path d="M50 22 L50 80 M22 34 L50 52 L78 34 M20 64 L50 52 L80 64" stroke="#fff" strokeWidth=".8" opacity=".6" />
    <circle cx="38" cy="46" r="10" fill="#fff" /><circle cx="62" cy="46" r="10" fill="#fff" />
    <circle cx="38" cy="46" r="6" fill="#3a2aa0" /><circle cx="62" cy="46" r="6" fill="#3a2aa0" />
    <circle cx="40" cy="44" r="2" fill="#fff" /><circle cx="64" cy="44" r="2" fill="#fff" />
    <path d="M46 56 L50 64 L54 56Z" fill="#ffb03a" />
  </> },
  jellyfish: { bg: ["#1a0a4a", "#050218"], draw: (id) => <>
    <defs><radialGradient id={`${id}j`} cx="50%" cy="30%"><stop offset="0" stopColor="#ffd8ff" /><stop offset=".6" stopColor="#d070ff" /><stop offset="1" stopColor="#6a3ae0" /></radialGradient></defs>
    {[[12, 70, 3], [86, 60, 2.4], [22, 30, 2], [78, 24, 2.6], [50, 92, 2]].map(([x, y, r], i) => <circle key={i} className="fx-twinkle" style={{ animationDelay: `${i * .3}s` }} cx={x} cy={y} r={r} fill="#8ae0ff" opacity=".7" />)}
    <g className="pa-drift">
      {[30, 40, 50, 60, 70].map((x, i) => <path key={x} d={`M${x} 56 q${i % 2 ? 6 : -6} 10 0 20 q${i % 2 ? -6 : 6} 10 0 22`} stroke="#e0a0ff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".85" />)}
      <path d="M18 58 Q18 18 50 18 Q82 18 82 58 Q74 52 66 58 Q58 52 50 58 Q42 52 34 58 Q26 52 18 58Z" fill={`url(#${id}j)`} />
      <ellipse cx="38" cy="30" rx="8" ry="4" fill="#fff" opacity=".45" />
      <Eyes y={42} dx={10} r={4} color="#2a0a4a" />
      <Smile y={50} w={5} color="#2a0a4a" />
      <Cheeks y={48} dx={17} color="#ff7ad0" />
    </g>
  </> },
  celestiallion: { bg: ["#1a1040", "#05030f"], draw: (id) => <>
    <defs>
      <radialGradient id={`${id}l`} cx="50%" cy="40%"><stop offset="0" stopColor="#fff6d0" /><stop offset=".6" stopColor="#ffd24a" /><stop offset="1" stopColor="#c88a00" /></radialGradient>
      <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8a6aff" /><stop offset=".5" stopColor="#3a2aa0" /><stop offset="1" stopColor="#1a1060" /></linearGradient>
    </defs>
    {[[8, 10], [92, 14], [6, 60], [94, 58], [20, 92], [80, 94], [50, 6]].map(([x, y], i) => <circle key={i} className="fx-twinkle" style={{ animationDelay: `${i * .3}s` }} cx={x} cy={y} r="1.3" fill="#fff" />)}
    {Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return <path key={i} d={`M50 50 L${50 + Math.cos(a - .14) * 38} ${50 + Math.sin(a - .14) * 38} L${50 + Math.cos(a) * 46} ${50 + Math.sin(a) * 46} L${50 + Math.cos(a + .14) * 38} ${50 + Math.sin(a + .14) * 38}Z`} fill={`url(#${id}m)`} />; })}
    {Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2 + .3; return <circle key={i} className="fx-twinkle" style={{ animationDelay: `${i * .2}s` }} cx={50 + Math.cos(a) * 32} cy={50 + Math.sin(a) * 32} r="1.6" fill="#fff6c0" />; })}
    <ellipse cx="50" cy="54" rx="22" ry="21" fill={`url(#${id}l)`} />
    <circle cx="33" cy="36" r="6" fill={`url(#${id}l)`} /><circle cx="67" cy="36" r="6" fill={`url(#${id}l)`} />
    <ellipse cx="42" cy="51" rx="3.6" ry="4.2" fill="#3a2aa0" /><ellipse cx="58" cy="51" rx="3.6" ry="4.2" fill="#3a2aa0" />
    <circle cx="43.4" cy="49.4" r="1.3" fill="#fff" /><circle cx="59.4" cy="49.4" r="1.3" fill="#fff" />
    <ellipse cx="50" cy="63" rx="9" ry="7" fill="#fff6d8" /><path d="M46 59 h8 l-4 4z" fill="#a0602a" />
    <path d="M46 66 q4 3 8 0" stroke="#a0602a" strokeWidth="1.6" fill="none" />
    <path d="M50 30 l2 4 4.4.6 -3.2 3 .8 4.4 -4 -2.2 -4 2.2 .8 -4.4 -3.2 -3 4.4 -.6z" fill="#fff" />
  </> },
  pegasus: { bg: ["#eaf2ff", "#a8b8f0"], draw: (id) => <>
    <defs><linearGradient id={`${id}w`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#d8e0ff" /></linearGradient>
      <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff2a8" /><stop offset=".5" stopColor="#f0b820" /><stop offset="1" stopColor="#c88a00" /></linearGradient></defs>
    {[[16, 78], [80, 84], [30, 92]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="16" ry="6" fill="#fff" opacity=".9" />)}
    <g className="pa-drift">
      <path d="M30 60 Q4 46 8 18 Q22 34 34 36 Q22 22 28 8 Q40 26 44 44Z" fill={`url(#${id}w)`} stroke={`url(#${id}g)`} strokeWidth="1.4" />
      <path d="M70 60 Q96 46 92 18 Q78 34 66 36 Q78 22 72 8 Q60 26 56 44Z" fill={`url(#${id}w)`} stroke={`url(#${id}g)`} strokeWidth="1.4" />
    </g>
    <path d="M30 100 Q30 74 50 70 Q70 74 70 100Z" fill={`url(#${id}w)`} stroke="#c8d0f0" strokeWidth="1" />
    <path d="M36 66 Q34 36 50 30 Q66 36 64 66 Q60 80 50 82 Q40 80 36 66Z" fill={`url(#${id}w)`} stroke="#c8d0f0" strokeWidth="1.2" />
    <path d="M42 30 Q40 18 46 14 L48 28Z M58 30 Q60 18 54 14 L52 28Z" fill="#fff" stroke="#c8d0f0" strokeWidth="1" />
    <path d="M50 30 Q40 34 38 50 Q34 40 36 30 Q42 22 50 22 Q60 22 64 30 Q60 26 50 30Z" fill={`url(#${id}g)`} />
    <path d="M50 22 L52 8 L48 8Z" fill={`url(#${id}g)`} />
    <ellipse cx="43" cy="52" rx="3.4" ry="4" fill="#3a3a6a" /><ellipse cx="57" cy="52" rx="3.4" ry="4" fill="#3a3a6a" />
    <circle cx="44.2" cy="50.6" r="1.2" fill="#fff" /><circle cx="58.2" cy="50.6" r="1.2" fill="#fff" />
    <ellipse cx="50" cy="72" rx="9" ry="6" fill="#f0e8ff" />
    <circle cx="47" cy="72" r="1.2" fill="#8a8ab0" /><circle cx="53" cy="72" r="1.2" fill="#8a8ab0" />
    <Cheeks y={62} dx={12} color="#ff9ac0" />
  </> },
  frostlegend: { bg: ["#0e2a50", "#020818"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".3" stopColor="#c8f2ff" /><stop offset=".7" stopColor="#5ab8f0" /><stop offset="1" stopColor="#1a3a8a" /></linearGradient>
      <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eafcff" /><stop offset="1" stopColor="#6ad8ff" /></linearGradient>
      <radialGradient id={`${id}g`}><stop offset="0" stopColor="#ffffff" /><stop offset=".4" stopColor="#7ff6ff" /><stop offset="1" stopColor="#00b8ff" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}h`} cx="50%" cy="45%"><stop offset="0" stopColor="#7ff6ff" stopOpacity=".55" /><stop offset="1" stopColor="#7ff6ff" stopOpacity="0" /></radialGradient>
      <filter id={`${id}b`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" /></filter>
    </defs>
    {/* a frozen aura and drifting snowflakes */}
    <circle cx="50" cy="46" r="44" fill={`url(#${id}h)`} />
    {[[10, 14, 4], [90, 18, 3.4], [6, 56, 3], [94, 60, 3.6], [24, 6, 2.6], [78, 6, 2.4], [16, 90, 2.6], [86, 92, 3]].map(([x, y, r], i) => (
      <g key={i} className="fx-twinkle" style={{ animationDelay: `${i * .3}s` }} stroke="#dff8ff" strokeWidth="1" strokeLinecap="round">
        {[0, 60, 120].map((a) => <path key={a} d={`M${x - r} ${y} H${x + r}`} transform={`rotate(${a} ${x} ${y})`} />)}
      </g>
    ))}
    {/* a flowing ice cape */}
    <path d="M10 100 Q8 70 28 62 L72 62 Q92 70 90 100Z" fill="#123a7a" />
    <path d="M10 100 Q14 86 22 84 Q20 94 26 100Z M90 100 Q86 86 78 84 Q80 94 74 100Z" fill={`url(#${id}c)`} opacity=".8" />
    {/* crystal sword raised behind the shoulder */}
    <g className="pa-drift">
      <path d="M82 70 L92 6 L96 8 L88 72Z" fill={`url(#${id}c)`} stroke="#fff" strokeWidth=".8" />
      <path d="M78 72 L94 66 L96 70 L80 76Z" fill="#c8e8ff" stroke="#1a3a8a" strokeWidth=".8" />
      <circle cx="93" cy="8" r="3" fill={`url(#${id}g)`} />
    </g>
    {/* armored shoulders */}
    <path d="M16 96 Q16 76 34 72 Q50 68 66 72 Q84 76 84 96Z" fill={`url(#${id}a)`} stroke="#0a2a6a" strokeWidth="1.2" />
    <path d="M16 82 Q22 68 36 70 Q32 80 34 88 Q24 84 16 88Z M84 82 Q78 68 64 70 Q68 80 66 88 Q76 84 84 88Z" fill="#eafcff" stroke="#3a7ac0" strokeWidth="1" />
    <path d="M44 76 L50 90 L56 76 L50 81Z" fill="#7ff6ff" stroke="#fff" strokeWidth=".8" />
    {/* the great ice crown */}
    <path d="M26 30 L20 4 L32 20 L36 -2 L44 16 L50 -6 L56 16 L64 -2 L68 20 L80 4 L74 30Z" fill={`url(#${id}c)`} stroke="#5ab8f0" strokeWidth="1" strokeLinejoin="round" />
    {[[36, 10], [50, 4], [64, 10]].map(([x, y], i) => <path key={i} d={`M${x} ${y} l3 5 -3 5 -3 -5z`} fill="#bff8ff" stroke="#fff" strokeWidth=".6" />)}
    {/* the helm */}
    <path d="M28 50 Q28 22 50 20 Q72 22 72 50 V68 Q62 76 50 76 Q38 76 28 68Z" fill={`url(#${id}a)`} stroke="#0a2a6a" strokeWidth="1.6" />
    <path d="M50 21 V75" stroke="#fff" strokeWidth="1.2" opacity=".7" />
    <path d="M34 30 Q42 24 50 23" stroke="#fff" strokeWidth="2.4" fill="none" opacity=".9" strokeLinecap="round" />
    <path d="M30 44 Q50 39 70 44 L69 53 Q50 48 31 53Z" fill="#04102a" />
    {/* glowing eyes */}
    <ellipse cx="41" cy="47" rx="6" ry="3" fill={`url(#${id}g)`} filter={`url(#${id}b)`} />
    <ellipse cx="59" cy="47" rx="6" ry="3" fill={`url(#${id}g)`} filter={`url(#${id}b)`} />
    <path d="M38 47 h6 M56 47 h6" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
    {[58, 63, 68].map((y) => <path key={y} d={`M40 ${y} H60`} stroke="#0a2a6a" strokeWidth="1.3" strokeLinecap="round" opacity=".7" />)}
    {/* icicles under the helm */}
    <path d="M32 68 l2 7 2 -6 M64 68 l2 6 2 -7" fill="#dff8ff" />
  </> },
  frostastro: { bg: ["#0e2a4a", "#030a1a"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".45" stopColor="#d6f2ff" /><stop offset="1" stopColor="#7ab8e8" /></linearGradient>
      <linearGradient id={`${id}v`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bff8ff" /><stop offset=".45" stopColor="#3ab0e8" /><stop offset="1" stopColor="#0a2a6a" /></linearGradient>
      <radialGradient id={`${id}p`} cx="35%" cy="35%"><stop offset="0" stopColor="#eafcff" /><stop offset=".6" stopColor="#7ad0f0" /><stop offset="1" stopColor="#2a6ab0" /></radialGradient>
    </defs>
    {/* stars, falling snow and an ice planet with a frozen ring */}
    {[[10, 12], [90, 10], [6, 44], [94, 52], [24, 6], [70, 4]].map(([x, y], i) => <circle key={i} className="fx-twinkle" style={{ animationDelay: `${i * .3}s` }} cx={x} cy={y} r="1.2" fill="#fff" />)}
    {[[16, 26, 3], [84, 70, 2.6], [12, 76, 2.4]].map(([x, y, r], i) => (
      <g key={i} stroke="#dff8ff" strokeWidth=".9" strokeLinecap="round">{[0, 60, 120].map((a) => <path key={a} d={`M${x - r} ${y} H${x + r}`} transform={`rotate(${a} ${x} ${y})`} />)}</g>
    ))}
    <circle cx="82" cy="26" r="9" fill={`url(#${id}p)`} />
    <ellipse cx="82" cy="27" rx="15" ry="3.4" fill="none" stroke="#dff8ff" strokeWidth="1.6" opacity=".9" />
    {/* frosty suit with an ice backpack */}
    <rect x="18" y="66" width="12" height="26" rx="4" fill="#9ad8f8" stroke="#3a7ac0" strokeWidth="1" />
    <rect x="70" y="66" width="12" height="26" rx="4" fill="#9ad8f8" stroke="#3a7ac0" strokeWidth="1" />
    <path d="M22 100 Q22 76 38 72 Q50 70 62 72 Q78 76 78 100Z" fill={`url(#${id}s)`} stroke="#5a9ad8" strokeWidth="1.2" />
    <rect x="40" y="80" width="20" height="12" rx="3" fill="#1a3a6a" />
    <circle cx="45" cy="86" r="2" fill="#7ff6ff" /><circle cx="51" cy="86" r="2" fill="#ff7aa8" /><circle cx="57" cy="86" r="2" fill="#ffd24a" />
    {/* icicles on the shoulders */}
    <path d="M30 76 l2 6 2 -6 M66 76 l2 6 2 -6" fill="#eafcff" stroke="#7ab8e8" strokeWidth=".6" />
    {/* the helmet, frosted around the edge */}
    <circle cx="50" cy="46" r="28" fill={`url(#${id}s)`} stroke="#7ab8e8" strokeWidth="2" />
    <path d="M24 38 l4 3 -1 -5 5 2 -1 -5 5 3 0 -5 5 3 1 -5 4 4" stroke="#fff" strokeWidth="1.4" fill="none" opacity=".9" />
    <rect x="28" y="33" width="44" height="30" rx="15" fill={`url(#${id}v)`} stroke="#0a2a6a" strokeWidth="1" />
    <path d="M34 41 Q40 36 48 37" stroke="#fff" strokeWidth="3" fill="none" opacity=".8" strokeLinecap="round" />
    {/* a little face behind the visor */}
    <circle cx="43" cy="50" r="2.6" fill="#eafcff" /><circle cx="57" cy="50" r="2.6" fill="#eafcff" />
    <path d="M45 56 q5 4 10 0" stroke="#eafcff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <circle cx="22" cy="46" r="5" fill="#9ad8f8" stroke="#3a7ac0" strokeWidth="1" /><circle cx="78" cy="46" r="5" fill="#9ad8f8" stroke="#3a7ac0" strokeWidth="1" />
    <path d="M78 41 V30" stroke="#9ad8f8" strokeWidth="2" /><circle cx="78" cy="29" r="2.2" fill="#7ff6ff" className="fx-twinkle" />
  </> },
  pharaohcat: { bg: ["#ffe8b0", "#d09020"], draw: (id) => <>
    <defs><linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2a8" /><stop offset=".6" stopColor="#f0b820" /><stop offset="1" stopColor="#9a6a00" /></linearGradient></defs>
    <path d="M10 100 L50 30 L90 100Z" fill="#e8c070" opacity=".5" />
    <Body fill="#2a2a3a" />
    <path d="M26 60 Q22 30 50 26 Q78 30 74 60 L80 90 H20Z" fill="#1a4ab0" />
    {[34, 44, 54, 64].map((x) => <path key={x} d={`M${x} 30 L${x - 4} 90`} stroke={`url(#${id}g)`} strokeWidth="4" />)}
    <path d="M30 40 L28 18 L42 30Z M70 40 L72 18 L58 30Z" fill="#3a3a4a" />
    <ellipse cx="50" cy="50" rx="20" ry="20" fill="#3a3a4a" />
    <path d="M34 28 Q50 20 66 28 L64 34 Q50 28 36 34Z" fill={`url(#${id}g)`} stroke="#7a5000" strokeWidth=".8" />
    <path d="M50 22 l3 6 h-6z" fill="#1a4ab0" />
    <ellipse cx="42" cy="48" rx="4.6" ry="4" fill="#7ad840" /><ellipse cx="58" cy="48" rx="4.6" ry="4" fill="#7ad840" />
    <ellipse cx="42" cy="48" rx="1.4" ry="3.4" fill="#000" /><ellipse cx="58" cy="48" rx="1.4" ry="3.4" fill="#000" />
    <path d="M36 48 h-6 M64 48 h6" stroke="#000" strokeWidth="2" strokeLinecap="round" />
    <path d="M47 56 h6 l-3 3z" fill="#ff8aa8" />
    <path d="M40 66 Q50 74 60 66 L58 72 Q50 78 42 72Z" fill={`url(#${id}g)`} />
  </> },
  astrolegend: { bg: ["#3a1a6a", "#06020f"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff6c8" /><stop offset=".4" stopColor="#ffd24a" /><stop offset=".75" stopColor="#d99a10" /><stop offset="1" stopColor="#7a4a00" /></linearGradient>
      <radialGradient id={`${id}v`} cx="35%" cy="30%"><stop offset="0" stopColor="#ff8ad8" /><stop offset=".4" stopColor="#7a4ae0" /><stop offset=".8" stopColor="#1a0a4a" /><stop offset="1" stopColor="#06020f" /></radialGradient>
      <radialGradient id={`${id}h`}><stop offset="0" stopColor="#ffd24a" stopOpacity=".7" /><stop offset="1" stopColor="#ffd24a" stopOpacity="0" /></radialGradient>
    </defs>
    {[[12, 14], [88, 10], [80, 52], [8, 58], [26, 6], [94, 84], [6, 88]].map(([x, y], i) => <circle key={i} className="fx-twinkle" style={{ animationDelay: `${i * .3}s` }} cx={x} cy={y} r="1.4" fill="#fff" />)}
    <g className="pa-orbit" style={{ transformOrigin: "50px 46px" }}><circle cx="86" cy="26" r="7" fill="#ff8a5a" /><ellipse cx="86" cy="26" rx="12" ry="2.8" fill="none" stroke="#ffd0b0" strokeWidth="1.2" /></g>
    <circle className="pa-pulse" cx="50" cy="48" r="40" fill={`url(#${id}h)`} />
    <g className="pa-bob">
    <path d="M10 100 Q12 78 30 74 Q50 70 70 74 Q88 78 90 100Z" fill={`url(#${id}g)`} stroke="#6a4200" strokeWidth="1.2" />
    <rect x="38" y="80" width="24" height="12" rx="3" fill="#2a1a5a" stroke="#ffd24a" strokeWidth="1" />
    <circle cx="44" cy="86" r="2" fill="#ff5a8a" /><circle cx="50" cy="86" r="2" fill="#7ad8ff" /><circle cx="56" cy="86" r="2" fill="#7aff8a" />
    <circle cx="50" cy="46" r="29" fill={`url(#${id}g)`} stroke="#6a4200" strokeWidth="1.6" />
    <rect x="27" y="31" width="46" height="31" rx="15.5" fill={`url(#${id}v)`} stroke="#6a4200" strokeWidth="1.2" />
    {[[38, 40, 1.4], [60, 38, 1], [52, 52, 1.2], [44, 56, .9], [64, 50, 1.1]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fff" />)}
    <path d="M33 40 Q40 34 48 35" stroke="#fff" strokeWidth="3" fill="none" opacity=".7" strokeLinecap="round" />
    <circle cx="21" cy="46" r="5.5" fill={`url(#${id}g)`} stroke="#6a4200" /><circle cx="79" cy="46" r="5.5" fill={`url(#${id}g)`} stroke="#6a4200" />
    <path d="M50 17 l2 4 4.4 .6 -3.2 3 .8 4.4 -4 -2.2 -4 2.2 .8 -4.4 -3.2 -3 4.4 -.6z" fill="#fff6c8" stroke="#a06a00" strokeWidth=".6" />
    </g>
  </> },
  wolflegend: { bg: ["#1a2a5a", "#04081a"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".45" stopColor="#c8d4e8" /><stop offset="1" stopColor="#6a7a9a" /></linearGradient>
      <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3affb0" stopOpacity="0" /><stop offset=".5" stopColor="#3affb0" stopOpacity=".6" /><stop offset="1" stopColor="#8a6aff" stopOpacity="0" /></linearGradient>
      <radialGradient id={`${id}e`}><stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#7ae8ff" /><stop offset="1" stopColor="#1a8ad8" stopOpacity="0" /></radialGradient>
    </defs>
    <path d="M0 22 Q30 6 60 18 T100 12" stroke={`url(#${id}a)`} strokeWidth="10" fill="none" className="fx-pulse" />
    <circle className="pa-pulse" cx="80" cy="22" r="11" fill="#fff8e0" /><circle cx="84" cy="19" r="10" fill="#1a2a5a" />
    {[[14, 40], [26, 12], [92, 46], [8, 64]].map(([x, y], i) => <circle key={i} className="fx-twinkle" style={{ animationDelay: `${i * .4}s` }} cx={x} cy={y} r="1.3" fill="#fff" />)}
    <path d="M12 100 Q16 74 34 70 L50 84 L66 70 Q84 74 88 100Z" fill={`url(#${id}f)`} stroke="#3a4a6a" strokeWidth="1" />
    <path d="M28 46 L22 14 L42 32Z M72 46 L78 14 L58 32Z" fill={`url(#${id}f)`} stroke="#3a4a6a" strokeWidth="1.2" />
    <path d="M30 40 L27 22 L38 33Z M70 40 L73 22 L62 33Z" fill="#8a9aba" />
    <path d="M24 48 Q26 28 50 26 Q74 28 76 48 L68 66 L58 82 Q50 86 42 82 L32 66Z" fill={`url(#${id}f)`} stroke="#3a4a6a" strokeWidth="1.2" />
    <path d="M38 62 Q50 56 62 62 L56 80 Q50 84 44 80Z" fill="#fff" />
    <path d="M24 50 l-6 6 l8 -1 M76 50 l6 6 l-8 -1" fill="#e8eef8" stroke="#3a4a6a" strokeWidth="1" />
    <g className="pa-glow"><ellipse cx="39" cy="48" rx="7" ry="4" fill={`url(#${id}e)`} /><ellipse cx="61" cy="48" rx="7" ry="4" fill={`url(#${id}e)`} /></g>
    <path d="M35 48 h8 M57 48 h8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M33 42 l10 3 M67 42 l-10 3" stroke="#3a4a6a" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="50" cy="66" rx="5" ry="3.4" fill="#1a2030" />
    <path d="M50 69 v4 M45 75 q5 3 10 0" stroke="#3a4a6a" strokeWidth="1.4" fill="none" />
  </> },
  goldeneagle: { bg: ["#1a3a8a", "#06123a"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff6c8" /><stop offset=".35" stopColor="#ffd24a" /><stop offset=".7" stopColor="#d99a10" /><stop offset="1" stopColor="#7a4a00" /></linearGradient>
      <radialGradient id={`${id}h`}><stop offset="0" stopColor="#fff2b8" stopOpacity=".8" /><stop offset="1" stopColor="#ffd24a" stopOpacity="0" /></radialGradient>
    </defs>
    <circle className="pa-pulse" cx="50" cy="44" r="44" fill={`url(#${id}h)`} />
    {/* a ring of stars above */}
    {Array.from({ length: 9 }, (_, i) => {
      const a = (-160 + i * 17.5) * Math.PI / 180, x = 50 + Math.cos(a) * 40, y = 46 + Math.sin(a) * 40;
      return <path key={i} className="fx-twinkle" style={{ animationDelay: `${i * 0.25}s` }} d={`M${x} ${y - 3} l.9 2.1 2.2 .2 -1.7 1.4 .5 2.2 -1.9 -1.2 -1.9 1.2 .5 -2.2 -1.7 -1.4 2.2 -.2z`} fill="#fff" />;
    })}
    {/* spread wings, feathers fanning out */}
    {[1, -1].map((s) => (
      <g key={s} transform={s < 0 ? "translate(100 0) scale(-1 1)" : undefined}><g className="pa-wing">
        {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M44 50 L${6 + i * 3} ${18 + i * 8} L${12 + i * 3} ${22 + i * 8}Z`} fill={`url(#${id}g)`} stroke="#6a4200" strokeWidth=".7" />)}
        <path d="M44 44 Q28 38 18 26 Q22 48 42 58Z" fill={`url(#${id}g)`} stroke="#6a4200" strokeWidth="1" />
      </g></g>
    ))}
    {/* shield on the chest */}
    <path d="M38 50 H62 V66 Q62 78 50 84 Q38 78 38 66Z" fill="#fff" stroke="#6a4200" strokeWidth="1.4" />
    <path d="M38 50 H62 V57 H38Z" fill="#1f3f9a" />
    {[42, 47, 52, 57].map((x) => <path key={x} d={`M${x} 57 V${x < 48 ? 78 : 80}`} stroke="#c8283a" strokeWidth="2.4" />)}
    {/* head */}
    <path d="M44 46 Q44 26 52 24 Q62 24 62 34 Q62 40 56 44 Z" fill="#fff" stroke="#c8c8c8" strokeWidth="1" />
    <path d="M60 30 Q70 32 66 38 Q63 36 59 37Z" fill="#ffb020" stroke="#a06a00" strokeWidth="1" />
    <circle cx="55" cy="31" r="1.8" fill="#2a1a10" />
    {/* olive branch and arrows in the talons */}
    <path d="M30 80 Q38 76 42 82" stroke="#3a7a2a" strokeWidth="1.6" fill="none" />
    {[[31, 79], [35, 77], [39, 78]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="2.6" ry="1.2" fill="#5aa83a" transform={`rotate(-30 ${x} ${y})`} />)}
    <path d="M58 82 L72 74 M60 84 L74 78 M60 80 L72 70" stroke="#7a4a1a" strokeWidth="1.4" />
    <path d="M72 74 l3 -2 -1 3z M74 78 l3 -1 -2 3z M72 70 l3 -2 -1 3z" fill="#9aa3b0" />
  </> },
  swordsman: { bg: ["#e6f0ff", "#5a7ac8"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#c8d4e4" /><stop offset="1" stopColor="#7a8aa4" /></linearGradient>
    </defs>
    {/* the sword over the shoulder */}
    <path d="M27 92 L78 16 L86 22 L35 98Z" fill={`url(#${id}b)`} stroke="#5a6a84" strokeWidth="1" strokeLinejoin="round" />
    <path d="M78 16 L90 6 L86 22Z" fill="#e8eef6" stroke="#5a6a84" strokeWidth="1" strokeLinejoin="round" />
    <path d="M31 95 L82 19" stroke="#ffffff" strokeWidth="1.4" opacity=".9" />
    <path className="fx-twinkle" d="M88 4 l1 3 3 1 -3 1 -1 3 -1 -3 -3 -1 3 -1z" fill="#fff" />
    {/* body: a blue tunic with a leather strap */}
    <path d="M12 100 Q14 78 32 74 Q50 70 68 74 Q86 78 88 100Z" fill="#2f5aa8" stroke="#1a3570" strokeWidth="1.2" />
    <path d="M26 78 L70 100" stroke="#7a4a22" strokeWidth="6" />
    <circle cx="46" cy="87" r="3.4" fill="#e0b030" stroke="#7a5000" strokeWidth="1" />
    <path d="M40 74 L50 84 L60 74" fill="none" stroke="#e8eef6" strokeWidth="2.4" />
    {/* hilt and guard behind the shoulder */}
    <path d="M24 84 L38 92" stroke="#e0b030" strokeWidth="5" strokeLinecap="round" />
    <path d="M22 100 L30 92" stroke="#5a3010" strokeWidth="5" strokeLinecap="round" />
    {/* head */}
    <ellipse cx="50" cy="52" rx="21" ry="22" fill="#f2c9a0" />
    <path d="M29 48 Q28 26 50 24 Q72 26 71 48 Q66 38 58 38 Q52 34 46 38 Q36 36 29 48Z" fill="#3a2414" />
    <path d="M28 40 Q50 32 72 40 L72 46 Q50 38 28 46Z" fill="#c8283a" />
    <path d="M72 42 Q84 40 88 48 Q80 46 74 47Z M72 44 Q82 50 82 58 Q76 52 72 48Z" fill="#c8283a" />
    <path d="M38 50 Q42 47 46 50 M54 50 Q58 47 62 50" stroke="#2a1a10" strokeWidth="2" fill="none" strokeLinecap="round" />
    <Eyes y={54} dx={8} r={3.4} />
    <path d="M44 64 Q50 68 56 63" stroke="#2a1a10" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <Cheeks y={61} dx={14} />
  </> },
  spartanlegend: { bg: ["#c8a060", "#3a2408"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff2b0" /><stop offset=".3" stopColor="#e8b440" /><stop offset=".65" stopColor="#b07a18" /><stop offset="1" stopColor="#4a2a04" /></linearGradient>
      <linearGradient id={`${id}gv`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe48a" /><stop offset=".5" stopColor="#c8901e" /><stop offset="1" stopColor="#5a3404" /></linearGradient>
      <radialGradient id={`${id}s`} cx="40%" cy="35%"><stop offset="0" stopColor="#fff0b0" /><stop offset=".45" stopColor="#d8a030" /><stop offset=".85" stopColor="#7a4a0a" /><stop offset="1" stopColor="#3a2004" /></radialGradient>
      <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5a4a3a" /><stop offset=".55" stopColor="#c89a50" /><stop offset="1" stopColor="#f0d890" /></linearGradient>
    </defs>
    {/* storm sky */}
    <rect width="100" height="100" fill={`url(#${id}sky)`} />
    <g className="pa-drift" fill="#3a2e24" opacity=".7">
      <ellipse cx="18" cy="14" rx="22" ry="9" /><ellipse cx="80" cy="10" rx="26" ry="10" /><ellipse cx="90" cy="34" rx="16" ry="7" /><ellipse cx="6" cy="40" rx="14" ry="6" />
    </g>
    <g className="pa-zap" stroke="#fff6c8" strokeWidth="1.4" fill="none" strokeLinejoin="round">
      <path d="M86 14 L80 26 L86 28 L78 44 L84 46 L76 60" /><path d="M80 26 L72 30" />
    </g>
    <g className="pa-zap late" stroke="#fff6c8" strokeWidth="1.2" fill="none" strokeLinejoin="round"><path d="M12 6 L18 18 L12 20 L20 34" /></g>
    {[18, 26, 34, 74, 82, 90].map((x) => <path key={x} d={`M${x} 100 V91 M${x - 1.2} 92 L${x} 88 L${x + 1.2} 92`} stroke="#3a2408" strokeWidth=".9" fill="none" opacity=".6" />)}
    {/* spear */}
    <path d="M14 100 L14 18" stroke="#5a3410" strokeWidth="2.6" />
    <path d="M14 2 C19 10 19 18 14 26 C9 18 9 10 14 2Z" fill={`url(#${id}g)`} stroke="#4a2a04" strokeWidth=".8" />
    <path d="M14 4 V24" stroke="#fff2b0" strokeWidth=".7" opacity=".8" />
    {/* red cape on the shoulders */}
    <path d="M24 60 Q30 50 44 52 L56 52 Q70 50 78 60 L84 100 H18Z" fill="#8a1a14" />
    {/* muscled breastplate */}
    <path d="M30 100 L32 66 Q40 58 50 58 Q60 58 68 66 L70 100Z" fill={`url(#${id}g)`} stroke="#4a2a04" strokeWidth="1.2" />
    <path d="M36 68 Q43 64 49 68 M51 68 Q57 64 64 68" stroke="#5a3404" strokeWidth="1.2" fill="none" />
    <path d="M50 68 V96 M42 77 H58 M42 84 H58 M43 91 H57" stroke="#5a3404" strokeWidth="1" opacity=".8" />
    <path d="M38 70 Q42 66 46 68" stroke="#fff2b0" strokeWidth="1.2" fill="none" opacity=".8" />
    {/* shoulder guards */}
    <ellipse cx="30" cy="64" rx="8" ry="6" fill={`url(#${id}gv)`} stroke="#4a2a04" strokeWidth="1" />
    <ellipse cx="70" cy="64" rx="8" ry="6" fill={`url(#${id}gv)`} stroke="#4a2a04" strokeWidth="1" />
    {/* hand on the spear */}
    <ellipse cx="15" cy="72" rx="4" ry="3.4" fill="#b06a3a" />
    {/* round shield (aspis) with a meander rim */}
    <circle cx="78" cy="82" r="20" fill={`url(#${id}s)`} stroke="#3a2004" strokeWidth="1.4" />
    <circle cx="78" cy="82" r="16" fill="none" stroke="#5a3404" strokeWidth="2.6" strokeDasharray="2.2 1.4" />
    <circle cx="78" cy="82" r="10" fill="none" stroke="#fff0b0" strokeWidth=".8" opacity=".6" />
    <path d="M71 80 Q78 72 85 80 Q80 79 78 84 Q76 79 71 80Z" fill="#7a4a0a" />
    <path d="M66 74 Q72 68 80 68" stroke="#fff6d0" strokeWidth="1.6" fill="none" opacity=".7" strokeLinecap="round" />
    {/* tall dark crest, front to back */}
    <g className="pa-sway" style={{ transformOrigin: "50px 22px" }}>
      <path d="M42 22 Q40 4 54 0 Q66 0 70 14 Q66 10 60 12 Q62 18 58 26Z" fill="#1a1410" stroke="#000" strokeWidth=".6" />
      <path d="M46 18 Q46 8 54 4 M52 20 Q54 10 62 8" stroke="#4a3a2a" strokeWidth=".8" fill="none" />
    </g>
    {/* golden Corinthian helmet */}
    <path d="M36 32 Q36 16 50 15 Q64 16 64 32 L63 50 Q58 55 54 52 L54 40 L46 40 L46 52 Q42 55 37 50 Z" fill={`url(#${id}g)`} stroke="#3a2004" strokeWidth="1.4" />
    <path d="M39 30 Q44 27 48 30 L48 40 H46 L46 33 Q42 32 39 34 Z M61 30 Q56 27 52 30 L52 40 H54 L54 33 Q58 32 61 34 Z" fill="#120a04" />
    <path d="M48 30 H52 V42 H48 Z" fill={`url(#${id}gv)`} stroke="#3a2004" strokeWidth=".8" />
    <path d="M40 22 Q45 18 50 18" stroke="#fff6d0" strokeWidth="1.8" fill="none" opacity=".85" strokeLinecap="round" />
    <path d="M37 26 Q50 22 63 26" stroke="#5a3404" strokeWidth="1" fill="none" />
    {/* skirt strips (pteruges) */}
    {[34, 40, 46, 52, 58, 64].map((x, i) => <rect key={x} x={x} y="94" width="5" height="6" fill={i % 2 ? "#8a1a14" : `url(#${id}gv)`} stroke="#3a2004" strokeWidth=".5" />)}
  </> },
  auroracat: { bg: ["#0e2a3a", "#03070e"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3affc8" stopOpacity="0" /><stop offset=".3" stopColor="#3affc8" />
        <stop offset=".65" stopColor="#7a5aff" /><stop offset="1" stopColor="#ff6ad8" stopOpacity="0" /></linearGradient>
      <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3ad0ff" stopOpacity="0" /><stop offset=".5" stopColor="#3ad0ff" /><stop offset="1" stopColor="#3affc8" stopOpacity="0" /></linearGradient>
      <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a3a5a" /><stop offset="1" stopColor="#0e1428" /></linearGradient>
      <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3affc8" /><stop offset=".5" stopColor="#7a8aff" /><stop offset="1" stopColor="#d070ff" /></linearGradient>
      <radialGradient id={`${id}e`}><stop offset="0" stopColor="#eafffa" /><stop offset=".5" stopColor="#3affc8" /><stop offset="1" stopColor="#0a8a7a" /></radialGradient>
      <filter id={`${id}g`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" /></filter>
    </defs>
    {/* the sky: stars and two dancing ribbons of light */}
    {[[10, 12, 1.2], [26, 6, .9], [44, 14, 1], [80, 8, 1.3], [92, 24, .9], [6, 40, .8], [94, 54, 1]].map(([x, y, r], i) =>
      <circle key={i} className="fx-twinkle" style={{ animationDelay: `${i * .35}s` }} cx={x} cy={y} r={r} fill="#fff" />)}
    <g className="pa-drift" filter={`url(#${id}g)`} opacity=".9">
      <path d="M-10 30 C20 10 40 38 60 22 S96 8 112 20 L112 30 C96 18 76 34 60 32 S20 22 -10 40Z" fill={`url(#${id}a)`} />
      <path d="M-10 46 C18 32 46 50 70 38 S104 30 112 36 L112 42 C100 38 80 48 68 46 S22 40 -10 54Z" fill={`url(#${id}b)`} opacity=".7" />
    </g>
    {/* the cat */}
    <path d="M14 100 Q16 76 34 72 Q50 82 66 72 Q84 76 86 100Z" fill={`url(#${id}f)`} />
    <path d="M30 100 Q34 84 50 84 Q66 84 70 100Z" fill="#1a2440" />
    <path d="M25 46 L22 16 L44 32Z M75 46 L78 16 L56 32Z" fill={`url(#${id}f)`} stroke={`url(#${id}s)`} strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M28 40 L27 24 L39 33Z M72 40 L73 24 L61 33Z" fill="#7a5aff" opacity=".55" />
    <ellipse cx="50" cy="52" rx="27" ry="25" fill={`url(#${id}f)`} stroke={`url(#${id}s)`} strokeWidth="1.6" />
    {/* aurora stripes in the fur */}
    <g className="pa-glow" stroke={`url(#${id}s)`} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".9">
      <path d="M50 30 v8 M43 31 l2 7 M57 31 l-2 7" />
      <path d="M25 50 q5 -2 9 0 M75 50 q-5 -2 -9 0 M26 58 q5 -1 8 1 M74 58 q-5 -1 -8 1" strokeWidth="1.6" />
    </g>
    {/* glowing eyes */}
    <g className="pa-glow"><ellipse cx="39" cy="50" rx="6" ry="5.6" fill={`url(#${id}e)`} /><ellipse cx="61" cy="50" rx="6" ry="5.6" fill={`url(#${id}e)`} /></g>
    <ellipse cx="39" cy="50" rx="1.6" ry="4.4" fill="#04201c" /><ellipse cx="61" cy="50" rx="1.6" ry="4.4" fill="#04201c" />
    <circle cx="40.6" cy="48" r="1.2" fill="#fff" /><circle cx="62.6" cy="48" r="1.2" fill="#fff" />
    <path d="M47 58 h6 l-3 3z" fill="#ff9bd8" />
    <path d="M50 61 q-3 3 -6 1 M50 61 q3 3 6 1" stroke="#8aa8d8" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <path d="M30 57 h-13 M30 61 l-12 3 M70 57 h13 M70 61 l12 3" stroke="#bff8ec" strokeWidth="1" strokeLinecap="round" opacity=".85" />
    {/* a star charm on the collar */}
    <path d="M36 80 Q50 88 64 80" stroke={`url(#${id}s)`} strokeWidth="2.6" fill="none" />
    <path className="pa-pulse" d="M50 82 l1.6 3.4 3.6 .4 -2.7 2.4 .8 3.6 -3.3 -1.8 -3.3 1.8 .8 -3.6 -2.7 -2.4 3.6 -.4z" fill="#eafffa" />
  </> },
  catlegend: { bg: ["#4a1a7a", "#0e0420"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff6c8" /><stop offset=".4" stopColor="#ffd24a" /><stop offset="1" stopColor="#9a6a00" /></linearGradient>
      <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".6" stopColor="#f0eaff" /><stop offset="1" stopColor="#c8b8e8" /></linearGradient>
      <radialGradient id={`${id}h`}><stop offset="0" stopColor="#e0c8ff" stopOpacity=".85" /><stop offset="1" stopColor="#8a4ae0" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}e`}><stop offset="0" stopColor="#eaffd0" /><stop offset=".5" stopColor="#3ae07a" /><stop offset="1" stopColor="#0a7a3a" /></radialGradient>
    </defs>
    <g opacity=".45" className="pa-spin" style={{ transformOrigin: "50px 48px" }}>{Array.from({ length: 12 }, (_, i) => <path key={i} d="M50 48 L47 -8 H53 Z" fill="#e0c8ff" transform={`rotate(${i * 30} 50 48)`} />)}</g>
    <circle className="pa-pulse" cx="50" cy="50" r="36" fill={`url(#${id}h)`} />
    {/* royal cape */}
    <path d="M10 100 Q14 74 32 72 L50 88 L68 72 Q86 74 90 100Z" fill="#6a1ab0" />
    <path d="M14 100 Q18 80 32 76 M86 100 Q82 80 68 76" stroke="#ffd24a" strokeWidth="2" fill="none" />
    {[[24, 92], [76, 92], [34, 84], [66, 84]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.4" fill="#fff" />)}
    <path d="M30 100 Q34 82 50 80 Q66 82 70 100Z" fill={`url(#${id}f)`} />
    {/* jewelled collar */}
    <path d="M34 76 Q50 84 66 76" stroke={`url(#${id}g)`} strokeWidth="4" fill="none" strokeLinecap="round" />
    <circle className="pa-glow" cx="50" cy="81" r="3.4" fill="#2fd07a" stroke="#fff" strokeWidth="1" />
    {/* head */}
    <path d="M25 46 L24 16 L44 32Z M75 46 L76 16 L56 32Z" fill={`url(#${id}f)`} stroke="#b8a8d8" strokeWidth="1" />
    <path d="M28 40 L28 24 L40 33Z M72 40 L72 24 L60 33Z" fill="#ffc8e0" />
    <ellipse cx="50" cy="52" rx="27" ry="25" fill={`url(#${id}f)`} stroke="#c8b8e8" strokeWidth="1.2" />
    <path d="M50 30 v7 M44 31 l2 6 M56 31 l-2 6" stroke="#ffd24a" strokeWidth="2.2" strokeLinecap="round" />
    {/* glowing emerald eyes */}
    <g className="pa-glow"><ellipse cx="39" cy="50" rx="6" ry="5.4" fill={`url(#${id}e)`} /><ellipse cx="61" cy="50" rx="6" ry="5.4" fill={`url(#${id}e)`} /></g>
    <ellipse cx="39" cy="50" rx="1.6" ry="4.4" fill="#06200e" /><ellipse cx="61" cy="50" rx="1.6" ry="4.4" fill="#06200e" />
    <circle cx="40.6" cy="48" r="1.2" fill="#fff" /><circle cx="62.6" cy="48" r="1.2" fill="#fff" />
    <path d="M47 58 h6 l-3 3z" fill="#ff8ab0" />
    <path d="M50 61 q-3 3 -6 1 M50 61 q3 3 6 1" stroke="#8a7aa8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M30 56 h-13 M30 60 l-12 3 M70 56 h13 M70 60 l12 3" stroke="#ffd24a" strokeWidth="1.1" strokeLinecap="round" opacity=".9" />
    {/* crown */}
    <path d="M34 26 L32 12 L40 19 L50 7 L60 19 L68 12 L66 26 Q50 22 34 26Z" fill={`url(#${id}g)`} stroke="#7a5000" strokeWidth="1.2" strokeLinejoin="round" />
    <circle className="pa-glow" cx="50" cy="18" r="2.6" fill="#e3214a" stroke="#fff" strokeWidth=".8" />
    <circle cx="40" cy="22" r="1.5" fill="#2f7bff" /><circle cx="60" cy="22" r="1.5" fill="#2fd07a" />
    {[[12, 22, 3.4], [88, 30, 3], [16, 64, 2.4], [86, 66, 2.8]].map(([x, y, r], i) => <path key={i} className="fx-twinkle" style={{ animationDelay: `${i * .45}s` }} d={`M${x} ${y - r} L${x + r * .3} ${y - r * .3} L${x + r} ${y} L${x + r * .3} ${y + r * .3} L${x} ${y + r} L${x - r * .3} ${y + r * .3} L${x - r} ${y} L${x - r * .3} ${y - r * .3} Z`} fill="#fff" />)}
  </> },
  lantern: { bg: ["#2a3a6b", "#0f1838"], draw: (id) => <>
    <defs><radialGradient id={`${id}l`}><stop offset="0" stopColor="#fff6c0" /><stop offset=".6" stopColor="#ffc23a" /><stop offset="1" stopColor="#ff8a00" stopOpacity="0" /></radialGradient></defs>
    {[[18, 20], [80, 26], [26, 80], [84, 76], [70, 12]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.4" fill="#fff" />)}
    <circle cx="50" cy="56" r="30" fill={`url(#${id}l)`} opacity=".7" />
    <path d="M50 6 v8" stroke="#c9962b" strokeWidth="2" /><circle cx="50" cy="6" r="3" fill="none" stroke="#c9962b" strokeWidth="2" />
    <path d="M38 22 h24 l-4 -8 h-16z" fill="#d4a017" />
    <path d="M36 24 h28 l6 18 v22 l-6 14 h-28 l-6 -14 v-22z" fill="#ffd46a" stroke="#b8860b" strokeWidth="2.4" />
    <path d="M50 24 v54 M36 42 h28 M36 64 h28 M30 42 l6 0 M64 42 h6" stroke="#b8860b" strokeWidth="2" />
    <path d="M44 50 a6 6 0 1 0 6 -8 a5 5 0 1 1 -6 8z" fill="#b8860b" />
    <path d="M40 78 h20 l-4 8 h-12z" fill="#d4a017" />
  </> },
  crescent: { bg: ["#1f3a6b", "#0a1430"], draw: () => <>
    {[[20, 24, 1.6], [78, 20, 1.2], [84, 66, 1.6], [16, 70, 1.2], [60, 86, 1.2], [36, 12, 1]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fff" />)}
    <circle cx="46" cy="52" r="28" fill="#ffd96a" />
    <circle cx="58" cy="44" r="25" fill="#0f2048" />
    <path d="M70 38 l3.2 6.8 7.3 .9 -5.4 5 1.4 7.3 -6.5 -3.6 -6.5 3.6 1.4 -7.3 -5.4 -5 7.3 -.9z" fill="#ffe9a8" />
  </> },
  football: { bg: ["#d8f5d0", "#3fae4a"], draw: () => <>
    <path d="M0 74 h100 v26 h-100z" fill="#2f8a3a" /><path d="M0 74 h100" stroke="#fff" strokeWidth="1.5" opacity=".7" />
    <circle cx="50" cy="48" r="28" fill="#fff" stroke="#2a2a2a" strokeWidth="2" />
    <path d="M50 36 l11 8 -4 13 h-14 l-4 -13z" fill="#2a2a2a" />
    <path d="M50 36 v-15 M61 44 l14 -5 M57 57 l9 12 M43 57 l-9 12 M39 44 l-14 -5" stroke="#2a2a2a" strokeWidth="2" />
    <path d="M26 39 l-2 10 M74 39 l2 10 M34 69 l10 6 M66 69 l-10 6 M44 21 h12" stroke="#2a2a2a" strokeWidth="5" strokeLinecap="round" />
    <path d="M32 34 a24 24 0 0 1 14 -10" stroke="#fff" strokeWidth="3" fill="none" opacity=".6" strokeLinecap="round" />
  </> },

  // ---- sold for gems ----
  panda: { bg: ["#e8f8e0", "#8ad06a"], draw: () => <>
    <Body fill="#2a2a2a" />
    <circle cx="28" cy="28" r="10" fill="#2a2a2a" /><circle cx="72" cy="28" r="10" fill="#2a2a2a" />
    <circle cx="50" cy="52" r="28" fill="#fff" />
    <ellipse cx="39" cy="48" rx="7" ry="9" fill="#2a2a2a" transform="rotate(-25 39 48)" /><ellipse cx="61" cy="48" rx="7" ry="9" fill="#2a2a2a" transform="rotate(25 61 48)" />
    <circle cx="40" cy="47" r="2.6" fill="#fff" /><circle cx="60" cy="47" r="2.6" fill="#fff" />
    <ellipse cx="50" cy="60" rx="4.5" ry="3.2" fill="#2a2a2a" />
    <Smile y={64} w={4} />
    <Cheeks y={60} dx={18} />
    <path d="M70 86 l10 -22 M76 70 l6 2 M73 77 l6 2" stroke="#4aa83a" strokeWidth="3.4" strokeLinecap="round" />
  </> },
  penguin: { bg: ["#dff4ff", "#6ec3f0"], draw: () => <>
    <ellipse cx="50" cy="62" rx="30" ry="38" fill="#20283a" />
    <path d="M50 30 Q30 34 30 58 Q30 86 50 92 Q70 86 70 58 Q70 34 50 30Z" fill="#fff" />
    <path d="M50 30 Q42 30 38 40 Q50 38 50 46 Q50 38 62 40 Q58 30 50 30Z" fill="#20283a" />
    <Eyes y={46} dx={9} r={3.6} color="#20283a" />
    <path d="M44 54 h12 l-6 6z" fill="#ffa62a" />
    <Cheeks y={56} dx={14} />
    <path d="M30 92 h40" stroke="#ffa62a" strokeWidth="5" strokeLinecap="round" />
    <path d="M40 86 l-6 8 M60 86 l6 8" stroke="#ffa62a" strokeWidth="4" strokeLinecap="round" />
  </> },
  koala: { bg: ["#e2f0e8", "#7fae90"], draw: () => <>
    <Body fill="#8e98a6" />
    <circle cx="24" cy="36" r="15" fill="#8e98a6" /><circle cx="76" cy="36" r="15" fill="#8e98a6" />
    <circle cx="24" cy="36" r="8" fill="#f2d8de" /><circle cx="76" cy="36" r="8" fill="#f2d8de" />
    <ellipse cx="50" cy="52" rx="26" ry="25" fill="#a8b2be" />
    <Eyes y={46} dx={12} r={3.4} />
    <ellipse cx="50" cy="56" rx="7" ry="9" fill="#3a3f4a" /><ellipse cx="48" cy="52" rx="2" ry="3" fill="#fff" opacity=".4" />
    <Smile y={68} w={4} />
  </> },
  unicorn: { bg: ["#ffe3f6", "#c88aff"], draw: (id) => <>
    <defs><linearGradient id={`${id}h`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ffd46a" /><stop offset="1" stopColor="#fff6c0" /></linearGradient></defs>
    <Body fill="#fff" />
    <path d="M22 30 Q14 54 22 78 Q30 60 30 44Z" fill="#ff8ad0" /><path d="M24 40 Q18 60 26 80 Q32 64 32 50Z" fill="#8ad0ff" />
    <path d="M32 26 L36 12 L44 26Z M68 26 L64 12 L56 26Z" fill="#fff" />
    <ellipse cx="50" cy="52" rx="24" ry="27" fill="#fff" stroke="#f0e0f4" strokeWidth="1.5" />
    <path d="M44 28 L50 2 L56 28Z" fill={`url(#${id}h)`} stroke="#e0a020" strokeWidth="1" />
    <path d="M46 20 l8 -3 M45 25 l9 -3" stroke="#e0a020" strokeWidth="1.2" />
    <path d="M34 24 Q50 16 66 26 Q54 30 44 34Z" fill="#c88aff" />
    <Eyes y={50} dx={10} r={4.2} color="#6a3a8a" />
    <ellipse cx="50" cy="68" rx="12" ry="8" fill="#ffe3f6" />
    <circle cx="45" cy="67" r="1.4" fill="#c070a0" /><circle cx="55" cy="67" r="1.4" fill="#c070a0" />
    <Cheeks y={60} dx={17} color="#ff8ad0" />
  </> },
  unicornepic: { bg: ["#fff0fb", "#9a6aff"], draw: (id) => <>
    <defs>
      <linearGradient id={`${id}h`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ffb020" /><stop offset=".5" stopColor="#ffe46a" /><stop offset="1" stopColor="#fffbe0" /></linearGradient>
      <linearGradient id={`${id}m`} x1="0" y1="0" x2="0" y2="1">
        {["#ff5a8a", "#ffa24a", "#ffe04a", "#5ad08a", "#4ab0ff", "#a07aff"].map((c, i) => <stop key={c} offset={i / 5} stopColor={c} />)}
      </linearGradient>
      <radialGradient id={`${id}g`}><stop offset="0" stopColor="#fffbe0" stopOpacity=".95" /><stop offset="1" stopColor="#fffbe0" stopOpacity="0" /></radialGradient>
    </defs>
    {/* soft rainbow arc and sparkles behind */}
    <path d="M6 70 A44 44 0 0 1 94 70" fill="none" stroke={`url(#${id}m)`} strokeWidth="6" opacity=".35" />
    {[[14, 22, 3], [86, 18, 2.6], [10, 52, 2], [90, 46, 2.4], [78, 6, 1.8]].map(([x, y, r], i) => <path key={i} className="fx-twinkle" style={{ animationDelay: `${i * .4}s` }}
      d={`M${x} ${y - r} L${x + r * .3} ${y - r * .3} L${x + r} ${y} L${x + r * .3} ${y + r * .3} L${x} ${y + r} L${x - r * .3} ${y + r * .3} L${x - r} ${y} L${x - r * .3} ${y - r * .3} Z`} fill="#fff" />)}
    {/* feathered collar of light */}
    <path d="M18 100 Q22 80 36 76 Q50 86 64 76 Q78 80 82 100Z" fill="#fff" />
    <path d="M30 100 Q34 86 50 88 Q66 86 70 100Z" fill="#f4e8ff" />
    <path d="M38 80 Q50 90 62 80" stroke="#ffd24a" strokeWidth="2.4" fill="none" />
    <circle cx="50" cy="88" r="3" fill="#ff7ab8" stroke="#fff" strokeWidth="1" />
    {/* flowing rainbow mane */}
    <path className="pa-sway" style={{ transformOrigin: "40px 30px" }} d="M40 22 Q14 30 16 56 Q14 74 26 86 Q22 70 30 62 Q24 78 36 84 Q30 66 38 50 Q34 36 44 30Z" fill={`url(#${id}m)`} />
    <path d="M30 26 L34 10 L42 24Z M70 26 L66 10 L58 24Z" fill="#fff" stroke="#efe0ff" strokeWidth="1" />
    <path d="M33 22 L35 15 L39 22Z M67 22 L65 15 L61 22Z" fill="#ffc4e6" />
    <ellipse cx="50" cy="52" rx="24" ry="27" fill="#fff" stroke="#efe0ff" strokeWidth="1.5" />
    <path d="M38 22 Q50 14 64 22 Q60 32 50 34 Q42 30 38 22Z" fill={`url(#${id}m)`} opacity=".95" />
    {/* glowing golden horn */}
    <circle className="pa-pulse" cx="50" cy="12" r="12" fill={`url(#${id}g)`} />
    <path d="M44.5 27 L50 -1 L55.5 27Z" fill={`url(#${id}h)`} stroke="#d08a00" strokeWidth="1" />
    <path d="M46 21 l8 -3 M45.4 25 l9 -3 M47 16 l6 -2.4 M48 10 l4 -1.6" stroke="#d08a00" strokeWidth="1.1" />
    {/* big starry eyes */}
    <g>{[39, 61].map((x) => <g key={x}><ellipse cx={x} cy="50" rx="5.2" ry="6" fill="#4a2a8a" /><circle cx={x + 1.8} cy="47.6" r="2" fill="#fff" />
      <path d={`M${x - 1.4} 53 l1 -1.4 1 1.4 1.4 .2 -1 1 .3 1.4 -1.3 -.7 -1.3 .7 .3 -1.4 -1 -1z`} fill="#ffd8ff" /></g>)}</g>
    <path d="M33 44 q3 -4 8 -3 M67 44 q-3 -4 -8 -3" stroke="#4a2a8a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <ellipse cx="50" cy="68" rx="12" ry="8" fill="#ffe8f6" />
    <circle cx="45" cy="67" r="1.4" fill="#c070a0" /><circle cx="55" cy="67" r="1.4" fill="#c070a0" />
    <path d="M45 72 q5 4 10 0" stroke="#c070a0" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <Cheeks y={60} dx={18} color="#ff8ad0" />
  </> },
  dino: { bg: ["#e0f8d8", "#6ad06a"], draw: () => <>
    <Body fill="#3fae5a" />
    {[22, 34, 46].map((y, i) => <path key={y} d={`M${70 + i * 3} ${y} l10 4 -8 6z`} fill="#ffb020" />)}
    <path d="M26 58 Q24 24 50 22 Q76 22 76 50 Q76 74 52 78 Q30 78 26 58Z" fill="#5ac46a" />
    <path d="M28 62 Q50 72 74 60 Q70 76 52 78 Q32 78 28 62Z" fill="#c8f0b0" />
    <circle cx="40" cy="42" r="8" fill="#fff" /><circle cx="60" cy="42" r="8" fill="#fff" />
    <circle cx="41" cy="43" r="4" fill="#2a3a10" /><circle cx="61" cy="43" r="4" fill="#2a3a10" />
    <circle cx="42.4" cy="41.6" r="1.5" fill="#fff" /><circle cx="62.4" cy="41.6" r="1.5" fill="#fff" />
    <path d="M38 62 Q50 70 62 62" fill="none" stroke="#2f6b3a" strokeWidth="2" strokeLinecap="round" />
    <path d="M43 64 l2 3 2 -2.4 M53 65 l2 2.4 2 -3" fill="#fff" />
    <circle cx="44" cy="54" r="1.4" fill="#2f6b3a" /><circle cx="56" cy="54" r="1.4" fill="#2f6b3a" />
  </> },
  astronaut: { bg: ["#1b1f4a", "#05061a"], draw: (id) => <>
    <defs><linearGradient id={`${id}v`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8ad0ff" /><stop offset=".5" stopColor="#3a5ab0" /><stop offset="1" stopColor="#1a2060" /></linearGradient></defs>
    {[[14, 20], [86, 14], [80, 46], [12, 60], [30, 8]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.3" fill="#fff" />)}
    <circle cx="84" cy="30" r="6" fill="#ff8a5a" /><ellipse cx="84" cy="30" rx="10" ry="2.4" fill="none" stroke="#ffd0b0" strokeWidth="1.2" />
    <Body fill="#eef2f8" />
    <rect x="40" y="80" width="20" height="10" rx="3" fill="#ff5a5a" />
    <circle cx="50" cy="48" r="28" fill="#f4f6fb" stroke="#c8d0dc" strokeWidth="2" />
    <rect x="28" y="34" width="44" height="30" rx="15" fill={`url(#${id}v)`} />
    <path d="M34 42 Q40 36 48 37" stroke="#fff" strokeWidth="3" fill="none" opacity=".7" strokeLinecap="round" />
    <circle cx="22" cy="48" r="5" fill="#c8d0dc" /><circle cx="78" cy="48" r="5" fill="#c8d0dc" />
  </> },
  robot: { bg: ["#dff6ff", "#3fc3e0"], draw: () => <>
    <Body fill="#7d8a9e" />
    <path d="M50 10 v12" stroke="#5a6676" strokeWidth="3" /><circle cx="50" cy="9" r="5" fill="#ff5a5a" />
    <rect x="22" y="22" width="56" height="52" rx="12" fill="#c8d4e2" stroke="#7d8a9e" strokeWidth="2" />
    <rect x="14" y="38" width="8" height="18" rx="3" fill="#7d8a9e" /><rect x="78" y="38" width="8" height="18" rx="3" fill="#7d8a9e" />
    <rect x="30" y="32" width="40" height="22" rx="8" fill="#1f2f40" />
    <circle cx="41" cy="43" r="5" fill="#5ae0ff" /><circle cx="59" cy="43" r="5" fill="#5ae0ff" />
    <circle cx="42.5" cy="41.5" r="1.6" fill="#fff" /><circle cx="60.5" cy="41.5" r="1.6" fill="#fff" />
    <rect x="36" y="60" width="28" height="7" rx="3" fill="#1f2f40" />
    <path d="M42 60 v7 M50 60 v7 M58 60 v7" stroke="#5ae0ff" strokeWidth="1.5" />
  </> },
  ninja: { bg: ["#ffe0e0", "#e04a4a"], draw: () => <>
    <Body fill="#2a2f3a" />
    <circle cx="50" cy="50" r="28" fill="#2a2f3a" />
    <rect x="22" y="40" width="56" height="16" rx="8" fill="#f2c9a0" />
    <path d="M22 40 h56 v5 h-56z" fill="#d6283a" />
    <path d="M76 42 q14 -2 18 -10 q-4 12 -16 14z M76 44 q12 4 16 12 q-8 -6 -16 -6z" fill="#d6283a" />
    <path d="M33 49 q5 -4 10 0 M57 49 q5 -4 10 0" stroke="#2a2f3a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <circle cx="38" cy="50" r="2.4" fill="#2a2f3a" /><circle cx="62" cy="50" r="2.4" fill="#2a2f3a" />
    <path d="M34 46 l9 2 M66 46 l-9 2" stroke="#2a2f3a" strokeWidth="2" strokeLinecap="round" />
  </> },
  phoenix: { bg: ["#ffe8c0", "#ff5a2a"], draw: () => <>
    {[-50, -25, 0, 25, 50].map((a, i) => <path key={a} d="M50 60 Q44 30 50 6 Q56 30 50 60Z" fill={["#ff3d00", "#ff8a00", "#ffd54f", "#ff8a00", "#ff3d00"][i]} transform={`rotate(${a} 50 64)`} />)}
    <path d="M14 70 Q24 44 44 50 Q30 58 34 72Z M86 70 Q76 44 56 50 Q70 58 66 72Z" fill="#ff6a1a" />
    <Body fill="#ff7a1a" />
    <ellipse cx="50" cy="60" rx="20" ry="22" fill="#ffa020" />
    <path d="M38 50 q-4 -14 6 -18 q-2 8 2 12z M62 50 q4 -14 -6 -18 q2 8 -2 12z" fill="#ffd54f" />
    <Eyes y={56} dx={8} r={3.4} color="#5a1a00" />
    <path d="M45 64 h10 l-5 7z" fill="#ffe08a" stroke="#c96a00" strokeWidth="1" />
  </> },
  dragon: { bg: ["#e0ffe8", "#2fae6a"], draw: () => <>
    <path d="M10 60 Q20 30 36 36 L30 48 L40 46 L34 58Z M90 60 Q80 30 64 36 L70 48 L60 46 L66 58Z" fill="#1f8a4a" />
    <Body fill="#2f9a5a" />
    <path d="M32 30 Q30 14 22 8 Q38 12 42 26Z M68 30 Q70 14 78 8 Q62 12 58 26Z" fill="#ffd46a" />
    <path d="M26 54 Q24 26 50 24 Q76 26 74 54 Q72 72 50 80 Q28 72 26 54Z" fill="#3fbf6a" />
    <path d="M36 64 Q50 60 64 64 Q62 80 50 82 Q38 80 36 64Z" fill="#c8f0b0" />
    <path d="M44 24 l3 -6 3 6 3 -6 3 6" fill="#ffd46a" />
    <ellipse cx="39" cy="46" rx="6" ry="5" fill="#fff6a0" /><ellipse cx="61" cy="46" rx="6" ry="5" fill="#fff6a0" />
    <ellipse cx="39" cy="46" rx="1.8" ry="4.4" fill="#1a2a10" /><ellipse cx="61" cy="46" rx="1.8" ry="4.4" fill="#1a2a10" />
    <path d="M32 40 l12 3 M68 40 l-12 3" stroke="#1f6b3a" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="45" cy="66" r="1.6" fill="#1f6b3a" /><circle cx="55" cy="66" r="1.6" fill="#1f6b3a" />
    <path d="M42 73 Q50 77 58 73" fill="none" stroke="#1f6b3a" strokeWidth="1.8" strokeLinecap="round" />
  </> },
  kinglion: { bg: ["#3a2a00", "#120c00"], draw: () => <>
    {Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return <circle key={i} cx={50 + Math.cos(a) * 26} cy={52 + Math.sin(a) * 26} r="11" fill={i % 2 ? "#c9962b" : "#e0a830"} />; })}
    <circle cx="50" cy="52" r="25" fill="#b8860b" />
    <ellipse cx="50" cy="54" rx="19" ry="20" fill="#f6c46e" />
    <path d="M32 26 L30 10 L40 18 L50 6 L60 18 L70 10 L68 26Z" fill="#ffd24a" stroke="#8a6400" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="50" cy="20" r="3" fill="#e3214a" /><circle cx="38" cy="22" r="2" fill="#2f7bff" /><circle cx="62" cy="22" r="2" fill="#22c27e" />
    <Eyes y={50} dx={8.5} r={3.4} />
    <ellipse cx="50" cy="63" rx="9" ry="7" fill="#fff1d6" />
    <path d="M45.5 58 h9 l-4.5 4.5 z" fill="#5a2c10" />
    <path d="M50 62.5 v3 M50 65.5 q-3.5 3 -6 0 M50 65.5 q3.5 3 6 0" stroke="#5a2c10" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  </> },
  cosmiccat: { bg: ["#2a1050", "#0a0420"], draw: (id) => <>
    <defs><linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7f5fff" /><stop offset=".5" stopColor="#c050d0" /><stop offset="1" stopColor="#2a6bff" /></linearGradient></defs>
    <Body fill={`url(#${id}c)`} />
    <path d="M24 44 L26 14 L46 32Z M76 44 L74 14 L54 32Z" fill={`url(#${id}c)`} />
    <ellipse cx="50" cy="52" rx="28" ry="25" fill={`url(#${id}c)`} />
    {[[36, 34], [62, 30], [70, 60], [30, 64], [50, 72], [44, 30]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 1 : 1.5} fill="#fff" />)}
    <path d="M58 64 l1.4 3 3 .4 -2.2 2 .6 3 -2.8 -1.5 -2.8 1.5 .6 -3 -2.2 -2 3 -.4z" fill="#ffe9a8" />
    <ellipse cx="39" cy="49" rx="5" ry="6" fill="#ffe94d" /><ellipse cx="61" cy="49" rx="5" ry="6" fill="#ffe94d" />
    <ellipse cx="39" cy="49" rx="1.8" ry="5" fill="#1a0a30" /><ellipse cx="61" cy="49" rx="1.8" ry="5" fill="#1a0a30" />
    <path d="M47 57 h6 l-3 3z" fill="#ff9bf0" />
    <path d="M30 56 h-12 M30 60 l-11 3 M70 56 h12 M70 60 l11 3" stroke="#e8d8ff" strokeWidth="1.3" strokeLinecap="round" />
  </> },
  elephant: { bg: ["#eef4ff", "#9ab4e0"], draw: () => <>
    <Body fill="#a8b4c8" />
    <path d="M28 40 C6 34 6 70 26 70 C32 64 32 50 30 42Z M72 40 C94 34 94 70 74 70 C68 64 68 50 70 42Z" fill="#b8c4d8" stroke="#8a98b0" strokeWidth="1.2" />
    <path d="M24 46 C14 46 14 62 24 64Z M76 46 C86 46 86 62 76 64Z" fill="#f4c0cc" />
    <ellipse cx="50" cy="50" rx="24" ry="24" fill="#b8c4d8" />
    <path d="M44 58 C44 74 42 84 50 90 C54 92 58 90 56 86 C52 84 54 72 56 58Z" fill="#b8c4d8" stroke="#8a98b0" strokeWidth="1.2" />
    <path d="M46 66 h8 M46 72 h8 M47 78 h7" stroke="#8a98b0" strokeWidth="1" />
    <Eyes y={48} dx={11} r={4} />
    <Cheeks y={58} dx={17} color="#ff9ab0" />
  </> },
  monkey: { bg: ["#fff6e0", "#e0a860"], draw: () => <>
    <Body fill="#8a5a34" />
    <circle cx="24" cy="50" r="10" fill="#8a5a34" /><circle cx="76" cy="50" r="10" fill="#8a5a34" />
    <circle cx="24" cy="50" r="6" fill="#f0c8a0" /><circle cx="76" cy="50" r="6" fill="#f0c8a0" />
    <circle cx="50" cy="50" r="25" fill="#8a5a34" />
    <path d="M50 38 C40 30 30 38 32 50 C30 64 40 74 50 74 C60 74 70 64 68 50 C70 38 60 30 50 38Z" fill="#f0c8a0" />
    <path d="M44 22 q6 -8 10 2" stroke="#6a4020" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Eyes y={48} dx={8} r={4} />
    <ellipse cx="47" cy="58" rx="1.2" ry="1" fill="#5a3010" /><ellipse cx="53" cy="58" rx="1.2" ry="1" fill="#5a3010" />
    <path d="M40 63 Q50 72 60 63" stroke="#5a3010" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M70 84 q14 -8 10 -24 q-2 -6 -6 -2" stroke="#6a4020" strokeWidth="3" fill="none" strokeLinecap="round" />
  </> },
  hedgehog: { bg: ["#f4fff0", "#a8d890"], draw: () => <>
    <Body fill="#7a5a40" />
    <g fill="#6a4a30">{Array.from({ length: 13 }, (_, i) => <path key={i} d="M50 50 L46 14 L54 14Z" transform={`rotate(${-90 + i * 15} 50 54)`} />)}</g>
    <circle cx="50" cy="54" r="30" fill="#7a5a40" />
    <path d="M30 60 C30 44 42 38 50 38 C58 38 70 44 70 60 C70 74 60 80 50 80 C40 80 30 74 30 60Z" fill="#f4dcc0" />
    <Eyes y={56} dx={9} r={3.8} />
    <circle cx="50" cy="66" r="3" fill="#2a1a10" />
    <path d="M46 71 q4 3 8 0" stroke="#2a1a10" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <Cheeks y={66} dx={14} />
    <circle cx="70" cy="30" r="5" fill="#e0283a" /><path d="M70 25 q2 -4 5 -4" stroke="#3a8a30" strokeWidth="1.6" fill="none" />
  </> },
  lamb: { bg: ["#eefaff", "#a0d8f0"], draw: () => <>
    <Body fill="#fff" />
    <g fill="#fff" stroke="#e4e4ec" strokeWidth="1">{[[34, 34], [44, 28], [56, 28], [66, 34], [30, 46], [70, 46]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="9" />)}</g>
    <path d="M28 46 C16 44 14 52 24 56Z M72 46 C84 44 86 52 76 56Z" fill="#f0c8c0" />
    <ellipse cx="50" cy="56" rx="19" ry="21" fill="#fff4ec" stroke="#eadcd0" strokeWidth="1" />
    <Eyes y={54} dx={8} r={3.6} />
    <path d="M47 64 h6 l-3 3z" fill="#ff8aa0" />
    <path d="M50 67 q-3 3 -5 1 M50 67 q3 3 5 1" stroke="#a07070" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <Cheeks y={63} dx={13} />
    <path d="M38 84 h24" stroke="#ff6a8a" strokeWidth="4" strokeLinecap="round" /><circle cx="50" cy="90" r="4" fill="#ffd24a" stroke="#c89a00" />
  </> },
  raccoon: { bg: ["#f0f0ff", "#9090c0"], draw: () => <>
    <Body fill="#8a8a96" />
    <path d="M26 42 L24 18 L42 30Z M74 42 L76 18 L58 30Z" fill="#6a6a76" />
    <path d="M28 38 L28 24 L38 31Z M72 38 L72 24 L62 31Z" fill="#2a2a32" />
    <ellipse cx="50" cy="54" rx="27" ry="24" fill="#a0a0ac" />
    <path d="M22 50 Q36 38 50 50 Q64 38 78 50 Q70 60 58 56 L50 60 L42 56 Q30 60 22 50Z" fill="#2a2a32" />
    <path d="M50 40 v10" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    <Eyes y={50} dx={11} r={3.8} color="#000" />
    <ellipse cx="50" cy="66" rx="12" ry="9" fill="#f0f0f4" />
    <ellipse cx="50" cy="62" rx="3.4" ry="2.4" fill="#2a2a32" />
    <Smile y={67} w={4} />
  </> },
  doctor: { bg: ["#eefcff", "#80d0e0"], draw: () => <>
    <Body fill="#fff" />
    <path d="M42 82 L50 94 L58 82" fill="#5ab0d0" />
    <path d="M36 82 C30 92 38 98 44 96" stroke="#3a3a48" strokeWidth="2" fill="none" /><circle cx="44" cy="96" r="3" fill="#a0a0b0" />
    <ellipse cx="50" cy="56" rx="22" ry="22" fill="#e8b890" />
    <path d="M28 54 C26 30 40 24 50 24 C62 24 74 30 72 54 C68 42 60 38 50 38 C40 38 32 42 28 54Z" fill="#3a2414" />
    <rect x="35" y="27" width="30" height="9" rx="4" fill="#fff" stroke="#d0e0e8" />
    <path d="M50 28 v7 M46.5 31.5 h7" stroke="#e0283a" strokeWidth="2.2" />
    <Eyes y={56} dx={9} r={3.6} />
    <Smile y={66} w={5} />
    <Cheeks y={63} dx={15} />
  </> },
  builder: { bg: ["#fffbe0", "#ffc840"], draw: () => <>
    <Body fill="#3a6ab0" />
    <path d="M30 90 L42 80 M70 90 L58 80" stroke="#ffa020" strokeWidth="6" />
    <path d="M32 88 L41 81 M68 88 L59 81" stroke="#e8e8e8" strokeWidth="2" />
    <ellipse cx="50" cy="58" rx="22" ry="21" fill="#f2c4a0" />
    <path d="M28 46 C28 26 40 20 50 20 C60 20 72 26 72 46Z" fill="#ffc820" stroke="#c89400" strokeWidth="1.4" />
    <rect x="24" y="43" width="52" height="6" rx="3" fill="#ffb000" stroke="#c89400" />
    <path d="M50 20 v23" stroke="#e8a800" strokeWidth="5" />
    <Eyes y={58} dx={9} r={3.6} />
    <Smile y={67} w={5} />
    <Cheeks y={64} dx={15} />
  </> },
  // Three Rare macaws: red, yellow and green
  parrot: { bg: ["#e6fff0", "#2aa86a"], draw: macaw({ body: ["#ff5a4a", "#c81e2a"], wingTop: "#ffd23a", wingBottom: "#3ac0f0", tail: "#1a5ad0", tailMid: "#e8302a", crest: "#ff7a5a", lines: "#e8a0a0" }) },
  yellowmacaw: { bg: ["#e6f6ff", "#2a8ad0"], draw: macaw({ body: ["#ffe45a", "#f0a818"], wingTop: "#3ac0f0", wingBottom: "#1a6ad0", tail: "#123a9a", tailMid: "#2a8ae0", crest: "#3ac0f0", lines: "#6a6a6a" }) },
  greenmacaw: { bg: ["#fff4e0", "#f0a040"], draw: macaw({ body: ["#7ad85a", "#2a9a3a"], wingTop: "#3ac0b0", wingBottom: "#1a6ad0", tail: "#e8302a", tailMid: "#3a8ad0", crest: "#e8302a", lines: "#c84a4a" }) },
  giraffe: { bg: ["#eef8ff", "#7ac0f0"], draw: () => <>
    <path d="M38 100 L42 60 H58 L62 100Z" fill="#f4c040" />
    <g fill="#c07a2a">{[[46, 72, 4], [54, 84, 4.5], [45, 92, 3.6], [55, 66, 3]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}</g>
    <path d="M40 18 v-8 M60 18 v-8" stroke="#c07a2a" strokeWidth="3.4" strokeLinecap="round" /><circle cx="40" cy="9" r="3.4" fill="#8a4a1a" /><circle cx="60" cy="9" r="3.4" fill="#8a4a1a" />
    <path d="M28 26 L18 22 L26 32Z M72 26 L82 22 L74 32Z" fill="#f4c040" stroke="#c08a20" strokeWidth="1" />
    <path d="M32 22 C30 40 34 56 40 62 C44 68 56 68 60 62 C66 56 70 40 68 22 C62 14 38 14 32 22Z" fill="#f4c040" />
    <ellipse cx="50" cy="56" rx="14" ry="10" fill="#f8dca0" />
    <g fill="#c07a2a"><circle cx="38" cy="26" r="3" /><circle cx="62" cy="28" r="3.4" /><circle cx="50" cy="20" r="2.4" /></g>
    <Eyes y={38} dx={10} r={3.8} />
    <circle cx="45" cy="54" r="1.4" fill="#6a3a10" /><circle cx="55" cy="54" r="1.4" fill="#6a3a10" />
    <path d="M44 60 q6 4 12 0" stroke="#6a3a10" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <Cheeks y={48} dx={15} />
  </> },
  octopus: { bg: ["#e8f4ff", "#3a80d0"], draw: () => <>
    <g fill="none" stroke="#c060d0" strokeWidth="7" strokeLinecap="round">
      <path d="M28 62 Q16 74 22 86 Q26 92 18 94" /><path d="M38 66 Q34 80 40 90" /><path d="M46 68 Q46 82 42 94" />
      <path d="M54 68 Q54 82 58 94" /><path d="M62 66 Q66 80 60 90" /><path d="M72 62 Q84 74 78 86 Q74 92 82 94" />
    </g>
    <path d="M22 60 C18 30 34 12 50 12 C66 12 82 30 78 60 C74 72 26 72 22 60Z" fill="#d070e0" />
    <circle cx="36" cy="28" r="4" fill="#e8a0f0" /><circle cx="64" cy="24" r="3" fill="#e8a0f0" />
    <Eyes y={46} dx={12} r={5} />
    <Smile y={58} w={6} />
    <Cheeks y={54} dx={20} color="#ff70b0" />
    <circle className="fx-twinkle" cx="86" cy="20" r="3" fill="none" stroke="#fff" strokeWidth="1.2" /><circle cx="90" cy="34" r="2" fill="none" stroke="#fff" strokeWidth="1" />
  </> },
  whale: { bg: ["#e0f6ff", "#2a8ad0"], draw: () => <>
    <path d="M30 22 q-4 -10 2 -14 M50 18 v-14 M70 22 q4 -10 -2 -14" stroke="#bfeaff" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M10 60 C10 30 90 30 90 60 C90 84 70 92 50 92 C30 92 10 84 10 60Z" fill="#3a78c8" />
    <path d="M18 72 C26 86 74 86 82 72 C78 90 22 90 18 72Z" fill="#d8f0ff" />
    <path d="M84 50 q10 -14 12 -2 q-2 8 -10 8z" fill="#3a78c8" />
    <Eyes y={58} dx={18} r={4.4} />
    <Smile y={66} w={6} />
    <Cheeks y={66} dx={26} color="#ff8ab8" />
  </> },
  ballerina: { bg: ["#fff0fa", "#f0a0d8"], draw: () => <>
    <path d="M14 100 Q30 76 50 78 Q70 76 86 100Z" fill="#ffc8e8" />
    <path d="M20 100 Q34 82 50 84 Q66 82 80 100Z" fill="#ffb0dc" opacity=".8" />
    <path d="M38 78 Q50 72 62 78 L60 90 H40Z" fill="#ff8ac8" />
    <ellipse cx="50" cy="54" rx="20" ry="21" fill="#f6d0b0" />
    <path d="M30 56 C26 32 40 30 50 30 C60 30 74 32 70 56 C68 44 62 38 50 38 C38 38 32 44 30 56Z" fill="#6a3a1a" />
    <circle cx="50" cy="24" r="9" fill="#6a3a1a" />
    <path d="M40 30 q10 -6 20 0" stroke="#ff8ac8" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Eyes y={54} dx={8} r={3.4} />
    <Smile y={63} w={4} color="#c0405a" />
    <Cheeks y={60} dx={13} />
    {[[18, 30], [82, 40]].map(([x, y], i) => <path key={i} className="fx-twinkle" style={{ animationDelay: `${i * .6}s` }} d={`M${x} ${y - 4} L${x + 1.2} ${y - 1.2} L${x + 4} ${y} L${x + 1.2} ${y + 1.2} L${x} ${y + 4} L${x - 1.2} ${y + 1.2} L${x - 4} ${y} L${x - 1.2} ${y - 1.2}Z`} fill="#fff" />)}
  </> },
  scientist: { bg: ["#f0fff4", "#60d0a0"], draw: () => <>
    <Body fill="#fff" />
    <path d="M44 82 L50 92 L56 82" fill="#6a4ad0" />
    <path d="M70 76 h10 v8 l6 12 h-22 l6 -12z" fill="#e8f8ff" stroke="#a0c0d0" strokeWidth="1" /><path d="M66 92 h18 l2 4 h-22z" fill="#40e080" />
    <circle className="fx-twinkle" cx="76" cy="70" r="2" fill="#40e080" />
    <ellipse cx="50" cy="56" rx="22" ry="22" fill="#f0c49c" />
    <path d="M26 50 C20 30 34 18 50 20 C66 18 80 30 74 50 C72 36 64 32 50 32 C36 32 28 36 26 50Z" fill="#e85a20" />
    <circle cx="40" cy="55" r="7" fill="#e8f8ff" stroke="#3a3a48" strokeWidth="2" /><circle cx="60" cy="55" r="7" fill="#e8f8ff" stroke="#3a3a48" strokeWidth="2" />
    <path d="M47 55 h6" stroke="#3a3a48" strokeWidth="2" />
    <Eyes y={55} dx={10} r={3} />
    <Smile y={67} w={5} />
    <Cheeks y={64} dx={16} />
  </> },
  wizardkid: { bg: ["#2a1a5a", "#0e0a2a"], draw: () => <>
    {[[16, 20], [84, 26], [20, 72], [86, 70]].map(([x, y], i) => <circle key={i} className="fx-twinkle" style={{ animationDelay: `${i * .5}s` }} cx={x} cy={y} r="1.6" fill="#fff6c0" />)}
    <Body fill="#4a2ab0" />
    <path d="M40 84 L50 96 L60 84" fill="#ffd24a" opacity=".8" />
    <ellipse cx="50" cy="60" rx="20" ry="20" fill="#f4cca8" />
    <path d="M30 58 C28 46 34 40 40 40 L60 40 C66 40 72 46 70 58 C66 50 34 50 30 58Z" fill="#c88a40" />
    <path d="M22 44 Q50 36 78 44 L70 46 Q50 40 30 46Z" fill="#3a1a90" />
    <path d="M32 44 L52 4 Q56 2 58 8 L68 44Z" fill="#4a2ab0" />
    <path d="M42 26 l2 4 4 0 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 0z" fill="#ffd24a" />
    <circle cx="58" cy="34" r="2" fill="#ffd24a" />
    <Eyes y={60} dx={8} r={3.4} />
    <Smile y={68} w={4} />
    <Cheeks y={66} dx={14} />
  </> },
  herokid: { bg: ["#fff4e0", "#ff7a3a"], draw: () => <>
    <path d="M18 100 Q20 76 36 74 L50 84 L64 74 Q80 76 82 100Z" fill="#e0283a" />
    <path d="M30 100 Q34 82 50 82 Q66 82 70 100Z" fill="#2a6ad0" />
    <path d="M50 86 l3 6 6.5 .5 -5 4.2 1.6 6.3 -6.1 -3.6 -6.1 3.6 1.6 -6.3 -5 -4.2 6.5 -.5z" fill="#ffd24a" />
    <ellipse cx="50" cy="54" rx="21" ry="21" fill="#e8b48a" />
    <path d="M28 50 C26 30 40 26 50 26 C62 26 74 30 72 50 C68 38 58 36 50 36 C40 36 32 40 28 50Z" fill="#2a1a10" />
    <path d="M30 50 Q40 44 50 50 Q60 44 70 50 Q66 58 58 56 L50 54 L42 56 Q34 58 30 50Z" fill="#2a6ad0" />
    <Eyes y={51} dx={9} r={3.2} />
    <Smile y={64} w={5} />
    <Cheeks y={60} dx={15} />
  </> },
  nightpanther: { bg: ["#1c1a4a", "#05040f"], draw: (id) => <>
    <defs>
      <radialGradient id={`${id}m`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fffdf0" /><stop offset=".75" stopColor="#f2ecd6" /><stop offset="1" stopColor="#d8d0b8" /></radialGradient>
      <radialGradient id={`${id}mg`}><stop offset=".55" stopColor="#f6efd0" stopOpacity=".55" /><stop offset="1" stopColor="#f6efd0" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}f`} x1=".2" y1="0" x2=".8" y2="1"><stop offset="0" stopColor="#3a3650" /><stop offset=".45" stopColor="#16141f" /><stop offset="1" stopColor="#07060b" /></linearGradient>
      <linearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9a8aff" /><stop offset=".5" stopColor="#9a8aff" stopOpacity="0" /><stop offset="1" stopColor="#6ad0ff" /></linearGradient>
      <radialGradient id={`${id}e`} cx="45%" cy="40%"><stop offset="0" stopColor="#fffbd0" /><stop offset=".45" stopColor="#ffd23a" /><stop offset="1" stopColor="#d07a00" /></radialGradient>
      <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3c0" /><stop offset=".5" stopColor="#e0aa30" /><stop offset="1" stopColor="#8a5a00" /></linearGradient>
    </defs>
    {/* a big moon and a few stars */}
    <circle className="pa-pulse" cx="68" cy="30" r="30" fill={`url(#${id}mg)`} />
    <circle cx="68" cy="30" r="21" fill={`url(#${id}m)`} />
    <g fill="#d8d0b8" opacity=".55"><circle cx="61" cy="24" r="3.2" /><circle cx="74" cy="36" r="2.2" /><circle cx="72" cy="22" r="1.4" /></g>
    {[[12, 14, 1.4], [26, 30, 1], [16, 56, 1.2], [92, 62, 1.1], [36, 8, .9]].map(([x, y, r], i) =>
      <circle key={i} className="fx-twinkle" style={{ animationDelay: `${i * .45}s` }} cx={x} cy={y} r={r} fill="#fff" />)}
    {/* shoulders */}
    <path d="M10 100 Q14 78 32 74 Q50 84 68 74 Q86 78 90 100Z" fill={`url(#${id}f)`} />
    <path d="M12 100 Q16 80 32 76" stroke="#9a8aff" strokeWidth="1.4" fill="none" opacity=".6" />
    {/* ears */}
    <path d="M24 44 Q20 24 30 18 Q40 24 42 34Z M76 44 Q80 24 70 18 Q60 24 58 34Z" fill={`url(#${id}f)`} />
    <path d="M27 38 Q25 26 31 22 Q37 27 38 33Z M73 38 Q75 26 69 22 Q63 27 62 33Z" fill="#3a2a4a" />
    {/* head: wide cheeks, a narrower muzzle */}
    <path d="M50 24 C34 24 22 34 22 50 C22 62 28 70 36 74 C40 78 45 80 50 80 C55 80 60 78 64 74 C72 70 78 62 78 50 C78 34 66 24 50 24Z" fill={`url(#${id}f)`} />
    <path d="M50 24 C34 24 22 34 22 50 C22 62 28 70 36 74" fill="none" stroke={`url(#${id}rim)`} strokeWidth="1.3" opacity=".55" />
    <path d="M78 50 C78 62 72 70 64 74" fill="none" stroke="#6ad0ff" strokeWidth="1.2" opacity=".45" />
    {/* glossy highlights in the fur */}
    <path d="M38 30 Q50 26 62 30" stroke="#ffffff" strokeWidth="1.6" fill="none" opacity=".18" strokeLinecap="round" />
    <path d="M47 33 Q50 40 53 33" stroke="#ffffff" strokeWidth="1" fill="none" opacity=".15" />
    {/* muzzle */}
    <ellipse cx="50" cy="66" rx="12" ry="9" fill="#24202e" />
    <path d="M45 61 Q50 58 55 61 L51.5 65 Q50 66 48.5 65Z" fill="#4a3a52" />
    <path d="M50 66 v3 M50 69 q-4 3 -7 0 M50 69 q4 3 7 0" stroke="#8a7aa0" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    <g fill="#8a7aa0" opacity=".7"><circle cx="42" cy="66" r=".8" /><circle cx="40" cy="68" r=".8" /><circle cx="58" cy="66" r=".8" /><circle cx="60" cy="68" r=".8" /></g>
    {/* golden eyes, almond-shaped, glowing */}
    <g className="pa-glow">
      <path d="M31 49 Q38 42 45 49 Q38 54 31 49Z" fill={`url(#${id}e)`} />
      <path d="M69 49 Q62 42 55 49 Q62 54 69 49Z" fill={`url(#${id}e)`} />
    </g>
    <ellipse cx="38" cy="48.6" rx="1.3" ry="3.4" fill="#120800" /><ellipse cx="62" cy="48.6" rx="1.3" ry="3.4" fill="#120800" />
    <circle cx="39.6" cy="47" r="1" fill="#fff" /><circle cx="63.6" cy="47" r="1" fill="#fff" />
    <path d="M30 48 Q38 40 46 47 M70 48 Q62 40 54 47" stroke="#07060b" strokeWidth="1.4" fill="none" />
    {/* whiskers */}
    <g stroke="#c8c0e8" strokeWidth=".8" strokeLinecap="round" opacity=".75">
      <path d="M38 67 L18 63 M38 69 L17 70 M38 71 L20 76" /><path d="M62 67 L82 63 M62 69 L83 70 M62 71 L80 76" />
    </g>
    {/* gold collar with a crescent */}
    <path d="M34 80 Q50 88 66 80" stroke={`url(#${id}g)`} strokeWidth="3.4" fill="none" strokeLinecap="round" />
    <path className="pa-glow" d="M50 84 a5.5 5.5 0 1 0 4.6 8.6 a4.4 4.4 0 1 1 -4.6 -8.6z" fill={`url(#${id}g)`} stroke="#8a5a00" strokeWidth=".6" />
  </> },
};

export const PICTURE_KEYS = new Set(Object.keys(PICS));
export const isPicture = (key?: string | null) => !!key && PICTURE_KEYS.has(key);

/** A drawn picture filling its box (round or square, the parent clips). */
export default function Picture({ name }: { name: string }) {
  const pic = PICS[name];
  const uid = useId().replace(/:/g, "");
  if (!pic) return null;
  return (
    <svg className="pic" viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}bg`} cx="50%" cy="35%" r="75%">
          <stop offset="0" stopColor={pic.bg[0]} /><stop offset="1" stopColor={pic.bg[1]} />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${uid}bg)`} />
      {pic.draw(uid)}
    </svg>
  );
}
