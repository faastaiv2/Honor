import type { Profile, ShopItem } from "../api";

/**
 * Red dots for the Avatar shop: something is "new" when it's just appeared in the shop, just become yours to
 * use (a rank, an achievement, a gift), or you've just got enough gems to buy it. Seen once, the dot goes.
 * Remembered per member on this device. The very first visit counts everything as seen (no flood of dots).
 */
export type ShopKind = "avatar" | "frame" | "theme";
type Seen = { known: string[]; open: string[] };
const KEY = (memberId: string) => `honor.shopSeen.${memberId}`;
export const SHOP_NEW_EVENT = "honor:shop-new";

const lists = (p: Profile): [ShopKind, ShopItem[]][] => [["avatar", p.avatars], ["frame", p.frames], ["theme", p.themes]];
const openNow = (it: ShopItem, balance: number) => it.available || (it.price > 0 && !it.unlock && balance >= it.price);

function load(memberId: string): Seen | null {
  try { const s = localStorage.getItem(KEY(memberId)); return s ? JSON.parse(s) as Seen : null; } catch { return null; }
}
function save(memberId: string, s: Seen) {
  try { localStorage.setItem(KEY(memberId), JSON.stringify(s)); } catch { /* private mode */ }
  window.dispatchEvent(new Event(SHOP_NEW_EVENT));
}

/** Every new item, as "kind:key". */
export function newItems(p: Profile): Set<string> {
  const id = p.member.id, out = new Set<string>();
  const seen = load(id);
  if (!seen) {  // first visit: today's shop is the starting point
    const known: string[] = [], open: string[] = [];
    for (const [kind, items] of lists(p)) for (const it of items) { known.push(`${kind}:${it.key}`); if (openNow(it, p.gems.balance)) open.push(`${kind}:${it.key}`); }
    save(id, { known, open });
    return out;
  }
  const known = new Set(seen.known), open = new Set(seen.open);
  for (const [kind, items] of lists(p)) for (const it of items) {
    const k = `${kind}:${it.key}`;
    if (!known.has(k) || (openNow(it, p.gems.balance) && !open.has(k))) out.add(k);
  }
  return out;
}

/** The member has looked at this part of the shop: its dots go. */
export function markSeen(p: Profile, kind: ShopKind) {
  const id = p.member.id;
  const seen = load(id) ?? { known: [], open: [] };
  const known = new Set(seen.known), open = new Set(seen.open);
  for (const [k, items] of lists(p)) if (k === kind) for (const it of items) {
    known.add(`${k}:${it.key}`);
    if (openNow(it, p.gems.balance)) open.add(`${k}:${it.key}`);
  }
  save(id, { known: [...known], open: [...open] });
}
