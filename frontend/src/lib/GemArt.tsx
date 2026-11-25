import { useId } from "react";

/**
 * A brilliant-cut gem seen from the side: a faceted crown on top, a pavilion below, a bright table,
 * a specular glint. Shared by the gem icon and the gem heap. View box 0 0 40 36.
 */
const PALETTES: Record<string, string[]> = {
  // lightest → darkest
  blue: ["#e6f8ff", "#a8e4ff", "#5cc4ff", "#2a9cf0", "#1670cc", "#0c4a96"],
  sky: ["#f0fbff", "#bdeeff", "#78d6ff", "#36aef5", "#1a82d8", "#0e5aa8"],
  deep: ["#dceeff", "#8fc8ff", "#4a9eff", "#2470e0", "#1450b8", "#0a3480"],
};

export default function GemArt({ tone = "blue", glint = true }: { tone?: "blue" | "sky" | "deep"; glint?: boolean }) {
  const c = PALETTES[tone];
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 40 36" aria-hidden="true" className="gem-art">
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c[0]} /><stop offset="1" stopColor={c[2]} /></linearGradient>
      </defs>
      {/* crown */}
      <path d="M4 13 L12 4 L12 13 Z" fill={c[2]} />
      <path d="M12 4 L12 13 L20 13 Z" fill={c[1]} />
      <path d="M12 4 L28 4 L20 13 Z" fill={`url(#${id}t)`} />
      <path d="M28 4 L20 13 L28 13 Z" fill={c[2]} />
      <path d="M28 4 L36 13 L28 13 Z" fill={c[3]} />
      {/* pavilion */}
      <path d="M4 13 L12 13 L20 34 Z" fill={c[3]} />
      <path d="M12 13 L20 13 L20 34 Z" fill={c[2]} />
      <path d="M20 13 L28 13 L20 34 Z" fill={c[4]} />
      <path d="M28 13 L36 13 L20 34 Z" fill={c[5]} />
      {/* edges */}
      <path d="M4 13 H36 M12 4 L12 13 L20 34 M28 4 L28 13 L20 34 M12 4 L20 13 L28 4 M20 13 V34" fill="none" stroke="#ffffff" strokeOpacity=".35" strokeWidth=".6" />
      <path d="M12 4 H28 L36 13 L20 34 L4 13 Z" fill="none" stroke={c[5]} strokeWidth="1" strokeLinejoin="round" />
      {/* light */}
      <path d="M13.5 5.5 L18 5.5 L14 10 Z" fill="#fff" opacity=".85" />
      <path d="M7 14.5 L10 14.5 L16 26 Z" fill="#fff" opacity=".3" />
      {glint && <path className="gem-glint" d="M30 1 L31 4 L34 5 L31 6 L30 9 L29 6 L26 5 L29 4 Z" fill="#fff" />}
    </svg>
  );
}
