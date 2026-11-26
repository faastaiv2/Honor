import { useId, type ReactNode } from "react";
import RankIcon from "./RankIcon";
import Gem from "./Gem";

/** Achievement medals: a ribbon and a round medal in the tier's metal with a drawn symbol. View box 0 0 80 96. */

const METAL: Record<string, [string, string, string]> = {
  bronze: ["#f6c896", "#b0703a", "#5e3512"],
  silver: ["#ffffff", "#aab6c2", "#5a6676"],
  gold: ["#fff2b8", "#e0aa20", "#7a5200"],
  legend: ["#fff6d0", "#c070ff", "#3a1060"],
  godfather: ["#fff3c0", "#d4a017", "#1a1408"],
};
const RIBBON: Record<string, [string, string]> = {
  bronze: ["#c0294a", "#8e1b3a"], silver: ["#1f5fbf", "#133a8a"], gold: ["#1e9e6a", "#0f6b47"], legend: ["#6a3fd0", "#3a1f80"], godfather: ["#1a1a1a", "#000000"],
};

const G = "#fff";
const GLYPHS: Record<string, ReactNode> = {
  flame: <path d="M40 34 C46 42 50 46 49 53 C48 59 44 62 40 62 C36 62 32 59 31 54 C30 48 35 45 37 39 C38 43 39 45 40 34 Z M40 47 C42 50 43 52 42.5 55 C42 57 41 58 40 58 C39 58 38 57 37.6 55 C37 53 39 50 40 47 Z" fill={G} fillRule="evenodd" />,
  check: <path d="M29 49 L37 57 L52 40" fill="none" stroke={G} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />,
  star: <path d="M40 34 L43.5 44 L54 44.3 L45.7 50.7 L48.7 61 L40 55 L31.3 61 L34.3 50.7 L26 44.3 L36.5 44 Z" fill={G} />,
  moon: <g><path d="M45 34 A15 15 0 1 0 52 58 A12 12 0 1 1 45 34 Z" fill={G} /><path d="M52 38 l1 2.2 2.4.3 -1.8 1.6 .5 2.4 -2.1 -1.2 -2.1 1.2 .5 -2.4 -1.8 -1.6 2.4 -.3z" fill={G} /></g>,
  sun: <g fill={G}><circle cx="40" cy="50" r="7" />{Array.from({ length: 8 }, (_, i) => <rect key={i} x="38.8" y="35" width="2.4" height="6" rx="1.2" transform={`rotate(${i * 45} 40 50)`} />)}</g>,
  dumbbell: <g fill={G}><rect x="31" y="47.5" width="18" height="5" rx="2" /><rect x="25" y="40" width="6" height="20" rx="2" /><rect x="49" y="40" width="6" height="20" rx="2" /><rect x="21" y="44" width="4" height="12" rx="1.5" /><rect x="55" y="44" width="4" height="12" rx="1.5" /></g>,
  shield: <path d="M40 34 L52 38.5 V47 C52 55 47 60 40 63 C33 60 28 55 28 47 V38.5 Z M40 40 V58" fill="none" stroke={G} strokeWidth="3.4" strokeLinejoin="round" />,
  bag: <g><path d="M29 44 H51 L53 62 H27 Z" fill={G} /><path d="M34 44 C34 36 46 36 46 44" fill="none" stroke={G} strokeWidth="3" /></g>,
  godfather: <text x="40" y="58" textAnchor="middle" fontSize="22" fontWeight="700" fontFamily="'Didot', 'Bodoni 72', Georgia, serif" fill={G}>G</text>,
  chest: <g fill={G}><path d="M27 46 C27 37 53 37 53 46 Z" /><rect x="27" y="47.5" width="26" height="14" rx="2" /><rect x="37.5" y="45" width="5" height="7" rx="1" fill="#0004" /></g>,
};

export default function Medal({ icon, tier, locked = false, size = 72 }: { icon: string; tier: string; locked?: boolean; size?: number }) {
  const id = useId().replace(/:/g, "");
  const m = METAL[tier] ?? METAL.bronze, r = RIBBON[tier] ?? RIBBON.bronze;
  let glyph: ReactNode = GLYPHS[icon];
  if (icon.startsWith("crest:")) glyph = <foreignObject x="24" y="34" width="32" height="32"><RankIcon rank={icon.slice(6)} size={32} /></foreignObject>;
  if (icon === "gem") glyph = <foreignObject x="26" y="37" width="28" height="26"><Gem size={28} /></foreignObject>;
  return (
    <svg className={`medal${locked ? " locked" : ""} t-${tier}`} viewBox="0 0 80 96" style={{ width: size, height: size * 1.2 }} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={m[0]} /><stop offset=".5" stopColor={m[1]} /><stop offset="1" stopColor={m[2]} /></linearGradient>
        <radialGradient id={`${id}f`} cx="40%" cy="35%" r="70%"><stop offset="0" stopColor={m[1]} /><stop offset="1" stopColor={m[2]} /></radialGradient>
      </defs>
      <path d="M22 0 H38 L44 28 L30 30 Z" fill={r[0]} /><path d="M58 0 H42 L36 28 L50 30 Z" fill={r[1]} />
      <path d="M22 0 H38 L40 6 H24 Z M58 0 H42 L40 6 H56 Z" fill="#0002" />
      {tier === "legend" && <g fill={m[0]} opacity=".9">{Array.from({ length: 12 }, (_, i) => <path key={i} d="M40 14 L42.5 22 H37.5 Z" transform={`rotate(${i * 30} 40 50)`} />)}</g>}
      <circle cx="40" cy="50" r="27" fill={`url(#${id}m)`} stroke={m[2]} strokeWidth="1.2" />
      <circle cx="40" cy="50" r="21" fill={`url(#${id}f)`} stroke="#ffffff99" strokeWidth="1" />
      <path d="M24 42 A18 18 0 0 1 40 30" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".55" />
      {glyph}
      {locked && <g><circle cx="58" cy="70" r="9" fill="#5a5f68" stroke="#fff" strokeWidth="1.6" /><rect x="54" y="69" width="8" height="6" rx="1" fill="#fff" />
        <path d="M55.5 69 V67 A2.5 2.5 0 0 1 60.5 67 V69" fill="none" stroke="#fff" strokeWidth="1.4" /></g>}
    </svg>
  );
}
