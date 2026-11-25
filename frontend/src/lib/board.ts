import type { BoardRow, Tier } from "../api";

/** Leaderboard sections: highest tier first, only tiers that have members, rows in rank order. */
export function groupByTier(rows: BoardRow[], tiers: Tier[]): { tier: Tier; rows: BoardRow[] }[] {
  return [...tiers].reverse()
    .map((tier) => ({ tier, rows: rows.filter((r) => r.tier.key === tier.key) }))
    .filter((s) => s.rows.length > 0);
}

export function daysLeftLabel(days: number): string {
  return days <= 0 ? "Last day" : `${days} day${days === 1 ? "" : "s"} left`;
}
