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
    first: int = 0  # art tournaments won (1st place)
    second: int = 0
    third: int = 0
    oath: int = 0  # 1 once the member has sworn the Oath of Honor ("I SWEAR")
    godfather: int = 0  # 1 if the admin made them a Godfather
    shaytan: int = 0  # times they turned Shaytan down three times
    sadaqah: int = 0  # times they gave to the man in the cloak
    kindness: int = 0  # times they replied kindly to the rude kid
    mercy: int = 0  # times they gave their gems for water for the thirsty kitten


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
    reward: int | None = None  # overrides the tier's usual reward
    only_godfather: bool = False  # hidden from everyone who isn't a Godfather
    secret: bool = False  # name and goal stay "???" until it is unlocked

    @property
    def gems(self) -> int:
        return self.reward if self.reward is not None else REWARD[self.tier]


def _rank(key: str) -> Callable[[Facts], int]:
    return lambda f: 1 if key in f.p.ranks_reached else 0


ACHIEVEMENTS: list[Achievement] = [
    # Honor
    Achievement("oath", "I Swear", "Swear the Oath of Honor: mark tasks only after you do them", "Honor", "shield", "bronze", 1,
                lambda f: f.oath, reward=5),
    Achievement("shaytan", "Beat Shaytan", "Say no to all three of Shaytan's offers", "Honor", "shield", "bronze", 1,
                lambda f: f.shaytan, reward=30),
    Achievement("sadaqah", "Sadaqah", "Give to someone in need when they ask", "Honor", "heart", "silver", 1,
                lambda f: f.sadaqah),
    Achievement("kindness", "Gentle Heart", "Reply kindly when someone is rude to you", "Honor", "heart", "silver", 1,
                lambda f: f.kindness),
    Achievement("mercy", "Mercy to All Creatures", "Give everything you have so a thirsty kitten can drink", "Honor", "heart", "gold", 1,
                lambda f: f.mercy, secret=True),
    Achievement("godfather", "The Godfather", "Be named a Godfather of the family", "Honor", "godfather", "godfather", 1,
                lambda f: f.godfather, reward=113, only_godfather=True),
    # Streaks
    Achievement("spark", "First Spark", "Finish every task for one day", "Streaks", "flame", "bronze", 1, lambda f: f.p.perfect_days),
    Achievement("streak3", "On Fire", "Keep a 3-day streak", "Streaks", "flame", "bronze", 3, lambda f: f.p.best_streak),
    Achievement("streak7", "Unstoppable", "Keep a 7-day streak", "Streaks", "flame", "silver", 7, lambda f: f.p.best_streak),
    Achievement("streak14", "Blazing Fortnight", "Keep a 14-day streak", "Streaks", "flame", "silver", 14, lambda f: f.p.best_streak),
    Achievement("streak30", "Eternal Flame", "Keep a 30-day streak", "Streaks", "flame", "gold", 30, lambda f: f.p.best_streak),
    # Perfect days
    Achievement("days10", "Dedicated", "Finish every task on 10 days", "Perfect days", "check", "bronze", 10, lambda f: f.p.perfect_days),
    Achievement("days50", "Devoted", "Finish every task on 50 days", "Perfect days", "check", "silver", 50, lambda f: f.p.perfect_days),
    Achievement("days100", "Centurion", "Finish every task on 100 days", "Perfect days", "check", "legend", 100, lambda f: f.p.perfect_days),
    Achievement("weekend5", "Weekend Warrior", "Finish every task on 5 weekend days", "Perfect days", "shield", "silver", 5, lambda f: f.p.weekend_days),
    # Worship
    Achievement("bonus10", "Dhikr Devotee", "Complete the bonus dhikr 10 times", "Worship", "star", "bronze", 10, lambda f: f.p.bonus_days),
    Achievement("bonus50", "Heart of Dhikr", "Complete the bonus dhikr 50 times", "Worship", "star", "gold", 50, lambda f: f.p.bonus_days),
    Achievement("fajr30", "Early Riser", "Pray Fajr on 30 days", "Worship", "sun", "silver", 30, lambda f: f.p.ticks.get("fajr", 0)),
    Achievement("mulk30", "Night Guardian", "Read Surah Mulk on 30 nights", "Worship", "moon", "silver", 30, lambda f: f.p.ticks.get("mulk", 0)),
    # Fitness
    Achievement("fit10", "Warming Up", "Do every fitness task on 10 days", "Fitness", "dumbbell", "bronze", 10, lambda f: f.p.fitness_days),
    Achievement("fit50", "Iron Body", "Do every fitness task on 50 days", "Fitness", "dumbbell", "gold", 50, lambda f: f.p.fitness_days),
    # Ranks: one for every rank, rising in rarity and gems
    Achievement("bronze", "Bronze Beginner", "Reach the Bronze rank", "Ranks", "crest:bronze", "bronze", 1, _rank("bronze"), reward=10),
    Achievement("silver", "Shining Silver", "Reach the Silver rank", "Ranks", "crest:silver", "bronze", 1, _rank("silver"), reward=20),
    Achievement("gold", "Gold Standard", "Reach the Gold rank", "Ranks", "crest:gold", "silver", 1, _rank("gold")),
    Achievement("platinum", "Platinum Polish", "Reach the Platinum rank", "Ranks", "crest:platinum", "silver", 1, _rank("platinum"), reward=50),
    Achievement("emerald", "Evergreen", "Reach the Emerald rank", "Ranks", "crest:emerald", "silver", 1, _rank("emerald"), reward=75),
    Achievement("sapphire", "Deep Blue", "Reach the Sapphire rank", "Ranks", "crest:sapphire", "gold", 1, _rank("sapphire"), reward=100),
    Achievement("ruby", "Ruby Heart", "Reach the Ruby rank", "Ranks", "crest:ruby", "gold", 1, _rank("ruby"), reward=125),
    Achievement("diamond", "Unbreakable", "Reach the Diamond rank", "Ranks", "crest:diamond", "gold", 1, _rank("diamond"), reward=150),
    Achievement("obsidian", "Into the Dark", "Reach the Obsidian rank", "Ranks", "crest:obsidian", "gold", 1, _rank("obsidian"), reward=250),
    Achievement("quest", "To Be a Legend", "Give up Obsidian and start the Legendary quest", "Ranks", "crest:legendary", "legend", 1,
                lambda f: f.quests, reward=500),
    Achievement("legendary", "Legend", "Earn Legendary Honor", "Ranks", "crest:legendary", "legend", 1, _rank("legendary"), reward=1000),
    # Events
    Achievement("art1", "Champion Artist", "Win 1st place in an art tournament", "Events", "star", "gold", 1, lambda f: f.first),
    Achievement("art2", "Silver Brush", "Come 2nd in an art tournament", "Events", "star", "silver", 1, lambda f: f.second),
    Achievement("art3", "Bronze Brush", "Come 3rd in an art tournament", "Events", "star", "bronze", 1, lambda f: f.third),
    # Treasure
    Achievement("gems500", "Treasure Hunter", "Earn 500 gems", "Treasure", "gem", "silver", 500, lambda f: f.gems_earned),
    Achievement("gems2000", "Dragon's Hoard", "Earn 2,000 gems", "Treasure", "gem", "gold", 2000, lambda f: f.gems_earned),
    Achievement("shop1", "First Purchase", "Buy something in the shop", "Treasure", "bag", "bronze", 1, lambda f: f.purchases),
    Achievement("chest7", "Chest Collector", "Open 7 streak chests", "Treasure", "chest", "silver", 7, lambda f: f.chests),
]
BY_KEY = {a.key: a for a in ACHIEVEMENTS}


SECRET_NAME = "???"
SECRET_TEXT = "A secret achievement. Some good deeds are found, not told 🤫"


def unlock_info(a: "Achievement", earned: set[str] | None) -> dict:
    """What the shop shows about the achievement that unlocks an item (a secret one stays secret until earned)."""
    if a.secret and a.key not in (earned or set()):
        return {"key": a.key, "name": SECRET_NAME, "text": SECRET_TEXT, "tier": a.tier, "icon": "secret"}
    return {"key": a.key, "name": a.name, "text": a.text, "tier": a.tier, "icon": a.icon}


def evaluate(f: Facts, claimed: set[str]) -> list[dict]:
    from app.tiers import PICTURE_UNLOCKS, _PICTURE_NAMES
    pictures = {ach: pic for pic, ach in PICTURE_UNLOCKS.items()}
    from app.tiers import THEME_UNLOCKS, THEMES
    themes = {ach: th for th, ach in THEME_UNLOCKS.items()}
    theme_names = {t[0]: t[1] for t in THEMES}
    out = []
    for a in ACHIEVEMENTS:
        if a.only_godfather and not f.godfather and a.key not in claimed:
            continue
        have = a.measure(f)
        hidden = a.secret and have < a.goal
        out.append({"key": a.key, "name": SECRET_NAME if hidden else a.name, "text": SECRET_TEXT if hidden else a.text, "group": a.group,
                    "icon": "secret" if hidden else a.icon, "tier": a.tier, "secret": hidden,
                    "gems": a.gems, "goal": a.goal, "progress": min(have, a.goal), "unlocked": have >= a.goal,
                    "claimed": a.key in claimed,
                    **({"picture": {"key": pictures[a.key], "name": _PICTURE_NAMES[pictures[a.key]]}} if a.key in pictures else {}),
                    **({"theme": {"key": themes[a.key], "name": theme_names[themes[a.key]]}} if a.key in themes else {})})
    return out
