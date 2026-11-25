"""The Honor ranks, their rewards, and the make-up allowance each one gives.

Make-up allowance: tasks a member may tick *after* the day is over.
  next_day     tasks of day D that may be made up on D+1
  mid_days     weekdays (0=Mon … 6=Sun) whose tasks may be made up on Friday or Saturday
  mid_cap      how many tasks for those days
  mid_each     True: mid_cap applies to each of those days; False: shared across them in a week
  weekly_any   Legendary: tasks that may be made up on any later day of the same week
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

WED, THU = 2, 3

LEGENDARY_LEVEL = 50
OBSIDIAN_FLOOR = 47  # the top rank below Legendary (XLVII–XLIX)
CAP_WITHOUT_LEGENDARY = 49


@dataclass(frozen=True)
class Tier:
    key: str
    min: int  # lowest level in the tier
    max: int | None  # highest level, None = no upper limit
    emoji: str
    name: str
    color: str
    games: str
    benefits: str
    next_day: int = 0
    mid_days: tuple[int, ...] = ()
    mid_cap: int = 0
    mid_each: bool = False
    weekly_any: int = 0


TIERS: list[Tier] = [
    Tier("low", -10**6, 0, "👺", "Low Honor", "#b4322a", "0 mins", "None"),
    Tier("bronze", 1, 3, "🥉", "Bronze", "#b0703a", "0 mins / week (after finishing tasks)", "None"),
    Tier("silver", 4, 7, "🥈", "Silver", "#8a97a3", "10 mins / Sunday (after finishing tasks)",
         "Can miss up to 1 task and make up next day", next_day=1),
    Tier("gold", 8, 12, "🥇", "Gold", "#d4a017", "15 mins / Sunday (after finishing tasks)",
         "Can miss up to 1 task and make up next day", next_day=1),
    Tier("platinum", 13, 18, "💠", "Platinum", "#5f9eb0", "20 mins / Sunday (after finishing tasks)",
         "Can miss up to 1 task and make up next day + miss a task on Thursday and make up on Fri or Sat",
         next_day=1, mid_days=(THU,), mid_cap=1),
    Tier("emerald", 19, 24, "🍀", "Emerald", "#1e9e6a", "25 mins / Sunday + Monday (after finishing tasks)",
         "Can miss up to 1 task and make up next day + miss a task on Thursday and make up on Fri or Sat",
         next_day=1, mid_days=(THU,), mid_cap=1),
    Tier("sapphire", 25, 31, "🔷", "Sapphire", "#1f5fbf", "30 mins / Sunday + Monday (after finishing tasks)",
         "Can miss up to 2 tasks and make up next day + miss a task on Thursday and make up on Fri or Sat + Mehmed",
         next_day=2, mid_days=(THU,), mid_cap=1),
    Tier("ruby", 32, 39, "♦️", "Ruby", "#c0294a", "40 mins / Sunday + Monday + Tuesday (after finishing tasks)",
         "Can miss up to 2 tasks and make up next day + miss a task on Thursday and make up on Fri or Sat + Mehmed",
         next_day=2, mid_days=(THU,), mid_cap=1),
    Tier("diamond", 40, 46, "💎", "Diamond", "#3ba7cf", "50 mins / Sunday + Monday + Tuesday (after finishing tasks)",
         "Can miss up to 2 tasks and make up next day + miss a task on Wed or Thursday and make up on Fri or Sat + Mehmed",
         next_day=2, mid_days=(WED, THU), mid_cap=1),
    Tier("obsidian", 47, 49, "🔮", "Obsidian", "#3a2c52", "60 mins / Sunday + Monday + Tuesday (after finishing tasks)",
         "Can miss up to 3 tasks and make up next day + miss up to 2 tasks on Wed and Thu and make up on Fri and Sat + Mehmed",
         next_day=3, mid_days=(WED, THU), mid_cap=2, mid_each=True),
    Tier("legendary", 50, None, "👑", "Legendary", "#b8860b", "Unlimited / day (before finishing tasks, anytime)",
         "Can miss up to 15 tasks a week and make up on the weekend or any day", weekly_any=15),
]
BY_KEY = {t.key: t for t in TIERS}


def tier_for(level: int, legendary: bool) -> Tier:
    if legendary:
        return BY_KEY["legendary"]
    level = min(level, CAP_WITHOUT_LEGENDARY)
    return next(t for t in reversed(TIERS) if t.key != "legendary" and level >= t.min)


def next_tier(t: Tier) -> Tier | None:
    i = TIERS.index(t)
    return TIERS[i + 1] if i + 1 < len(TIERS) else None


def roman(n: int) -> str:
    if n == 0:
        return "0"
    if n < 0:
        return "−" + roman(-n)
    out = ""
    for v, s in [(1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"), (50, "L"),
                 (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]:
        while n >= v:
            out += s
            n -= v
    return out


def tier_range(t: Tier) -> str:
    if t.key == "low":
        return "0 and below"
    if t.max is None:
        return roman(t.min)
    return f"{roman(t.min)} – {roman(t.max)}"


# ---------------------------------------------------------------- rewards and the shop
GEMS_PER_TASK = 1          # each task and the bonus ticked, once per day
GEMS_FOR_FULL_DAY = 20     # extra when every task of the day is done
# Before this day tasks paid 5 gems each and there was no full-day reward (so nobody's balance shrinks).
GEMS_NEW_RATES_FROM = date(2026, 11, 26)
GEMS_PER_TASK_BEFORE = 5
GEMS_PER_LEVEL = 10        # the first time a member reaches each new level
# Extra, the first time a member reaches each rank: the higher the rank, the bigger the reward.
RANK_GEMS = {"low": 0, "bronze": 25, "silver": 50, "gold": 100, "platinum": 150, "emerald": 200, "sapphire": 300,
             "ruby": 400, "diamond": 500, "obsidian": 750, "legendary": 1000}
GEMS_FOR_LEGENDARY = RANK_GEMS["legendary"]
# The daily streak chest: claim once a day while your streak is alive. Higher ranks get more.
DAILY_CLAIM = {"low": 0, "bronze": 3, "silver": 4, "gold": 5, "platinum": 6, "emerald": 8, "sapphire": 10, "ruby": 12,
               "diamond": 15, "obsidian": 20, "legendary": 25}


def tier_dict(t: Tier) -> dict:
    return {"key": t.key, "min": t.min if t.key != "low" else None, "max": t.max, "emoji": t.emoji, "name": t.name,
            "color": t.color, "range": tier_range(t), "games": t.games, "benefits": t.benefits,
            "gems": RANK_GEMS.get(t.key, 0), "daily": DAILY_CLAIM.get(t.key, 0)}

# Each rank unlocks its own frame and theme for free. Others are bought with gems.
# (key, name, unlocked by rank key, or None if it is bought; price in gems)
FRAMES: list[tuple[str, str, str | None, int]] = [
    ("plain", "Classic white", "low", 0),
    ("bronze", "Bronze", "bronze", 0),
    ("silver", "Silver", "silver", 0),
    ("gold", "Gold", "gold", 0),
    ("platinum", "Platinum", "platinum", 0),
    ("emerald", "Emerald", "emerald", 0),
    ("sapphire", "Sapphire", "sapphire", 0),
    ("ruby", "Ruby", "ruby", 0),
    ("diamond", "Diamond", "diamond", 0),
    ("obsidian", "Obsidian", "obsidian", 0),
    ("crown", "Royal crown", "legendary", 0),
    ("star", "Starlight", None, 150),
    ("ribbon", "Teal ribbon", None, 150),
    ("sun", "Sunburst", None, 200),
    ("rainbow", "Rainbow", None, 400),
    ("fire", "Fire", None, 500),
    ("galaxy", "Galaxy", None, 600),
]
THEMES: list[tuple[str, str, str | None, int]] = [
    ("classic", "Classic emerald", "low", 0),
    ("bronze", "Bronze", "bronze", 0),
    ("silver", "Silver", "silver", 0),
    ("gold", "Gold", "gold", 0),
    ("platinum", "Platinum", "platinum", 0),
    ("emerald", "Emerald", "emerald", 0),
    ("sapphire", "Sapphire", "sapphire", 0),
    ("ruby", "Ruby", "ruby", 0),
    ("diamond", "Diamond", "diamond", 0),
    ("obsidian", "Obsidian night", "obsidian", 0),
    ("legendary", "Legendary gold", "legendary", 0),
    ("rose", "Rose garden", None, 250),
    ("ocean", "Ocean", None, 250),
    ("desert", "Desert dusk", None, 300),
    ("midnight", "Midnight", None, 350),
]
# Drawn pictures (frontend/src/lib/Pictures.tsx): (key, name), and (key, name, gems) for the shop.
FREE_PICTURES: list[tuple[str, str]] = [
    ("lion", "Lion"), ("tiger", "Tiger"), ("eagle", "Eagle"), ("wolf", "Wolf"), ("fox", "Fox"), ("owl", "Owl"),
    ("bear", "Bear"), ("cat", "Cat"), ("turtle", "Turtle"), ("dolphin", "Dolphin"), ("knight", "Knight"),
    ("lantern", "Lantern"), ("crescent", "Crescent"), ("football", "Football"),
]
SHOP_PICTURES: list[tuple[str, str, int]] = [
    ("panda", "Panda", 100), ("penguin", "Penguin", 100), ("koala", "Koala", 120), ("unicorn", "Unicorn", 150),
    ("dino", "Dino", 150), ("astronaut", "Astronaut", 200), ("robot", "Robot", 200), ("ninja", "Ninja", 220),
    ("phoenix", "Phoenix", 300), ("dragon", "Dragon", 350), ("kinglion", "Lion King", 400),
    ("cosmiccat", "Cosmic cat", 450),
]
FREE_AVATARS = [k for k, _ in FREE_PICTURES]
SHOP_AVATARS: list[tuple[str, int]] = [(k, c) for k, _, c in SHOP_PICTURES]
_PICTURE_NAMES = {k: n for k, n in FREE_PICTURES} | {k: n for k, n, _ in SHOP_PICTURES}

TIER_ORDER = [t.key for t in TIERS]
FRAME_KEYS = {f[0] for f in FRAMES}
THEME_KEYS = {t[0] for t in THEMES}


def rank_reached(need: str | None, current: Tier) -> bool:
    return need is not None and TIER_ORDER.index(current.key) >= TIER_ORDER.index(need)


def shop_key(kind: str, key: str) -> str:
    return f"{kind}:{key}"


def item_available(kind: str, key: str, current: Tier, owned: set[str]) -> bool:
    """Free with the member's rank, or bought with gems."""
    if kind == "avatar":
        return key in FREE_AVATARS or shop_key("avatar", key) in owned
    table = FRAMES if kind == "frame" else THEMES
    need = next(x[2] for x in table if x[0] == key)
    return rank_reached(need, current) or shop_key(kind, key) in owned


def price_of(kind: str, key: str) -> int | None:
    """Gems needed to buy an item, or None if it is not sold (rank items are earned, not bought)."""
    if kind == "avatar":
        return next((c for a, c in SHOP_AVATARS if a == key), None)
    table = FRAMES if kind == "frame" else THEMES if kind == "theme" else []
    row = next((x for x in table if x[0] == key), None)
    return row[3] if row and row[2] is None else None


def catalogue(kind: str, current: Tier, owned: set[str]) -> list[dict]:
    if kind == "avatar":
        free = [{"key": a, "name": _PICTURE_NAMES[a], "available": True, "price": 0, "tier": None} for a in FREE_AVATARS]
        return free + [{"key": a, "name": _PICTURE_NAMES[a], "available": shop_key("avatar", a) in owned, "price": c,
                        "tier": None}
                       for a, c in SHOP_AVATARS]
    table = FRAMES if kind == "frame" else THEMES
    return [{"key": k, "name": n, "available": item_available(kind, k, current, owned), "price": c,
             "tier": tier_dict(BY_KEY[need]) if need else None} for k, n, need, c in table]
