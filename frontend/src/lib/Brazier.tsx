import { useId } from "react";

/** A Roman fire brazier (the streak icon): lit and flickering while the streak is alive, cold when it isn't. */
export default function Brazier({ lit = true, size, className = "" }: { lit?: boolean; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={`brazier${lit ? " lit" : ""} ${className}`} viewBox="0 0 48 56" style={size ? { width: size, height: size * 56 / 48 } : undefined} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}m`} x1="0" x2="1"><stop offset="0" stopColor="#7a4a1e" /><stop offset=".35" stopColor="#f3c590" /><stop offset=".6" stopColor="#c98a4e" /><stop offset="1" stopColor="#5e3512" /></linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ff3d00" /><stop offset=".55" stopColor="#ff9100" /><stop offset="1" stopColor="#ffd54f" /></linearGradient>
        <radialGradient id={`${id}g`}><stop offset="0" stopColor="#ffb347" stopOpacity=".55" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
      </defs>
      {lit && <circle className="brz-glow" cx="24" cy="20" r="20" fill={`url(#${id}g)`} />}
      {lit ? (
        <g className="brz-flames">
          <path className="brz-f1" d="M24 2 C30 10 34 14 33 21 C32 26 28 28 24 28 C20 28 16 26 15 21 C14 15 19 12 21 6 C22 10 23 12 24 2 Z" fill={`url(#${id}f)`} />
          <path className="brz-f2" d="M13 14 C16 18 17 21 16 25 L12 26 C10 22 11 18 13 14 Z M35 14 C32 18 31 21 32 25 L36 26 C38 22 37 18 35 14 Z" fill="#ff7a1a" />
          <path className="brz-f3" d="M24 11 C27 15 29 18 28 22 C27.5 25 26 26 24 26 C22 26 20.5 25 20 22 C19.5 19 22 16 24 11 Z" fill="#fff2b0" />
        </g>
      ) : (
        <g className="brz-smoke" fill="none" stroke="#9aa3ad" strokeWidth="1.6" strokeLinecap="round" opacity=".7">
          <path d="M20 24 C18 19 22 17 20 12" /><path d="M27 24 C29 19 25 16 28 10" />
        </g>
      )}
      {/* bowl */}
      <path d="M6 24 H42 C42 32 34 37 24 37 C14 37 6 32 6 24 Z" fill={`url(#${id}m)`} stroke="#4a2a0e" strokeWidth="1" />
      <rect x="4.5" y="22" width="39" height="4" rx="2" fill={`url(#${id}m)`} stroke="#4a2a0e" strokeWidth="1" />
      <path d="M10 29 H38" stroke="#4a2a0e" strokeWidth=".8" opacity=".6" />
      {[13, 19, 24, 29, 35].map((x) => <circle key={x} cx={x} cy="31.5" r="1" fill="#fff1d6" opacity=".7" />)}
      {lit && <path d="M9 25 Q24 21 39 25" stroke="#ffcf7a" strokeWidth="1.2" fill="none" opacity=".9" />}
      {/* stem and feet */}
      <path d="M21 37 H27 L26 45 H22 Z" fill={`url(#${id}m)`} stroke="#4a2a0e" strokeWidth=".9" />
      <ellipse cx="24" cy="45.5" rx="6" ry="1.8" fill={`url(#${id}m)`} stroke="#4a2a0e" strokeWidth=".8" />
      <path d="M19 46 L12 54 M29 46 L36 54 M24 47 V54" stroke="#6e4018" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M10 54 H14 M34 54 H38 M22 54 H26" stroke="#4a2a0e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
