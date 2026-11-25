"""Walk a member's days in order and work out their level, Legendary status and quest.

Rules (from the family's Honor rules):
- Without Legendary the highest level is XLIX (🖤 Obsidian).
- To earn 👑 Legendary an 🖤 Obsidian member gives up the title, restarts at I (🥉 Bronze),
  and must finish every task and the bonus on every single day until reaching L.
  One imperfect day breaks the quest: they keep climbing normally, capped at XLIX again.
- A Legendary member who does not complete their tasks on 3 days in a row (weekdays; the weekend
  is optional) is demoted to 🖤 Obsidian (XLVII) and can never receive Legendary again.

Gems: 5 for each task and the bonus ticked; 10 for each level reached for the first time; 50 more for
each rank reached for the first time; 500 for Legendary. Falling and climbing back earns nothing twice.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from app import scoring
from app.tiers import (CAP_WITHOUT_LEGENDARY, GEMS_FOR_LEGENDARY, GEMS_PER_LEVEL, GEMS_PER_RANK, GEMS_PER_TASK,
                       LEGENDARY_LEVEL, OBSIDIAN_FLOOR, tier_for)


_GEM_KEYS = set(scoring.REQUIRED) | {"bonus"}


def _ranks_upto(level: int) -> list[str]:
    return [] if level < 1 else list(dict.fromkeys(tier_for(lv, False).key for lv in range(1, min(level, 49) + 1)))


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
    gems_tasks: int = 0  # gems from ticked tasks
    gems_levels: int = 0  # gems from reaching new levels and ranks
    best_level: int = 0  # highest level ever reached
    streak: int = 0  # days in a row with every task done (weekends and excused days don't break it)
    today_tasks_gems: int = 0
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
    best = p.level
    reached = {t for t in _ranks_upto(best)}
    for d in scoring.date_range(score_from, today):
        if d in starts and not p.legendary and not p.banned and p.level >= OBSIDIAN_FLOOR:
            p.level = 1
            quest_active, p.quest_start, p.quest_broken_on, p.quest_days = True, d, None, 0
        tasks, excuse = logs.get(d, ([], ""))
        s = scoring.score_day(d, tasks, excuse, today, cut_misses)
        ticked = len(set(tasks or []) & _GEM_KEYS) * GEMS_PER_TASK
        p.gems_tasks += ticked
        if d == today:
            p.today_tasks_gems = ticked
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
            p.gems_levels += GEMS_FOR_LEGENDARY

        if p.legendary and finished and not s.weekend:
            misses = 0 if s.gain else misses + 1
            if misses >= 3:
                p.legendary, p.banned, p.demoted_on = False, True, d
                p.level = OBSIDIAN_FLOOR
                misses = 0
        if not p.legendary:
            p.level = min(p.level, CAP_WITHOUT_LEGENDARY)
        if p.level > best:  # rewards for new levels and ranks, once each
            for lvl in range(best + 1, p.level + 1):
                p.gems_levels += GEMS_PER_LEVEL
                rank = tier_for(min(lvl, CAP_WITHOUT_LEGENDARY), False).key
                if rank not in reached:
                    reached.add(rank)
                    p.gems_levels += GEMS_PER_RANK
            best = p.level
        if finished:
            if s.gain:
                p.streak += 1
            elif not (s.weekend or s.excused):
                p.streak = 0
        elif s.gain:
            p.streak += 1  # today already complete
        p.history[d] = p.level - before
        if week_from and d >= week_from:
            p.week_delta += p.level - before
    p.best_level = max(best, p.level)
    late_adj = sum(v for d, v in adjustments.items() if d > today)  # clock differences: never lose a change
    if late_adj:
        p.level += late_adj
        p.week_delta += late_adj if week_from else 0
        if not p.legendary:
            p.level = min(p.level, CAP_WITHOUT_LEGENDARY)
    return p


def gems_earned(p: Progress) -> int:
    return p.gems_tasks + p.gems_levels
