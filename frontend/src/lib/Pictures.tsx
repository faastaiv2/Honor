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
    <g opacity=".4">{Array.from({ length: 12 }, (_, i) => <path key={i} d="M50 42 L48 -8 H52 Z" fill="#c8d4ff" transform={`rotate(${i * 30} 50 42)`} />)}</g>
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
    <ellipse cx="50" cy="47" rx="17" ry="4" fill={`url(#${id}v)`} />
    <path d="M39 47 h5 M56 47 h5" stroke="#f6e8ff" strokeWidth="2" strokeLinecap="round" />
    {[58, 63, 68].map((y) => <path key={y} d={`M40 ${y} H60`} stroke="#c8b8ff" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />)}
    {[[16, 30, 3], [84, 60, 2.6]].map(([x, y, r]) => <path key={`${x}`} d={`M${x} ${y - r} L${x + r * .3} ${y - r * .3} L${x + r} ${y} L${x + r * .3} ${y + r * .3} L${x} ${y + r} L${x - r * .3} ${y + r * .3} L${x - r} ${y} L${x - r * .3} ${y - r * .3} Z`} fill="#e6dcff" />)}
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
    <g opacity=".55">{Array.from({ length: 16 }, (_, i) => <path key={i} d="M50 40 L47 -10 H53 Z" fill="#ffd24a" transform={`rotate(${i * 22.5} 50 40)`} opacity={i % 2 ? 0.5 : 1} />)}</g>
    <circle cx="50" cy="40" r="30" fill={`url(#${id}h)`} />
    {/* pauldrons and breastplate */}
    <path d="M10 100 Q12 78 30 74 Q50 70 70 74 Q88 78 90 100 Z" fill={`url(#${id}g)`} stroke="#6a4200" strokeWidth="1.2" />
    <path d="M14 86 Q22 74 34 76 Q30 84 32 92 Q22 88 14 92 Z M86 86 Q78 74 66 76 Q70 84 68 92 Q78 88 86 92 Z" fill={`url(#${id}gv)`} stroke="#6a4200" strokeWidth="1" />
    <path d="M40 80 H60 L62 88 Q50 100 38 88 Z" fill="#5a2fc0" stroke="#fff2b8" strokeWidth="1.4" />
    <path d="M50 82 l1.6 3.4 3.7.5 -2.7 2.6 .7 3.7 -3.3 -1.8 -3.3 1.8 .7 -3.7 -2.7 -2.6 3.7 -.5z" fill="#ffd24a" />
    {/* plume */}
    <path d="M52 14 C66 2 86 6 90 20 C82 14 72 14 66 20 C76 18 84 24 84 32 C76 26 66 26 60 30 Z" fill={`url(#${id}p)`} stroke="#6a0a1a" strokeWidth=".8" />
    <path d="M58 22 C68 14 78 14 84 18 M60 28 C68 22 76 24 80 28" stroke="#ffb0b8" strokeWidth="1" fill="none" opacity=".7" />
    {/* great helm */}
    <path d="M28 50 Q28 22 50 20 Q72 22 72 50 V70 Q62 78 50 78 Q38 78 28 70 Z" fill={`url(#${id}g)`} stroke="#6a4200" strokeWidth="1.6" />
    <path d="M50 21 V77" stroke="#fff6c8" strokeWidth="1.6" opacity=".7" />
    <path d="M34 30 Q42 24 50 23" stroke="#fff" strokeWidth="2.4" fill="none" opacity=".7" strokeLinecap="round" />
    {/* glowing visor */}
    <path d="M31 44 Q50 40 69 44 L68 52 Q50 48 32 52 Z" fill="#160a28" />
    <ellipse cx="50" cy="47" rx="17" ry="4" fill={`url(#${id}v)`} />
    <path d="M38 47 h6 M56 47 h6" stroke="#e6fbff" strokeWidth="2" strokeLinecap="round" />
    {/* breaths and rivets */}
    {[58, 63, 68].map((y) => <path key={y} d={`M40 ${y} H60`} stroke="#6a4200" strokeWidth="1.6" strokeLinecap="round" />)}
    {[[33, 58], [67, 58], [36, 66], [64, 66]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.5" fill="#fff6c8" />)}
    {/* crown */}
    <path d="M36 22 L34 10 L42 16 L50 6 L58 16 L66 10 L64 22 Z" fill={`url(#${id}gv)`} stroke="#6a4200" strokeWidth="1.2" strokeLinejoin="round" />
    <circle cx="50" cy="16" r="2.4" fill="#e3214a" stroke="#fff" strokeWidth=".8" />
    <circle cx="41" cy="18" r="1.5" fill="#2f7bff" /><circle cx="59" cy="18" r="1.5" fill="#22c27e" />
    {/* sparkles */}
    {[[16, 22, 4], [84, 52, 3.4], [20, 62, 2.6]].map(([x, y, r]) => <path key={`${x}`} d={`M${x} ${y - r} L${x + r * .3} ${y - r * .3} L${x + r} ${y} L${x + r * .3} ${y + r * .3} L${x} ${y + r} L${x - r * .3} ${y + r * .3} L${x - r} ${y} L${x - r * .3} ${y - r * .3} Z`} fill="#fff6c8" />)}
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
    <circle cx="50" cy="44" r="44" fill={`url(#${id}h)`} />
    {[[18, 96, 14], [32, 98, 10], [70, 98, 11], [84, 96, 15]].map(([x, y, h]) => (
      <path key={`${x}`} d={`M${x - 6} ${y} Q${x - 6} ${y - h * .6} ${x} ${y - h} Q${x + 1} ${y - h * .5} ${x + 6} ${y} Z`} fill="#ffb020" opacity=".85" />
    ))}
    {/* wings */}
    <path d="M24 60 C10 50 2 30 4 12 C10 22 16 24 22 24 C16 30 18 36 24 38 C20 42 22 48 28 50 Z" fill={`url(#${id}r)`} stroke="#2a0404" strokeWidth="1" />
    <path d="M76 60 C90 50 98 30 96 12 C90 22 84 24 78 24 C84 30 82 36 76 38 C80 42 78 48 72 50 Z" fill={`url(#${id}r)`} stroke="#2a0404" strokeWidth="1" />
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
    <path d="M32 47 L45 50 M68 47 L55 50" stroke={`url(#${id}v)`} strokeWidth="4" strokeLinecap="round" />
    <path d="M34 48 L44 50.5 M66 48 L56 50.5" stroke="#fff4c0" strokeWidth="1.4" strokeLinecap="round" />
    {[[40, 62], [50, 64], [60, 62], [44, 70], [56, 70]].map(([x, y]) => <path key={`${x}${y}`} d={`M${x} ${y - 3} L${x + 2} ${y + 3} H${x - 2} Z`} fill={`url(#${id}g)`} />)}
    {[[14, 66, 2.4], [86, 20, 2], [90, 70, 2.6], [10, 34, 1.8]].map(([x, y, r]) => <circle key={`${x}`} cx={x} cy={y} r={r} fill="#ffcf5a" />)}
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
    <g opacity=".55">{Array.from({ length: 16 }, (_, i) => <path key={i} d="M50 40 L47 -10 H53 Z" fill="#c8f0ff" transform={`rotate(${i * 22.5} 50 40)`} opacity={i % 2 ? 0.5 : 1} />)}</g>
    <circle cx="50" cy="42" r="32" fill={`url(#${id}h)`} />
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
    <path d="M50 22 L53 27 L50 32 L47 27 Z" fill="#ff5ab0" stroke="#fff" strokeWidth=".8" />
    <circle cx="38" cy="29" r="1.8" fill="#7ad8ff" /><circle cx="62" cy="29" r="1.8" fill="#7ad8ff" />
    {[[14, 24, 4], [86, 56, 3.4], [16, 66, 2.6], [84, 18, 3]].map(([x, y, r]) => <path key={`${x}`} d={`M${x} ${y - r} L${x + r * .3} ${y - r * .3} L${x + r} ${y} L${x + r * .3} ${y + r * .3} L${x} ${y + r} L${x - r * .3} ${y + r * .3} L${x - r} ${y} L${x - r * .3} ${y - r * .3} Z`} fill="#fff" />)}
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
