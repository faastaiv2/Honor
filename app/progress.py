"""Walk a member's days in order and work out their level, Legendary status and quest.

Rules (from the family's Honor rules):
- Without Legendary the highest level is XLIX (🔮 Obsidian).
- To earn 👑 Legendary an 🔮 Obsidian member gives up the title, restarts at I (🥉 Bronze),
  and must finish every task and the bonus on every single day until reaching L.
  One imperfect day breaks the quest: they keep climbing normally, capped at XLIX again.
- A Legendary member who does not complete their tasks on 3 days in a row (weekdays; the weekend
  is optional) is demoted to 🔮 Obsidian (XLVII) and can never receive Legendary again.

Gems: 20 for finishing every task of the day (5 per task before
26 Nov 2026); 10 for each level reached for the first time; more for each rank reached for the first time
(growing with the rank, 1000 for Legendary). Falling and climbing back earns nothing twice.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta

from app import scoring
from app.tiers import (FULL_DAY_PAID, FULL_DAY_UNTIL, CAP_WITHOUT_LEGENDARY, GEMS_FOR_FULL_DAY, GEMS_FOR_LEGENDARY, GEMS_NEW_RATES_FROM, GEMS_PER_LEVEL,
                       GEMS_PER_TASK, GEMS_PER_TASK_BEFORE, RANK_GEMS, LEGENDARY_LEVEL, LOW_FLOOR, OBSIDIAN_FLOOR, tier_for)


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
    pending: int = 0  # Honor earned today; it arrives when the day ends (members can tick until 11:59 PM)
    streak: int = 0  # days in a row with every task done (weekends and excused days don't break it)
    today_tasks_gems: int = 0
    history: dict = field(default_factory=dict)  # date -> change that day
    # For achievements
    best_streak: int = 0
    perfect_days: int = 0  # every task done
    bonus_days: int = 0  # the bonus dhikr done (it only counts after every task)
    weekend_days: int = 0  # every task done on a Friday or Saturday
    fitness_days: int = 0  # every fitness task done (not excused)
    ticks: dict = field(default_factory=dict)  # task -> days it was ticked
    ranks_reached: set = field(default_factory=set)
    day_rank: dict = field(default_factory=dict)  # date -> the rank (index) the day's tasks were set for
    quest_days_on: set = field(default_factory=set)  # days spent on the Legendary quest (the bonus counts only then)
    rank_now: int = 1  # the rank tasks are set for from now on (the highest rank reached)


def simulate(base: int, logs: dict[date, tuple[list, str]], adjustments: dict[date, int], quest_starts: list[date],
             score_from: date, today: date, cut_misses: int, week_from: date | None = None,
             tasks: list | None = None, periods: list | None = None, grace_day: date | None = None) -> Progress:
    """logs: day -> (tasks, excuse). adjustments: day -> total change that day."""
    p = Progress(level=base)
    starts = set(quest_starts)
    p.level += sum(v for d, v in adjustments.items() if d < score_from)
    p.level = max(LOW_FLOOR, min(p.level, CAP_WITHOUT_LEGENDARY))
    quest_active = False
    misses = 0
    gem_keys = ({t.key for t in tasks} | {"bonus"}) if tasks is not None else _GEM_KEYS
    best = p.level
    reached = {t for t in _ranks_upto(best)}
    for d in scoring.date_range(score_from, today):
        if d in starts and not p.legendary and not p.banned:  # checked when the quest was started
            p.level = 1
            quest_active, p.quest_start, p.quest_broken_on, p.quest_days = True, d, None, 0
        entry = logs.get(d, ([], ""))
        ticks, excuse = entry[0], entry[1]
        skip = entry[2] if len(entry) > 2 else None  # single tasks excused that day
        prev = logs.get(d - timedelta(days=1), ([], ""))[0]
        # Tasks are set by the highest rank reached so far (they don't get easier after a fall).
        r_i = scoring.RANK_ORDER.index("legendary") if p.legendary else max(1, scoring.rank_index(tier_for(min(best, CAP_WITHOUT_LEGENDARY), False).key))
        p.day_rank[d] = r_i
        if quest_active:
            p.quest_days_on.add(d)
        plan = scoring.day_plan(tasks, periods, d, r_i) if tasks is not None else None
        counted = scoring.credited(ticks, prev, plan, first_day=d == score_from)
        s = scoring.score_day(d, counted, excuse, today, cut_misses, plan, skip, bonus_on=quest_active)
        day_keys = ({t.key for t in plan} | {"bonus"}) if plan is not None else gem_keys
        n_ticked = len(set(ticks or []) & day_keys)
        if d < GEMS_NEW_RATES_FROM:
            ticked = n_ticked * GEMS_PER_TASK_BEFORE
        else:  # a little for each task, the real prize for finishing the whole day
            full = FULL_DAY_PAID if d < FULL_DAY_UNTIL else GEMS_FOR_FULL_DAY
            ticked = n_ticked * GEMS_PER_TASK + (full if s.gain else 0)
        p.gems_tasks += ticked
        for k in set(ticks or []):
            p.ticks[k] = p.ticks.get(k, 0) + 1
        if s.gain:
            p.perfect_days += 1
            p.bonus_days += s.bonus
            p.weekend_days += 1 if s.weekend else 0
        fit = [t.key for t in (plan or []) if t.fitness]
        if fit and not s.excused and all(k in counted for k in fit):
            p.fitness_days += 1
        if d == today:
            p.today_tasks_gems = ticked
        earned = s.delta
        if d == grace_day and earned < 0:
            earned = 0  # the day a member joined never costs Honor (they may have joined late in the day)
        if d == today:  # today's Honor is held until midnight
            p.pending, earned = s.delta, 0
        change = earned + adjustments.get(d, 0)
        before = p.level
        p.level = max(LOW_FLOOR, p.level + change)  # nobody goes below −III

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
                    p.gems_levels += RANK_GEMS[rank]
            best = p.level
        if finished:
            if s.gain:
                p.streak += 1
            elif not (s.weekend or s.excused):
                p.streak = 0
        elif s.gain:
            p.streak += 1  # today already complete
        p.best_streak = max(p.best_streak, p.streak)
        p.history[d] = p.level - before
        if week_from and d >= week_from:
            p.week_delta += p.level - before
    p.best_level = max(best, p.level)
    p.rank_now = p.day_rank.get(today) or (scoring.RANK_ORDER.index("legendary") if p.legendary
                                           else max(1, scoring.rank_index(tier_for(min(max(best, 0), CAP_WITHOUT_LEGENDARY), False).key)))
    p.ranks_reached = set(reached) | ({"legendary"} if p.legendary or p.legendary_since else set())
    late_adj = sum(v for d, v in adjustments.items() if d > today)  # clock differences: never lose a change
    if late_adj:
        p.level = max(LOW_FLOOR, p.level + late_adj)
        p.week_delta += late_adj if week_from else 0
        if not p.legendary:
            p.level = min(p.level, CAP_WITHOUT_LEGENDARY)
    return p


def gems_earned(p: Progress) -> int:
    return p.gems_tasks + p.gems_levels
