"""Achievements: badges earned from a member's whole history, each with a one-time gem reward to claim."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from app.progress import Progress

REWARD = {"bronze": 15, "silver": 40, "gold": 100, "legend": 250}


@dataclass(frozen=True)
class Facts:
    """What achievements are measured from."""
    p: Progress
    gems_earned: int  # from tasks, levels, ranks and daily chests (not from achievements)
    purchases: int
    chests: int
    quests: int = 0  # Legendary quests started


@dataclass(frozen=True)
class Achievement:
    key: str
    name: str
    text: str
    group: str
    icon: str  # a drawn glyph in the app (flame, check, star, moon, sun, dumbbell, crest:<rank>, gem, bag, chest, shield)
    tier: str  # bronze, silver, gold, legend
    goal: int
    measure: Callable[[Facts], int]

    @property
    def gems(self) -> int:
        return REWARD[self.tier]


def _rank(key: str) -> Callable[[Facts], int]:
    return lambda f: 1 if key in f.p.ranks_reached else 0


ACHIEVEMENTS: list[Achievement] = [
    # Streaks
    Achievement("spark", "First Spark", "Finish every task for one day", "Streaks", "flame", "bronze", 1, lambda f: f.p.perfect_days),
    Achievement("streak3", "On Fire", "Keep a 3-day streak", "Streaks", "flame", "bronze", 3, lambda f: f.p.best_streak),
    Achievement("streak7", "Unstoppable", "Keep a 7-day streak", "Streaks", "flame", "silver", 7, lambda f: f.p.best_streak),
    Achievement("streak14", "Blazing Fortnight", "Keep a 14-day streak", "Streaks", "flame", "silver", 14, lambda f: f.p.best_streak),
    Achievement("streak30", "Eternal Flame", "Keep a 30-day streak", "Streaks", "flame", "gold", 30, lambda f: f.p.best_streak),
    # Perfect days
    Achievement("days10", "Dedicated", "Finish every task on 10 days", "Perfect days", "check", "bronze", 10, lambda f: f.p.perfect_days),
    Achievement("days50", "Devoted", "Finish every task on 50 days", "Perfect days", "check", "silver", 50, lambda f: f.p.perfect_days),
    Achievement("days100", "Centurion", "Finish every task on 100 days", "Perfect days", "check", "gold", 100, lambda f: f.p.perfect_days),
    Achievement("weekend5", "Weekend Warrior", "Finish every task on 5 weekend days", "Perfect days", "shield", "silver", 5, lambda f: f.p.weekend_days),
    # Worship
    Achievement("bonus10", "Dhikr Devotee", "Complete the bonus dhikr 10 times", "Worship", "star", "bronze", 10, lambda f: f.p.bonus_days),
    Achievement("bonus50", "Heart of Dhikr", "Complete the bonus dhikr 50 times", "Worship", "star", "gold", 50, lambda f: f.p.bonus_days),
    Achievement("fajr30", "Early Riser", "Pray Fajr on 30 days", "Worship", "sun", "silver", 30, lambda f: f.p.ticks.get("fajr", 0)),
    Achievement("mulk30", "Night Guardian", "Read Surah Mulk on 30 nights", "Worship", "moon", "silver", 30, lambda f: f.p.ticks.get("mulk", 0)),
    # Fitness
    Achievement("fit10", "Warming Up", "Do every fitness task on 10 days", "Fitness", "dumbbell", "bronze", 10, lambda f: f.p.fitness_days),
    Achievement("fit50", "Iron Body", "Do every fitness task on 50 days", "Fitness", "dumbbell", "gold", 50, lambda f: f.p.fitness_days),
    # Ranks
    Achievement("silver", "Shining Silver", "Reach the Silver rank", "Ranks", "crest:silver", "bronze", 1, _rank("silver")),
    Achievement("gold", "Gold Standard", "Reach the Gold rank", "Ranks", "crest:gold", "bronze", 1, _rank("gold")),
    Achievement("emerald", "Evergreen", "Reach the Emerald rank", "Ranks", "crest:emerald", "silver", 1, _rank("emerald")),
    Achievement("diamond", "Unbreakable", "Reach the Diamond rank", "Ranks", "crest:diamond", "gold", 1, _rank("diamond")),
    Achievement("obsidian", "Into the Dark", "Reach the Obsidian rank", "Ranks", "crest:obsidian", "gold", 1, _rank("obsidian")),
    Achievement("quest", "To Be a Legend", "Give up Obsidian and start the Legendary quest", "Ranks", "crest:legendary", "gold", 1,
                lambda f: f.quests),
    Achievement("legendary", "Legend", "Earn Legendary Honor", "Ranks", "crest:legendary", "legend", 1, _rank("legendary")),
    # Treasure
    Achievement("gems500", "Treasure Hunter", "Earn 500 gems", "Treasure", "gem", "silver", 500, lambda f: f.gems_earned),
    Achievement("gems2000", "Dragon's Hoard", "Earn 2,000 gems", "Treasure", "gem", "gold", 2000, lambda f: f.gems_earned),
    Achievement("shop1", "First Purchase", "Buy something in the shop", "Treasure", "bag", "bronze", 1, lambda f: f.purchases),
    Achievement("chest7", "Chest Collector", "Open 7 streak chests", "Treasure", "chest", "silver", 7, lambda f: f.chests),
]
BY_KEY = {a.key: a for a in ACHIEVEMENTS}


def evaluate(f: Facts, claimed: set[str]) -> list[dict]:
    out = []
    for a in ACHIEVEMENTS:
        have = a.measure(f)
        out.append({"key": a.key, "name": a.name, "text": a.text, "group": a.group, "icon": a.icon, "tier": a.tier,
                    "gems": a.gems, "goal": a.goal, "progress": min(have, a.goal), "unlocked": have >= a.goal,
                    "claimed": a.key in claimed})
    return out
