import { describe, expect, it } from "vitest";
import type { BoardRow, Tier } from "../api";
import { daysLeftLabel, groupByTier } from "./board";
import { addDays, fmt } from "./dates";

const tier = (key: string): Tier => ({ key, min: 0, max: 0, emoji: "", name: key, color: "", range: "", games: "", benefits: "" });
const tiers = ["low", "honor", "good", "diamond", "legendary"].map(tier);
const row = (name: string, key: string) => ({ member: { id: name, name, code: name[0], avatar: "" }, tier: tier(key) }) as unknown as BoardRow;

describe("groupByTier", () => {
  it("puts the highest tier first and skips empty tiers", () => {
    const g = groupByTier([row("A", "good"), row("B", "diamond"), row("C", "good")], tiers);
    expect(g.map((s) => s.tier.key)).toEqual(["diamond", "good"]);
    expect(g[1].rows.map((r) => r.member.name)).toEqual(["A", "C"]);
  });
});

describe("labels and dates", () => {
  it("counts the days left in the week", () => {
    expect(daysLeftLabel(5)).toBe("5 days left");
    expect(daysLeftLabel(1)).toBe("1 day left");
    expect(daysLeftLabel(0)).toBe("Last day");
  });
  it("adds days across months without time-zone drift", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(fmt("2026-11-24", { weekday: "short" })).toBe("Tue");
  });
});
