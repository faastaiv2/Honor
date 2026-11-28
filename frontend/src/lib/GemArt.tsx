
/**
 * A brilliant-cut gem seen from the side: a faceted crown on top, a pavilion below, a bright table,
 * a specular glint. Shared by the gem icon and the gem heap. View box 0 0 40 36.
 */
const PALETTES: Record<string, [string, string, string]> = {
  // body, shine, outline
  blue: ["#5aaef0", "#d4efff", "#3f93d6"],
  sky: ["#6cc0f7", "#e0f5ff", "#4aa6e6"],
  deep: ["#4a9ae8", "#cfe8ff", "#337fcc"],
};

/**
 * The gem: a flat, rounded hexagon in one clean blue with a soft white shine at the top-left.
 * Shared by the gem icon and the reward gems. View box 0 0 40 36.
 */
export default function GemArt({ tone = "blue", glint = true }: { tone?: "blue" | "sky" | "deep"; glint?: boolean }) {
  const [body, shine, edge] = PALETTES[tone];
  return (
    <svg viewBox="0 0 40 36" aria-hidden="true" className="gem-art">
      <path d="M20 3 L33 10.5 L33 25.5 L20 33 L7 25.5 L7 10.5 Z" fill={body} stroke={body} strokeWidth="5" strokeLinejoin="round" />
      <path d="M33 10.5 L33 25.5 L20 33 L20 18 Z" fill={edge} opacity=".25" />
      <path d="M11.5 12.5 L18 8.8 Q19.6 8 19.4 9.8 L18.6 12.6 Q18.3 13.6 17.3 14 L12.6 16 Q11 16.6 11 15 Z" fill={shine} opacity=".9" />
      {glint && <path className="gem-glint" d="M31 1 L32 4 L35 5 L32 6 L31 9 L30 6 L27 5 L30 4 Z" fill="#fff" />}
    </svg>
  );
}

/** The same flat gem, square (view box 0 0 40 40), for the reward. */
export function HexGem({ tone = "blue", glint = false }: { tone?: "blue" | "sky" | "deep"; glint?: boolean }) {
  return <span className="gem-sq" style={{ display: "block", width: "100%", aspectRatio: "1" }}><GemArt tone={tone} glint={glint} /></span>;
}
