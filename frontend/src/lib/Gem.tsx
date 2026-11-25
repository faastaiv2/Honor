import { useId } from "react";

/** The gem currency icon: a drawn, faceted blue gem (sized by the surrounding text unless `size` is given). */
export default function Gem({ size, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const s = size ? { width: size, height: size } : undefined;
  return (
    <svg className={`gem-ico ${className}`} viewBox="0 0 32 28" style={s} aria-label="gems" role="img">
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9fe8ff" /><stop offset="1" stopColor="#2f8fe0" /></linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3aa0f0" /><stop offset="1" stopColor="#1456b8" /></linearGradient>
      </defs>
      <path d="M8 1 h16 l7 8 -15 18 -15 -18z" fill={`url(#${id}b)`} />
      <path d="M8 1 h16 l7 8 h-30z" fill={`url(#${id}a)`} />
      <path d="M8 1 l4 8 4 -8 4 8 4 -8" fill="#d8f6ff" opacity=".75" />
      <path d="M1 9 h30 M12 9 l4 18 4 -18" fill="none" stroke="#e8fbff" strokeWidth=".9" opacity=".8" />
      <path d="M1 9 l15 18 -4 -18z" fill="#5fc0ff" opacity=".5" />
      <path d="M5 4.5 l2 -2" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 1 h16 l7 8 -15 18 -15 -18z" fill="none" stroke="#0e3f8a" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}
