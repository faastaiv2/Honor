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
    Tier("low", -10**6, -1, "👺", "Low Honor", "#b4322a", "0 mins", "None"),
    Tier("member", 0, 0, "🛡️", "Member", "#ffffff", "0 mins", "None"),  # where new members start
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
         "Can miss up to 2 tasks and make up next day + miss a task on Thursday and make up on Fri or Sat",
         next_day=2, mid_days=(THU,), mid_cap=1),
    Tier("ruby", 32, 39, "♦️", "Ruby", "#c0294a", "40 mins / Sunday + Monday + Tuesday (after finishing tasks)",
         "Can miss up to 2 tasks and make up next day + miss a task on Thursday and make up on Fri or Sat",
         next_day=2, mid_days=(THU,), mid_cap=1),
    Tier("diamond", 40, 46, "💎", "Diamond", "#3ba7cf", "50 mins / Sunday + Monday + Tuesday (after finishing tasks)",
         "Can miss up to 2 tasks and make up next day + miss a task on Wed or Thursday and make up on Fri or Sat",
         next_day=2, mid_days=(WED, THU), mid_cap=1),
    Tier("obsidian", 47, 49, "🔮", "Obsidian", "#3a2c52", "60 mins / Sunday + Monday + Tuesday (after finishing tasks)",
         "Can miss up to 3 tasks and make up next day + miss up to 2 tasks on Wed and Thu and make up on Fri and Sat",
         next_day=3, mid_days=(WED, THU), mid_cap=2, mid_each=True),
    Tier("legendary", 50, None, "👑", "Legendary", "#b8860b", "Unlimited / day (before finishing tasks, anytime)",
         "Can miss up to 15 tasks a week and make up on the weekend or any day", weekly_any=15),
]
BY_KEY = {t.key: t for t in TIERS}
LOW_FLOOR = -3  # the bottom: Low Honor is −I, −II and −III (shown on the Pillar of Shame)
SHAME_AVATAR, SHAME_FRAME = "👹", "shame"  # locked on while a member is on the Pillar of Shame


def shown_look(avatar: str, frame: str, tier_key: str) -> tuple[str, str]:
    """The picture and frame others see: on the Pillar of Shame they are locked to the ogre and the shame ring."""
    return (SHAME_AVATAR, SHAME_FRAME) if tier_key == "low" else (avatar, frame)


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
        return "−I to −III"
    if t.key == "member":
        return "0"
    if t.max is None:
        return roman(t.min)
    return f"{roman(t.min)} – {roman(t.max)}"


# ---------------------------------------------------------------- rewards and the shop
GEMS_PER_TASK = 0          # ticking a task gives no gems
GEMS_FOR_FULL_DAY = 0      # no separate reward for finishing the day: the weekly treasure map is the daily reward
# Finishing a day paid 20 gems on days up to (not including) this one; those gems stay earned.
FULL_DAY_PAID = 20
FULL_DAY_UNTIL = date(2026, 11, 27)
# Before this day tasks paid 5 gems each and there was no full-day reward (so nobody's balance shrinks).
GEMS_NEW_RATES_FROM = date(2026, 11, 26)
GEMS_PER_TASK_BEFORE = 5
GEMS_PER_LEVEL = 10        # the first time a member reaches each new level
# Extra, the first time a member reaches each rank: the higher the rank, the bigger the reward.
RANK_GEMS = {"low": 0, "member": 0, "bronze": 10, "silver": 50, "gold": 100, "platinum": 150, "emerald": 200, "sapphire": 300,
             "ruby": 400, "diamond": 500, "obsidian": 750, "legendary": 1000}
GEMS_FOR_LEGENDARY = RANK_GEMS["legendary"]
# The daily streak chest: claim once a day while your streak is alive. Higher ranks get more.
# The weekly treasure map: one chest a day (while the streak is alive); the Nth chest of the week holds 5 × N gems.
# The map starts again every Sunday.
WEEKLY_MAP = [5, 10, 15, 20, 25, 30, 35]
DAILY_CLAIM = {"low": 0, "member": 0, "bronze": 3, "silver": 4, "gold": 5, "platinum": 6, "emerald": 8, "sapphire": 10, "ruby": 12,
               "diamond": 15, "obsidian": 20, "legendary": 25}


def tier_dict(t: Tier) -> dict:
    from app.achievements import BY_KEY  # here, to avoid a circular import
    ach = BY_KEY.get(t.key)
    return {"achievement": {"name": ach.name, "gems": ach.gems} if ach else None,
            "key": t.key, "min": t.min if t.key != "low" else None, "max": t.max, "emoji": t.emoji, "name": t.name,
            "color": t.color, "range": tier_range(t), "games": t.games, "benefits": t.benefits,
            "gems": RANK_GEMS.get(t.key, 0),
            "frame": next(({"key": k, "name": n} for k, n, r, _ in FRAMES if r == t.key), None),
            "theme": next(({"key": k, "name": n} for k, n, r, _ in THEMES if r == t.key), None)}

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
    ("star", "Starlight", None, 300),
    ("ribbon", "Teal ribbon", None, 300),
    ("sun", "Sunburst", None, 400),
    ("rainbow", "Rainbow", None, 800),
    ("fire", "Fire", None, 1000),
    ("galaxy", "Galaxy", None, 1200),
    ("blossom", "Cherry blossom", None, 500),
    ("waves", "Ocean waves", None, 600),
    ("aurora", "Aurora", None, 900),
    ("thunder", "Thunderstorm", None, 1000),
    ("royalgems", "Royal jewels", None, 1200),
    ("orbit", "Solar system", None, 1500),
]
THEMES: list[tuple[str, str, str | None, int]] = [
    ("white", "White", "low", 0),  # the starting look, free for everyone
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
    ("rose", "Rose garden", None, 500),
    ("ocean", "Ocean", None, 500),
    ("desert", "Desert dusk", None, 600),
    ("midnight", "Midnight", None, 700),
    ("lavender", "Lavender dream", None, 600),
    ("sunset", "Sunset glow", None, 650),
    ("northern", "Northern lights", None, 0),  # won with the Centurion achievement (THEME_UNLOCKS)
]
# Themes won by an achievement instead of gems: theme -> achievement key.
THEME_UNLOCKS = {"northern": "days100"}
# Drawn pictures (frontend/src/lib/Pictures.tsx): (key, name), and (key, name, gems) for the shop.
FREE_PICTURES: list[tuple[str, str]] = []  # every picture is in the shop now (Plain stays free)
ANIMALS_NOW_COMMON = ["lion", "tiger", "eagle", "wolf", "fox", "owl", "bear", "cat", "turtle", "dolphin"]  # were free
# Shop pictures by rarity: common, rare, epic, legendary. (key, name, gems, rarity)
RARITIES = ["common", "rare", "epic", "legendary"]
SHOP_PICTURES: list[tuple[str, str, int, str]] = [
    # Common
    ("cat", "Cat", 0, "common"),  # free
    ("lion", "Lion", 0, "common"), ("eagle", "Eagle", 0, "common"), ("owl", "Owl", 0, "common"),
    ("bear", "Bear", 0, "common"),  # unlocked by achievements (PICTURE_UNLOCKS)
    ("tiger", "Tiger", 0, "common"), ("wolf", "Wolf", 0, "common"), ("fox", "Fox", 0, "common"),
    ("turtle", "Turtle", 0, "common"), ("dolphin", "Dolphin", 0, "common"),
    ("squire", "Squire", 0, "common"), ("flowergirl", "Flower Girl", 100, "common"), ("archer", "Archer", 100, "common"),
    ("bunny", "Bunny", 0, "common"), ("hamster", "Hamster", 0, "common"), ("frog", "Frog", 0, "common"),
    ("duckling", "Duckling", 0, "common"), ("puppy", "Puppy", 0, "common"), ("panda", "Panda", 100, "common"), ("penguin", "Penguin", 100, "common"),
    ("koala", "Koala", 100, "common"), ("elephant", "Elephant", 0, "common"), ("monkey", "Monkey", 0, "common"),
    ("hedgehog", "Hedgehog", 100, "common"), ("lamb", "Lamb", 0, "common"), ("raccoon", "Raccoon", 100, "common"),
    ("doctor", "Little Doctor", 100, "common"), ("builder", "Builder", 100, "common"),
    ("otter", "Otter", 100, "common"), ("bee", "Bumblebee", 100, "common"), ("sloth", "Sloth", 100, "common"),
    # Rare
    ("viking", "Viking", 250, "rare"), ("samurai", "Samurai", 250, "rare"), ("shieldmaiden", "Shieldmaiden", 250, "rare"),
    ("fairy", "Fairy", 0, "rare"), ("swordsman", "Swordsman", 300, "rare"), ("chef", "Chef", 250, "rare"), ("pirate", "Pirate", 300, "rare"),
    ("firefighter", "Firefighter", 300, "rare"), ("snowleopard", "Snow Leopard", 350, "rare"), ("unicorn", "Unicorn", 300, "rare"),
    ("dino", "Dino", 0, "rare"), ("oasiskitten", "Oasis Kitten", 0, "rare"), ("astronaut", "Astronaut", 400, "rare"), ("robot", "Robot", 0, "rare"),
    ("ninja", "Ninja", 440, "rare"), ("parrot", "Scarlet Macaw", 250, "rare"), ("yellowmacaw", "Golden Macaw", 250, "rare"), ("greenmacaw", "Green Macaw", 250, "rare"), ("giraffe", "Giraffe", 250, "rare"),
    ("octopus", "Octopus", 300, "rare"), ("whale", "Whale", 300, "rare"), ("ballerina", "Ballerina", 250, "rare"),
    ("scientist", "Scientist", 300, "rare"), ("wizardkid", "Little Wizard", 350, "rare"), ("herokid", "Super Kid", 350, "rare"),
    ("redpanda", "Red Panda", 300, "rare"), ("explorer", "Little Explorer", 300, "rare"), ("flamingo", "Flamingo", 250, "rare"),
    # Epic
    ("knight", "Knight", 500, "epic"), ("spartan", "Spartan", 500, "epic"), ("frostknight", "Frost Knight", 500, "epic"),
    ("warriorprincess", "Warrior Princess", 500, "epic"), ("crystalfox", "Crystal Fox", 600, "epic"),
    ("thundertiger", "Thunder Tiger", 650, "epic"), ("pharaohcat", "Pharaoh Cat", 750, "epic"),
    ("phoenix", "Phoenix", 0, "epic"), ("dragon", "Dragon", 0, "epic"), ("kinglion", "Lion King", 800, "epic"),
    ("cosmiccat", "Cosmic cat", 900, "epic"), ("knightepic", "Epic Knight", 800, "epic"), ("unicornepic", "Epic Unicorn", 750, "epic"),
    ("moonrabbit", "Moon Rabbit", 650, "epic"), ("frostastro", "Frost Astronaut", 700, "epic"), ("crystalowl", "Crystal Owl", 700, "epic"), ("jellyfish", "Galaxy Jellyfish", 750, "epic"),
    # Legendary
    ("dragonknight", "Dragon Knight", 1000, "legendary"), ("crystalqueen", "Crystal Queen", 1000, "legendary"),
    ("astrolegend", "Legendary Astronaut", 1500, "legendary"),
    ("goldeneagle", "Golden Eagle", 1500, "legendary"),
    ("catlegend", "Legendary Cat", 1200, "legendary"), ("spartanlegend", "Legendary Spartan", 1500, "legendary"),
    ("knightlegend", "Legendary Knight", 1500, "legendary"), ("auroracat", "Northern Lights Cat", 1500, "legendary"), ("nightpanther", "Legendary Night Panther", 1500, "legendary"),
    ("celestiallion", "Celestial Lion", 1500, "legendary"), ("frostlegend", "Legendary Frost Knight", 1500, "legendary"), ("pegasus", "Golden Pegasus", 1500, "legendary"),
]
FREE_AVATARS = [k for k, _ in FREE_PICTURES]
SHOP_AVATARS: list[tuple[str, int]] = [(k, c) for k, _, c, _ in SHOP_PICTURES]
_PICTURE_NAMES = {k: n for k, n in FREE_PICTURES} | {k: n for k, n, _, _ in SHOP_PICTURES}
_PICTURE_RARITY = {k: r for k, _, _, r in SHOP_PICTURES}
# Pictures earned by an achievement instead of gems: picture -> achievement key.
PICTURE_UNLOCKS = {
    # Common: easy, early achievements
    "squire": "oath", "bear": "spark", "eagle": "shop1", "owl": "streak3", "lion": "bonus10",
    # Rare: a bit of effort
    "dino": "days10", "robot": "fit10", "fairy": "chest7",
    # Epic: hard
    "phoenix": "streak30", "dragon": "days50",
    # Secret: the thirsty kitten (a test from the Tests tab)
    "oasiskitten": "mercy",
}

TIER_ORDER = [t.key for t in TIERS]
GODFATHER_FRAME = "godfather"  # only for members the admin marks as Godfather; never sold
FRAME_KEYS = {f[0] for f in FRAMES} | {GODFATHER_FRAME}
THEME_KEYS = {t[0] for t in THEMES}


def rank_reached(need: str | None, current: Tier) -> bool:
    return need is not None and TIER_ORDER.index(current.key) >= TIER_ORDER.index(need)


def shop_key(kind: str, key: str) -> str:
    return f"{kind}:{key}"


def item_available(kind: str, key: str, current: Tier, owned: set[str], earned: set[str] | None = None,
                   godfather: bool = False) -> bool:
    """Free with the member's rank, bought with gems, or (some pictures) earned with an achievement."""
    if kind == "frame" and key == GODFATHER_FRAME:
        return godfather
    if kind == "avatar":
        if shop_key("avatar", key) in owned or key in FREE_AVATARS:
            return True
        if key in PICTURE_UNLOCKS:
            return PICTURE_UNLOCKS[key] in (earned or set())
        return price_of("avatar", key) == 0
    if kind == "theme" and key in THEME_UNLOCKS:
        return THEME_UNLOCKS[key] in (earned or set()) or shop_key(kind, key) in owned
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


def catalogue(kind: str, current: Tier, owned: set[str], earned: set[str] | None = None, godfather: bool = False) -> list[dict]:
    if kind == "avatar":
        from app.achievements import BY_KEY as ACH
        out = []
        for a, c in SHOP_AVATARS:
            item = {"key": a, "name": _PICTURE_NAMES[a], "available": item_available("avatar", a, current, owned, earned),
                    "price": c, "tier": None, "rarity": _PICTURE_RARITY[a]}
            if a in PICTURE_UNLOCKS:
                from app.achievements import unlock_info
                item["unlock"] = unlock_info(ACH[PICTURE_UNLOCKS[a]], earned)
            out.append(item)
        return out
    table = FRAMES if kind == "frame" else THEMES
    special = [{"key": GODFATHER_FRAME, "name": "Godfather", "available": True, "price": 0, "tier": None, "special": "godfather"}] \
        if kind == "frame" and godfather else []
    from app.achievements import BY_KEY as ACH
    out = []
    for k, n, need, c in table:
        item = {"key": k, "name": n, "available": item_available(kind, k, current, owned, earned), "price": c,
                "tier": tier_dict(BY_KEY[need]) if need else None}
        if kind == "theme" and k in THEME_UNLOCKS:
            ach = ACH[THEME_UNLOCKS[k]]
            item["unlock"] = {"key": ach.key, "name": ach.name, "text": ach.text, "tier": ach.tier, "icon": ach.icon}
        out.append(item)
    return special + out
