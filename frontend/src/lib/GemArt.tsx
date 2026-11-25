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

const HEX: Record<string, string[]> = {
  // top face, light side, mid side, dark side, outline
  blue: ["#8fdcff", "#5cc4ff", "#36a8f0", "#1f86d8", "#1670cc"],
  sky: ["#b4ecff", "#7fd6ff", "#4cbaf5", "#2c9ae6", "#1a82d8"],
  deep: ["#79c4ff", "#4aa6ff", "#2f86ec", "#1f68d0", "#1450b8"],
};

/** A chunky hexagonal gem nugget, the kind that piles up in a heap. View box 0 0 40 40. */
export function HexGem({ tone = "blue", glint = false }: { tone?: "blue" | "sky" | "deep"; glint?: boolean }) {
  const c = HEX[tone];
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="gem-art hex">
      <path d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z" fill={c[2]} stroke={c[4]} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M4 11 L20 2 L36 11 L20 19 Z" fill={c[0]} />
      <path d="M4 11 L20 19 L20 38 L4 29 Z" fill={c[1]} />
      <path d="M36 11 L20 19 L20 38 L36 29 Z" fill={c[3]} />
      <path d="M11 9 L19 5 L22 7 L14 11 Z" fill="#fff" opacity=".85" />
      <path d="M7 15 L9 16 L9 25 L7 24 Z" fill="#fff" opacity=".35" />
      {glint && <path className="gem-glint" d="M31 3 L32 6 L35 7 L32 8 L31 11 L30 8 L27 7 L30 6 Z" fill="#fff" />}
    </svg>
  );
}
