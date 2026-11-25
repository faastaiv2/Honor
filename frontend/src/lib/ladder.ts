import type { Tier } from "../api";

export interface Band { tier: Tier; top: number; bottom: number }

/** The Honor tower's vertical range and its tier bands, clipped to what the leaderboard needs. */
export function ladderLayout(levels: number[], tiers: Tier[]): { lo: number; hi: number; bands: Band[] } {
  const lo = Math.min(-1, ...levels) - 1;
  const hi = Math.max(30, ...levels) + 3;
  const sorted = [...tiers].sort((a, b) => (a.min ?? -Infinity) - (b.min ?? -Infinity));
  const bands: Band[] = [];
  sorted.forEach((t, i) => {
    const bottom = Math.max(t.min ?? lo, lo);
    const top = Math.min(sorted[i + 1]?.min ?? hi, hi);
    if (top > bottom) bands.push({ tier: t, top, bottom });
  });
  return { lo, hi, bands };
}
