import { describe, expect, it } from "vitest";
import { addDays, fmt } from "./dates";
import { ladderLayout } from "./ladder";

const tiers = [
  { min: null, emoji: "👺", name: "Low Honor", color: "" },
  { min: 1, emoji: "🥉", name: "Honor", color: "" },
  { min: 4, emoji: "🥈", name: "Good Honor", color: "" },
  { min: 25, emoji: "🎗️", name: "Highest Honor", color: "" },
  { min: 35, emoji: "👑", name: "Royal Honor", color: "" },
];

describe("ladderLayout", () => {
  it("covers every member with room above and below", () => {
    const { lo, hi } = ladderLayout([3, 31, -2], tiers);
    expect(lo).toBe(-3);
    expect(hi).toBe(34);
  });
  it("clips bands to the range and keeps them contiguous", () => {
    const { bands } = ladderLayout([3, 28], tiers);
    expect(bands.map((b) => b.tier.name)).toEqual(["Low Honor", "Honor", "Good Honor", "Highest Honor"]);
    expect(bands[0]).toMatchObject({ bottom: -2, top: 1 });
    expect(bands.at(-1)).toMatchObject({ bottom: 25, top: 33 });
  });
});

describe("dates", () => {
  it("adds days across months without time-zone drift", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-01", -1)).toBe("2026-11-30");
    expect(fmt("2026-11-24", { weekday: "short" })).toBe("Tue");
  });
});
