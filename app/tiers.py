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

WED, THU = 2, 3

LEGENDARY_LEVEL = 50
DIAMOND_FLOOR = 47
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
    Tier("honor", 1, 3, "🥉", "Honor", "#a8673a", "0 mins / week (after finishing tasks)", "None"),
    Tier("good", 4, 7, "🥈", "Good Honor", "#7d8a96", "10 mins / Sunday (after finishing tasks)",
         "Can miss up to 1 task and make up next day", next_day=1),
    Tier("great", 8, 12, "🥇", "Great Honor", "#c9962b", "15 mins / Sunday (after finishing tasks)",
         "Can miss up to 1 task and make up next day", next_day=1),
    Tier("high", 13, 18, "⭐", "High Honor", "#d4a017", "20 mins / Sunday (after finishing tasks)",
         "Can miss up to 1 task and make up next day + miss a task on Thursday and make up on Fri or Sat",
         next_day=1, mid_days=(THU,), mid_cap=1),
    Tier("higher", 19, 24, "🌟", "Higher Honor", "#e08a00", "25 mins / Sunday + Monday (after finishing tasks)",
         "Can miss up to 1 task and make up next day + miss a task on Thursday and make up on Fri or Sat",
         next_day=1, mid_days=(THU,), mid_cap=1),
    Tier("highest", 25, 31, "🎗️", "Highest Honor", "#0d7680", "30 mins / Sunday + Monday (after finishing tasks)",
         "Can miss up to 2 tasks and make up next day + miss a task on Thursday and make up on Fri or Sat + Mehmed",
         next_day=2, mid_days=(THU,), mid_cap=1),
    Tier("ultimate", 32, 39, "🏆", "Ultimate Honor", "#1f6fb2", "40 mins / Sunday + Monday + Tuesday (after finishing tasks)",
         "Can miss up to 2 tasks and make up next day + miss a task on Thursday and make up on Fri or Sat + Mehmed",
         next_day=2, mid_days=(THU,), mid_cap=1),
    Tier("supreme", 40, 46, "⚔️", "Supreme Honor", "#8e2b4a", "50 mins / Sunday + Monday + Tuesday (after finishing tasks)",
         "Can miss up to 2 tasks and make up next day + miss a task on Wed or Thursday and make up on Fri or Sat + Mehmed",
         next_day=2, mid_days=(WED, THU), mid_cap=1),
    Tier("diamond", 47, 49, "💎", "Diamond Honor", "#5b3a91", "60 mins / Sunday + Monday + Tuesday (after finishing tasks)",
         "Can miss up to 3 tasks and make up next day + miss up to 2 tasks on Wed and Thu and make up on Fri and Sat + Mehmed",
         next_day=3, mid_days=(WED, THU), mid_cap=2, mid_each=True),
    Tier("legendary", 50, None, "👑", "Legendary Honor", "#9a7400", "Unlimited / day (before finishing tasks, anytime)",
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


def tier_dict(t: Tier) -> dict:
    return {"key": t.key, "min": t.min if t.key != "low" else None, "max": t.max, "emoji": t.emoji, "name": t.name,
            "color": t.color, "range": tier_range(t), "games": t.games, "benefits": t.benefits}
