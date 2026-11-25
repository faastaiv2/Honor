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
  knight: { bg: ["#6a3fb0", "#140828"], draw: (id) => <>
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
