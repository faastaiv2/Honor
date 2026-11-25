"""Walk a member's days in order and work out their level, Legendary status and quest.

Rules (from the family's Honor rules):
- Without Legendary Honor the highest level is XLIX (💎 Diamond Honor).
- To earn 👑 Legendary Honor a 💎 Diamond member gives up the title, restarts at I (🥉 Honor),
  and must finish every task and the bonus on every single day until reaching L.
  One imperfect day breaks the quest: they keep climbing normally, capped at XLIX again.
- A Legendary member who does not complete their tasks on 3 days in a row (weekdays; the weekend
  is optional) is demoted to 💎 Diamond Honor (XLVII) and can never receive Legendary Honor again.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from app import scoring
from app.tiers import CAP_WITHOUT_LEGENDARY, DIAMOND_FLOOR, LEGENDARY_LEVEL


@dataclass
class Progress:
    level: int
    legendary: bool = False
    banned: bool = False  # lost Legendary once: can never receive it again
    legendary_since: date | None = None
    demoted_on: date | None = None
    quest_start: date | None = None  # the quest in progress (None when there is none)
    quest_broken_on: date | None = None  # the last quest's failure, if it failed
    quest_days: int = 0  # perfect days so far in the current quest
    week_delta: int = 0  # Honor gained this week (Sunday to today)
    history: dict = field(default_factory=dict)  # date -> change that day


def simulate(base: int, logs: dict[date, tuple[list, str]], adjustments: dict[date, int], quest_starts: list[date],
             score_from: date, today: date, cut_misses: int, week_from: date | None = None) -> Progress:
    """logs: day -> (tasks, excuse). adjustments: day -> total change that day."""
    p = Progress(level=base)
    starts = set(quest_starts)
    p.level += sum(v for d, v in adjustments.items() if d < score_from)
    p.level = min(p.level, CAP_WITHOUT_LEGENDARY)
    quest_active = False
    misses = 0
    for d in scoring.date_range(score_from, today):
        if d in starts and not p.legendary and not p.banned and p.level >= DIAMOND_FLOOR:
            p.level = 1
            quest_active, p.quest_start, p.quest_broken_on, p.quest_days = True, d, None, 0
        tasks, excuse = logs.get(d, ([], ""))
        s = scoring.score_day(d, tasks, excuse, today, cut_misses)
        change = s.delta + adjustments.get(d, 0)
        before = p.level
        p.level += change

        finished = d < today
        perfect = s.gain == 1 and s.bonus == 1
        if quest_active and finished:
            if perfect:
                p.quest_days += 1
            else:
                quest_active, p.quest_broken_on, p.quest_start = False, d, None
        if quest_active and p.level >= LEGENDARY_LEVEL and perfect:
            p.legendary, p.legendary_since, quest_active, p.quest_start = True, d, False, None

        if p.legendary and finished and not s.weekend:
            misses = 0 if s.gain else misses + 1
            if misses >= 3:
                p.legendary, p.banned, p.demoted_on = False, True, d
                p.level = DIAMOND_FLOOR
                misses = 0
        if not p.legendary:
            p.level = min(p.level, CAP_WITHOUT_LEGENDARY)
        p.history[d] = p.level - before
        if week_from and d >= week_from:
            p.week_delta += p.level - before
    late_adj = sum(v for d, v in adjustments.items() if d > today)  # clock differences: never lose a change
    if late_adj:
        p.level += late_adj
        p.week_delta += late_adj if week_from else 0
        if not p.legendary:
            p.level = min(p.level, CAP_WITHOUT_LEGENDARY)
    return p
